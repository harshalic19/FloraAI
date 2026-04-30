import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  deletePlant,
  getDaysUntilWatering,
  getNextWateringDate,
  getPlantById,
  updateLastWatered,
  updatePlant,
} from '../storage/plantStorage';
import { cancelWateringReminder, scheduleWateringReminder } from '../utils/notifications';
import { Plant, RootTabParamList } from '../types';
import { Colors, BorderRadius, Spacing, Typography } from '../constants/theme';

type PlantDetailRouteProp = RouteProp<RootTabParamList, 'PlantDetail'>;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

function isWateredToday(iso: string): boolean {
  const l = new Date(iso), n = new Date();
  return l.getFullYear() === n.getFullYear()
      && l.getMonth()    === n.getMonth()
      && l.getDate()     === n.getDate();
}

function healthColor(days: number) {
  if (days < 0) return Colors.danger;
  if (days <= 2) return Colors.warning;
  return Colors.success;
}

function HealthBar({ plant }: { plant: Plant }) {
  const days     = getDaysUntilWatering(plant);
  const freq     = plant.wateringFrequencyDays;
  const progress = Math.max(0, Math.min(1, days / freq));
  const color    = healthColor(days);

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: progress,
      duration: 700,
      delay: 300,
      useNativeDriver: false,
    }).start();
  }, [plant.lastWatered]);

  const animWidth = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  const label =
    days < 0 ? `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} overdue`
    : days === 0 ? 'Water today!'
    : `${days} day${days !== 1 ? 's' : ''} until next watering`;

  return (
    <View style={styles.healthCard}>
      <View style={styles.healthHeader}>
        <Text style={styles.healthTitle}>Watering Health</Text>
        <View style={[styles.healthBadge, { backgroundColor: color + '22' }]}>
          <View style={[styles.healthDot, { backgroundColor: color }]} />
          <Text style={[styles.healthBadgeText, { color }]}>{label}</Text>
        </View>
      </View>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { backgroundColor: color, width: animWidth }]} />
      </View>
      <View style={styles.healthDates}>
        <Text style={styles.healthDateText}>Last: {formatDate(plant.lastWatered)}</Text>
        <Text style={styles.healthDateText}>Next: {formatDate(getNextWateringDate(plant).toISOString())}</Text>
      </View>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <View style={styles.infoTextBlock}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function PlantDetailScreen() {
  const route      = useRoute<PlantDetailRouteProp>();
  const navigation = useNavigation();
  const [plant, setPlant]         = useState<Plant | null>(null);
  const [showToast, setShowToast] = useState(false);

  const btnScale    = useRef(new Animated.Value(1)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    const data = await getPlantById(route.params.plantId);
    setPlant(data);
  }, [route.params.plantId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const pickPhoto = async (source: 'camera' | 'library') => {
    if (!plant) return;
    let result: ImagePicker.ImagePickerResult;

    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera access is required to take photos.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library access is required to pick photos.');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
    }

    if (!result.canceled) {
      const updated = { ...plant, photoUri: result.assets[0].uri };
      await updatePlant(updated);
      setPlant(updated);
    }
  };

  const showPhotoPicker = () => {
    if (!plant) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const buttons: any[] = [
      { text: 'Take Photo',          onPress: () => pickPhoto('camera')  },
      { text: 'Choose from Library', onPress: () => pickPhoto('library') },
    ];
    if (plant.photoUri) {
      buttons.push({
        text: 'Remove Photo',
        style: 'destructive',
        onPress: async () => {
          const updated = { ...plant, photoUri: undefined };
          await updatePlant(updated);
          setPlant(updated);
        },
      });
    }
    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Plant Photo', 'Update the photo for this plant', buttons);
  };

  const handleWatered = async () => {
    if (!plant) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.sequence([
      Animated.spring(btnScale, { toValue: 0.92, useNativeDriver: true, friction: 5 }),
      Animated.spring(btnScale, { toValue: 1.06, useNativeDriver: true, friction: 5 }),
      Animated.spring(btnScale, { toValue: 1.0,  useNativeDriver: true, friction: 6 }),
    ]).start();

    setShowToast(true);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(1400),
      Animated.timing(toastOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setShowToast(false));

    const updated = await updateLastWatered(plant.id);
    await scheduleWateringReminder(updated);
    await load();
  };

  const handleDelete = () => {
    if (!plant) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert('Remove Plant', `Remove "${plant.name}" from your garden?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
          await cancelWateringReminder(plant.id);
          await deletePlant(plant.id);
          navigation.goBack();
      }},
    ]);
  };

  if (!plant) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingEmoji}>🌱</Text>
        <Text style={styles.loadingText}>Loading plant…</Text>
      </View>
    );
  }

  const wateredToday = isWateredToday(plant.lastWatered);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Gradient hero */}
      <LinearGradient
        colors={['#1B4332', '#2D6A4F']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        {/* Photo circle with edit button */}
        <View style={styles.heroPhotoWrapper}>
          <View style={styles.heroEmojiCircle}>
            {plant.photoUri ? (
              <Image source={{ uri: plant.photoUri }} style={styles.heroPhoto} />
            ) : (
              <Text style={styles.heroEmoji}>{plant.emoji ?? '🪴'}</Text>
            )}
          </View>
          <TouchableOpacity style={styles.editPhotoBtn} onPress={showPhotoPicker} activeOpacity={0.85}>
            <Ionicons name="camera" size={15} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.plantName}>{plant.name}</Text>
        <Text style={styles.plantType}>{plant.type}</Text>
      </LinearGradient>

      <View style={styles.body}>
        <HealthBar plant={plant} />

        {/* Info card */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Care Details</Text>
          <InfoRow icon="🔁" label="Frequency"
            value={plant.wateringFrequencyDays === 1 ? 'Every day' : `Every ${plant.wateringFrequencyDays} days`} />
          {plant.notes ? (
            <>
              <View style={styles.divider} />
              <InfoRow icon="📝" label="Notes" value={plant.notes} />
            </>
          ) : null}
          <View style={styles.divider} />
          <InfoRow icon="🌱" label="Added" value={formatDate(plant.createdAt)} />
        </View>

        {/* Water button with pulse */}
        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <TouchableOpacity
            style={[styles.waterBtn, wateredToday && styles.waterBtnDone]}
            onPress={wateredToday ? undefined : handleWatered}
            disabled={wateredToday}
            activeOpacity={0.88}
          >
            <Text style={styles.waterBtnText}>
              {wateredToday ? '✅ Watered Today' : '💧 Mark as Watered Today'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Success toast */}
        {showToast && (
          <Animated.View style={[styles.toast, {
            opacity: toastOpacity,
            transform: [{ translateY: toastOpacity.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
          }]}>
            <Text style={styles.toastText}>✓  Watered!</Text>
          </Animated.View>
        )}

        {/* Delete */}
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.85}>
          <Text style={styles.deleteBtnText}>Remove Plant</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Colors.background },
  content:          { paddingBottom: Spacing.xxxl },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, gap: Spacing.md },
  loadingEmoji:     { fontSize: 48 },
  loadingText:      { fontSize: Typography.fontSizeMD, color: Colors.textSecondary },
  hero:             { paddingTop: Spacing.xxl, paddingBottom: Spacing.xxxl, alignItems: 'center', gap: Spacing.sm },
  heroPhotoWrapper: { position: 'relative', marginBottom: Spacing.sm },
  heroEmojiCircle:  { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  heroPhoto:        { width: 100, height: 100, borderRadius: 50 },
  heroEmoji:        { fontSize: 54 },
  editPhotoBtn:     { position: 'absolute', bottom: 0, right: -4, width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4, borderWidth: 1.5, borderColor: Colors.border },
  plantName:        { fontSize: Typography.fontSizeXXL, fontWeight: Typography.fontWeightBold, color: '#FFFFFF', textAlign: 'center' },
  plantType:        { fontSize: Typography.fontSizeLG, color: 'rgba(255,255,255,0.75)' },
  body:             { padding: Spacing.xl, gap: Spacing.lg, marginTop: -Spacing.xl },
  healthCard:       { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, gap: Spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  healthHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: Spacing.sm },
  healthTitle:      { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: Colors.primaryDark },
  healthBadge:      { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  healthDot:        { width: 7, height: 7, borderRadius: 4 },
  healthBadgeText:  { fontSize: Typography.fontSizeXS, fontWeight: Typography.fontWeightSemiBold },
  progressTrack:    { height: 10, borderRadius: 5, backgroundColor: Colors.surfaceSecondary, overflow: 'hidden' },
  progressFill:     { height: '100%', borderRadius: 5 },
  healthDates:      { gap: 2 },
  healthDateText:   { fontSize: Typography.fontSizeXS, color: Colors.textSecondary },
  infoCard:         { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  cardTitle:        { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: Colors.primaryDark, marginBottom: Spacing.md },
  infoRow:          { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, paddingVertical: Spacing.sm },
  infoIcon:         { fontSize: 20, width: 28, textAlign: 'center' },
  infoTextBlock:    { flex: 1 },
  infoLabel:        { fontSize: Typography.fontSizeSM, color: Colors.textMuted, fontWeight: Typography.fontWeightMedium },
  infoValue:        { fontSize: Typography.fontSizeMD, color: Colors.text, marginTop: 2 },
  divider:          { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs },
  waterBtn:         { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: 18, alignItems: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  waterBtnDone:     { backgroundColor: Colors.primaryLight, shadowOpacity: 0, elevation: 0, opacity: 0.75 },
  waterBtnText:     { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: '#FFFFFF', letterSpacing: 0.3 },
  toast:            { alignSelf: 'center', backgroundColor: Colors.primaryDark, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.full, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  toastText:        { color: '#FFFFFF', fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightSemiBold },
  deleteBtn:        { borderRadius: BorderRadius.md, paddingVertical: Spacing.lg, alignItems: 'center', borderWidth: 1.5, borderColor: '#FFCCC4', backgroundColor: '#FFF5F3' },
  deleteBtnText:    { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightSemiBold, color: Colors.danger },
});
