import React, { ComponentProps, useCallback, useEffect, useRef, useState } from 'react';
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
import { Plant, HomeStackParamList } from '../types';
import { Colors, BorderRadius, Spacing, Typography } from '../constants/theme';

type PlantDetailRouteProp = RouteProp<HomeStackParamList, 'PlantDetail'>;

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
    Animated.timing(anim, { toValue: progress, duration: 700, delay: 300, useNativeDriver: false }).start();
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

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

function InfoRow({ icon, label, value }: { icon: IoniconsName; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={Colors.textSecondary} style={styles.infoIcon} />
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

  const btnScale     = useRef(new Animated.Value(1)).current;
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
      result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library access is required to pick photos.');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.8 });
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
        text: 'Remove Photo', style: 'destructive',
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
        <Ionicons name="leaf-outline" size={60} color={Colors.primaryLight} />
        <Text style={styles.loadingText}>Loading plant…</Text>
      </View>
    );
  }

  const wateredToday = isWateredToday(plant.lastWatered);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroPhotoWrapper}>
          <View style={styles.heroEmojiCircle}>
            {plant.photoUri
              ? <Image source={{ uri: plant.photoUri }} style={styles.heroPhoto} />
              : <Text style={styles.heroEmoji}>{plant.emoji ?? '🪴'}</Text>
            }
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

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Care Details</Text>
          <InfoRow icon="repeat" label="Frequency"
            value={plant.wateringFrequencyDays === 1 ? 'Every day' : `Every ${plant.wateringFrequencyDays} days`} />
          {plant.notes ? (
            <>
              <View style={styles.divider} />
              <InfoRow icon="document-text-outline" label="Notes" value={plant.notes} />
            </>
          ) : null}
          <View style={styles.divider} />
          <InfoRow icon="leaf-outline" label="Added" value={formatDate(plant.createdAt)} />
        </View>

        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <TouchableOpacity
            style={[styles.waterBtn, wateredToday && styles.waterBtnDone]}
            onPress={wateredToday ? undefined : handleWatered}
            disabled={wateredToday}
            activeOpacity={0.88}
          >
            <View style={styles.waterBtnContent}>
              <Ionicons name={wateredToday ? 'checkmark-circle' : 'water'} size={20} color={Colors.white} />
              <Text style={styles.waterBtnText}>
                {wateredToday ? 'Watered Today' : 'Mark as Watered Today'}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {showToast && (
          <Animated.View style={[styles.toast, {
            opacity: toastOpacity,
            transform: [{ translateY: toastOpacity.interpolate({ inputRange: [0, 1], outputRange: [Spacing.sm, 0] }) }],
          }]}>
            <Text style={styles.toastText}>✓  Watered!</Text>
          </Animated.View>
        )}

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.85}>
          <Text style={styles.deleteBtnText}>Remove Plant</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const HERO_CIRCLE_SIZE = 100;
const EDIT_BTN_SIZE    = 30;

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Colors.background },
  content:          { paddingBottom: Spacing.xxxl },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, gap: Spacing.md },
  loadingText:      { fontSize: Typography.fontSizeMD, color: Colors.textSecondary },

  hero:             { paddingTop: Spacing.xxl, paddingBottom: Spacing.xxxl, alignItems: 'center', gap: Spacing.sm },
  heroPhotoWrapper: { position: 'relative', marginBottom: Spacing.sm },
  heroEmojiCircle:  { width: HERO_CIRCLE_SIZE, height: HERO_CIRCLE_SIZE, borderRadius: HERO_CIRCLE_SIZE / 2, backgroundColor: Colors.onDarkHandle, alignItems: 'center', justifyContent: 'center', borderWidth: Spacing.xxs, borderColor: Colors.onDarkHandle, overflow: 'hidden' },
  heroPhoto:        { width: HERO_CIRCLE_SIZE, height: HERO_CIRCLE_SIZE, borderRadius: HERO_CIRCLE_SIZE / 2 },
  heroEmoji:        { fontSize: Typography.fontSizeEmojiXL },
  editPhotoBtn:     { position: 'absolute', bottom: 0, right: -Spacing.xs, width: EDIT_BTN_SIZE, height: EDIT_BTN_SIZE, borderRadius: EDIT_BTN_SIZE / 2, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.black, shadowOffset: { width: 0, height: Spacing.xxs }, shadowOpacity: 0.2, shadowRadius: Spacing.xs, elevation: 4, borderWidth: 1.5, borderColor: Colors.border },
  plantName:        { fontSize: Typography.fontSizeXXL, fontWeight: Typography.fontWeightBold, color: Colors.white, textAlign: 'center' },
  plantType:        { fontSize: Typography.fontSizeLG, color: Colors.headerSubtitle },

  body:             { padding: Spacing.xl, gap: Spacing.lg, marginTop: Spacing.md },

  healthCard:       { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, gap: Spacing.md, shadowColor: Colors.black, shadowOffset: { width: 0, height: Spacing.xxs }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  healthHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: Spacing.sm },
  healthTitle:      { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: Colors.primaryDark },
  healthBadge:      { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  healthDot:        { width: 7, height: 7, borderRadius: BorderRadius.xs + Spacing.xxs },
  healthBadgeText:  { fontSize: Typography.fontSizeXS, fontWeight: Typography.fontWeightSemiBold },
  progressTrack:    { height: 10, borderRadius: BorderRadius.xs + 3, backgroundColor: Colors.surfaceSecondary, overflow: 'hidden' },
  progressFill:     { height: '100%', borderRadius: BorderRadius.xs + 3 },
  healthDates:      { gap: Spacing.xxs },
  healthDateText:   { fontSize: Typography.fontSizeXS, color: Colors.textSecondary },

  infoCard:         { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, shadowColor: Colors.black, shadowOffset: { width: 0, height: Spacing.xxs }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  cardTitle:        { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: Colors.primaryDark, marginBottom: Spacing.md },
  infoRow:          { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, paddingVertical: Spacing.sm },
  infoIcon:         { width: Spacing.xxl, textAlign: 'center' },
  infoTextBlock:    { flex: 1 },
  infoLabel:        { fontSize: Typography.fontSizeSM, color: Colors.textMuted, fontWeight: Typography.fontWeightMedium },
  infoValue:        { fontSize: Typography.fontSizeMD, color: Colors.text, marginTop: Spacing.xxs },
  divider:          { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs },

  waterBtn:         { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: Spacing.btnVertical, alignItems: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  waterBtnDone:     { backgroundColor: Colors.primaryLight, shadowOpacity: 0, elevation: 0, opacity: 0.75 },
  waterBtnContent:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  waterBtnText:     { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: Colors.white, letterSpacing: 0.3 },

  toast:            { alignSelf: 'center', backgroundColor: Colors.primaryDark, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.full, shadowColor: Colors.black, shadowOffset: { width: 0, height: Spacing.xs }, shadowOpacity: 0.2, shadowRadius: Spacing.sm, elevation: 6 },
  toastText:        { color: Colors.white, fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightSemiBold },

  deleteBtn:        { borderRadius: BorderRadius.md, paddingVertical: Spacing.lg, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.dangerBorder, backgroundColor: Colors.dangerSurface },
  deleteBtnText:    { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightSemiBold, color: Colors.danger },
});
