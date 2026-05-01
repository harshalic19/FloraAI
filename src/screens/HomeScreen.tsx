import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Alert,
  Animated,
  Image,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plant } from '../types';
import {
  deletePlant,
  getDaysUntilWatering,
  getPlants,
  updateLastWatered,
} from '../storage/plantStorage';
import { cancelWateringReminder } from '../utils/notifications';
import { Colors, BorderRadius, Spacing, Typography } from '../constants/theme';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function urgencyColor(days: number): string {
  if (days < 0) return Colors.danger;
  if (days <= 2) return Colors.warning;
  return Colors.success;
}

function WateringBadge({ days }: { days: number }) {
  const bg    = days < 0 ? '#FFE5DC' : days <= 2 ? '#FFF3CD' : Colors.accentLight;
  const color = days < 0 ? Colors.danger : days <= 2 ? '#856404' : Colors.primaryDark;
  const label = days < 0  ? `${Math.abs(days)}d overdue`
              : days === 0 ? 'Water today'
              : days === 1 ? 'Tomorrow'
              : `In ${days} days`;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function FadeInCard({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    const delay = index * 70;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, delay, useNativeDriver: true, friction: 7, tension: 60 }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

function PlantCard({
  plant,
  index,
  onPress,
  onWater,
  onDelete,
}: {
  plant: Plant;
  index: number;
  onPress: () => void;
  onWater: () => void;
  onDelete: () => void;
}) {
  const days  = getDaysUntilWatering(plant);
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn  = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, friction: 8 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, friction: 8 }).start();

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
  ) => {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [80, 0],
      extrapolate: 'clamp',
    });
    return (
      <Animated.View style={[styles.deleteAction, { transform: [{ translateX }] }]}>
        <TouchableOpacity style={styles.deleteActionInner} onPress={onDelete} activeOpacity={0.85}>
          <Text style={styles.deleteActionText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <FadeInCard index={index}>
      <Swipeable
        renderRightActions={renderRightActions}
        overshootRight={false}
        friction={2}
        rightThreshold={40}
        containerStyle={styles.swipeContainer}
      >
        <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
          <View style={[styles.cardAccent, { backgroundColor: urgencyColor(days) }]} />
          <TouchableOpacity
            style={styles.cardTouchable}
            onPress={onPress}
            onPressIn={pressIn}
            onPressOut={pressOut}
            activeOpacity={1}
          >
            <View style={styles.cardLeft}>
              <View style={styles.emojiContainer}>
                {plant.photoUri
                  ? <Image source={{ uri: plant.photoUri }} style={styles.plantPhoto} />
                  : <Text style={styles.emoji}>{plant.emoji ?? '🪴'}</Text>
                }
              </View>
              <View style={styles.cardInfo}>
                <View style={styles.cardNameRow}>
                  <Text style={styles.plantName} numberOfLines={1}>{plant.name}</Text>
                  </View>
                <Text style={styles.plantType}>{plant.type}</Text>
                <WateringBadge days={days} />
              </View>
            </View>
            <TouchableOpacity
              style={styles.waterBtn}
              onPress={onWater}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.waterBtnText}>💧</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      </Swipeable>
    </FadeInCard>
  );
}

function FloatingEmoji() {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, { toValue: -14, duration: 1200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0,   duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ translateY }] }}>
      <Text style={styles.emptyEmoji}>🪴</Text>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();
  const [plants, setPlants]         = useState<Plant[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const fabScale      = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    Animated.spring(fabScale, { toValue: 1, delay: 300, useNativeDriver: true, friction: 6 }).start();
  }, []);

  const load = useCallback(async () => {
    const data = await getPlants();
    setPlants(data.sort((a, b) => getDaysUntilWatering(a) - getDaysUntilWatering(b)));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleWater = async (plant: Plant) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await updateLastWatered(plant.id);
    await load();
  };

  const handleDelete = (plant: Plant) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert('Remove Plant', `Remove "${plant.name}" from your garden?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          await cancelWateringReminder(plant.id);
          await deletePlant(plant.id);
          await load();
        },
      },
    ]);
  };

  const handlePlantPress = (plant: Plant) => {
    (navigation as any).navigate('PlantDetail', { plantId: plant.id });
  };

  const handleAddPlant = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    (navigation as any).navigate('AddPlant');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={['#1B4332', '#2D6A4F', '#40916C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}
      >
        <Animated.View style={{ opacity: headerOpacity }}>
          <Text style={styles.greeting}>{getGreeting()} 🌿</Text>
          <Text style={styles.subtitle}>
            {plants.length === 0
              ? 'Add your first plant below'
              : `${plants.length} plant${plants.length !== 1 ? 's' : ''} in your garden`}
          </Text>
        </Animated.View>
      </LinearGradient>

      {plants.length === 0 ? (
        <View style={styles.empty}>
          <FloatingEmoji />
          <Text style={styles.emptyTitle}>Your garden is empty</Text>
          <Text style={styles.emptySubtitle}>Tap the + button to add your first plant</Text>
        </View>
      ) : (
        <FlatList
          data={plants}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
          }
          renderItem={({ item, index }) => (
            <PlantCard
              plant={item}
              index={index}
              onPress={() => handlePlantPress(item)}
              onWater={() => handleWater(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      )}

      <Animated.View style={[styles.fab, { transform: [{ scale: fabScale }] }]}>
        <TouchableOpacity onPress={handleAddPlant} activeOpacity={0.85} style={styles.fabInner}>
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.background },
  header:          { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxl },
  greeting:        { fontSize: Typography.fontSizeDisplay, fontWeight: Typography.fontWeightBold, color: '#FFFFFF' },
  subtitle:        { fontSize: Typography.fontSizeMD, color: 'rgba(255,255,255,0.75)', marginTop: Spacing.xs },
  list:            { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  swipeContainer:  { borderRadius: BorderRadius.lg },
  card:            { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  cardAccent:      { width: 5, position: 'absolute', top: 0, bottom: 0, left: 0, zIndex: 1 },
  cardTouchable:   { flexDirection: 'row', alignItems: 'center' },
  cardLeft:        { flexDirection: 'row', alignItems: 'center', flex: 1, padding: Spacing.lg, paddingLeft: Spacing.lg + 4 },
  emojiContainer:  { width: 52, height: 52, borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md, overflow: 'hidden' },
  emoji:           { fontSize: 28 },
  plantPhoto:      { width: 52, height: 52 },
  cardInfo:        { flex: 1, gap: Spacing.xs },
  cardNameRow:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  plantName:       { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightSemiBold, color: Colors.text, flex: 1 },
  plantType:       { fontSize: Typography.fontSizeSM, color: Colors.textSecondary },
  badge:           { alignSelf: 'flex-start', borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2, marginTop: 2 },
  badgeText:       { fontSize: Typography.fontSizeXS, fontWeight: Typography.fontWeightSemiBold },
  waterBtn:        { width: 36, height: 36, borderRadius: BorderRadius.full, backgroundColor: Colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  waterBtnText:    { fontSize: 18 },
  deleteAction:    { width: 80, borderRadius: BorderRadius.lg, overflow: 'hidden', marginLeft: Spacing.sm },
  deleteActionInner: { flex: 1, backgroundColor: Colors.danger, alignItems: 'center', justifyContent: 'center', gap: 4 },
  deleteActionText: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightBold, color: '#FFFFFF' },
  empty:           { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxxl, gap: Spacing.md },
  emptyEmoji:      { fontSize: 80 },
  emptyTitle:      { fontSize: Typography.fontSizeXL, fontWeight: Typography.fontWeightBold, color: Colors.primaryDark, textAlign: 'center' },
  emptySubtitle:   { fontSize: Typography.fontSizeMD, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  fab:             { position: 'absolute', bottom: Spacing.xxl, right: Spacing.xl, width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.primary, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 12, elevation: 8 },
  fabInner:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fabIcon:         { fontSize: 28, color: '#FFFFFF', lineHeight: 34 },
});
