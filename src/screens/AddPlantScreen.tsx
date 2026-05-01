import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Image,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { addPlant, generateId, getPlantEmoji, PLANT_EMOJIS } from '../storage/plantStorage';
import { scheduleWateringReminder } from '../utils/notifications';
import { getPlantCareSuggestion, PlantCareSuggestion } from '../services/gemini';
import { Plant } from '../types';
import { Colors, BorderRadius, Spacing, Typography } from '../constants/theme';

const PLANT_TYPES = Object.keys(PLANT_EMOJIS);

const FREQUENCY_PRESETS = [
  { label: 'Daily',        days: 1  },
  { label: 'Every 2 days', days: 2  },
  { label: 'Every 3 days', days: 3  },
  { label: 'Weekly',       days: 7  },
  { label: '2 weeks',      days: 14 },
  { label: 'Monthly',      days: 30 },
];

const DIFFICULTY_META = {
  easy:   { label: 'Easy',   bg: `${Colors.primaryLight}33`,  color: Colors.accent   },
  medium: { label: 'Medium', bg: `${Colors.warning}33`,       color: Colors.warning  },
  hard:   { label: 'Hard',   bg: `${Colors.danger}33`,        color: Colors.danger   },
};

// Used only as animation start/end offset — large enough to keep the sheet
// fully below the screen regardless of its dynamic content height.
const SHEET_ANIM_OFFSET = 420;

function closestFrequency(days: number): number {
  return FREQUENCY_PRESETS.reduce((prev, curr) =>
    Math.abs(curr.days - days) < Math.abs(prev.days - days) ? curr : prev
  ).days;
}

function FadeSection({ delay, children }: { delay: number; children: React.ReactNode }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(Spacing.lg)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 350, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

const CARD_SIZE = 88;

function EmojiCard({ type, emoji, selected, onPress, size }: {
  type: string; emoji: string; selected: boolean; onPress: () => void; size: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, friction: 5 }),
      Animated.spring(scale, { toValue: 1,    useNativeDriver: true, friction: 6 }),
    ]).start();
    onPress();
  };
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[styles.emojiCard, { width: size, height: size }, selected && styles.emojiCardSelected]}
        onPress={handlePress} activeOpacity={1}
      >
        <Text style={styles.emojiCardIcon}>{emoji}</Text>
        <Text style={[styles.emojiCardLabel, selected && styles.emojiCardLabelSelected]}>{type}</Text>
        {selected && (
          <View style={styles.checkBadge}>
            <Text style={styles.checkBadgeText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function AddPlantScreen() {
  const navigation = useNavigation();
  const { width }  = useWindowDimensions();
  const availableWidth = width - Spacing.xl * 2;
  const numColumns = Math.max(4, Math.floor((availableWidth + Spacing.sm) / (CARD_SIZE + Spacing.sm)));
  const cardSize   = Math.floor((availableWidth - Spacing.sm * (numColumns - 1)) / numColumns);

  const [name, setName]                   = useState('');
  const [type, setType]                   = useState('');
  const [frequencyDays, setFrequencyDays] = useState(7);
  const [notes, setNotes]                 = useState('');
  const [saving, setSaving]               = useState(false);
  const [photoUri, setPhotoUri]           = useState<string | undefined>();
  const [cardSuggestion, setCardSuggestion] = useState<PlantCareSuggestion | null>(null);
  const [cardVisible, setCardVisible]       = useState(false);

  const slideAnim   = useRef(new Animated.Value(SHEET_ANIM_OFFSET)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const headerAnim  = useRef(new Animated.Value(0)).current;
  const dividerAnim = useRef(new Animated.Value(0)).current;
  const tipAnim     = useRef(new Animated.Value(0)).current;
  const freqAnim    = useRef(new Animated.Value(0)).current;
  const actionsAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(-180)).current;

  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!cardVisible) return;
    pulseAnim.setValue(1);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.spring(pulseAnim, { toValue: 1.4, useNativeDriver: true, friction: 3, tension: 120 }),
        Animated.spring(pulseAnim, { toValue: 1.0, useNativeDriver: true, friction: 5, tension: 80  }),
        Animated.delay(1200),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [cardVisible]);

  useEffect(() => {
    if (!cardVisible) return;
    shimmerAnim.setValue(-180);
    const loop = Animated.loop(
      Animated.timing(shimmerAnim, { toValue: width + 180, duration: 2200, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [cardVisible]);

  const showSheet = () => {
    setCardVisible(true);
    [headerAnim, dividerAnim, tipAnim, freqAnim, actionsAnim].forEach(a => a.setValue(0));
    Animated.parallel([
      Animated.timing(overlayAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 8, tension: 60, velocity: 2 }),
    ]).start();
    Animated.stagger(110, [
      Animated.timing(headerAnim,  { toValue: 1, duration: 320, delay: 220, useNativeDriver: true }),
      Animated.timing(dividerAnim, { toValue: 1, duration: 280, delay: 220, useNativeDriver: true }),
      Animated.timing(tipAnim,     { toValue: 1, duration: 320, delay: 220, useNativeDriver: true }),
      Animated.timing(freqAnim,    { toValue: 1, duration: 320, delay: 220, useNativeDriver: true }),
      Animated.timing(actionsAnim, { toValue: 1, duration: 320, delay: 220, useNativeDriver: true }),
    ]).start();
  };

  const dismissSheet = () => {
    Animated.parallel([
      Animated.timing(overlayAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(slideAnim,   { toValue: SHEET_ANIM_OFFSET, duration: 280, useNativeDriver: true }),
    ]).start(() => {
      setCardVisible(false);
      setCardSuggestion(null);
      slideAnim.setValue(SHEET_ANIM_OFFSET);
    });
  };

  const applyAndDismiss = () => {
    if (cardSuggestion) {
      setFrequencyDays(closestFrequency(cardSuggestion.wateringFrequencyDays));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    dismissSheet();
  };

  const triggerSuggestion = async (selectedType: string, plantName: string) => {
    const myId = ++requestIdRef.current;
    try {
      const result = await getPlantCareSuggestion(plantName, selectedType);
      if (requestIdRef.current !== myId) return;
      setCardSuggestion(result);
      showSheet();
    } catch {
      // silently fail — watering chips remain available manually
    }
  };

  const handleTypeSelect = (selectedType: string) => {
    const plantName = name.trim();
    if (selectedType === type && !cardVisible) return;
    if (cardVisible) {
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim,   { toValue: SHEET_ANIM_OFFSET, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        setCardVisible(false);
        setCardSuggestion(null);
        slideAnim.setValue(SHEET_ANIM_OFFSET);
      });
    }
    setType(selectedType);
    triggerSuggestion(selectedType, plantName);
  };

  const pickPhoto = async (source: 'camera' | 'library') => {
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Camera access is required.'); return; }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (!result.canceled) setPhotoUri(result.assets[0].uri);
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Photo library access is required.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (!result.canceled) setPhotoUri(result.assets[0].uri);
    }
  };

  const showPhotoPicker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const buttons: any[] = [
      { text: 'Take Photo',          onPress: () => pickPhoto('camera')  },
      { text: 'Choose from Library', onPress: () => pickPhoto('library') },
    ];
    if (photoUri) buttons.push({ text: 'Remove Photo', style: 'destructive', onPress: () => setPhotoUri(undefined) });
    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Plant Photo', 'Add a photo of your plant', buttons);
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Missing info', 'Please enter a name for your plant.'); return; }
    if (!type)        { Alert.alert('Missing info', 'Please select a plant type.');          return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(true);
    const initialLastWatered = new Date();
    initialLastWatered.setDate(initialLastWatered.getDate() - frequencyDays);

    const plant: Plant = {
      id: generateId(),
      name: name.trim(),
      type,
      wateringFrequencyDays: frequencyDays,
      lastWatered: initialLastWatered.toISOString(),
      notes: notes.trim() || undefined,
      emoji: getPlantEmoji(type),
      photoUri,
      createdAt: new Date().toISOString(),
    };
    await addPlant(plant);
    await scheduleWateringReminder(plant);
    setSaving(false);
    navigation.goBack();
  };

  const snappedDays = cardSuggestion ? closestFrequency(cardSuggestion.wateringFrequencyDays) : 7;
  const freqLabel   = `💧 Watering set to every ${snappedDays} day${snappedDays !== 1 ? 's' : ''}`;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={{ flex: 1 }}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FadeSection delay={0}>
            <View style={styles.hero}>
              <TouchableOpacity style={styles.heroBubbleOuter} onPress={showPhotoPicker} activeOpacity={0.85}>
                <View style={styles.heroEmojiBubble}>
                  {photoUri
                    ? <Image source={{ uri: photoUri }} style={styles.heroBubblePhoto} />
                    : <Text style={styles.heroEmoji}>{type ? getPlantEmoji(type) : '🪴'}</Text>}
                </View>
                <View style={styles.heroCameraBtn}>
                  <Ionicons name="camera" size={14} color={Colors.white} />
                </View>
              </TouchableOpacity>
              <Text style={styles.pageTitle}>Add a Plant</Text>
              <Text style={styles.pageSubtitle}>Tell us about your new plant</Text>
            </View>
          </FadeSection>

          <FadeSection delay={80}>
            <View style={styles.section}>
              <Text style={styles.label}>Plant Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. My Monstera"
                placeholderTextColor={Colors.textMuted}
                value={name} onChangeText={setName}
                maxLength={40} returnKeyType="done"
              />
            </View>
          </FadeSection>

          <FadeSection delay={150}>
            <View style={styles.section}>
              <View style={styles.typeLabelRow}>
                <Text style={styles.label}>Plant Type</Text>
                <Text style={styles.typeHint}>Tap for AI care tips ✨</Text>
              </View>
              <View style={styles.emojiGrid}>
                {PLANT_TYPES.map((t) => (
                  <EmojiCard
                    key={t} type={t} emoji={PLANT_EMOJIS[t]}
                    selected={type === t}
                    onPress={() => handleTypeSelect(t)}
                    size={cardSize}
                  />
                ))}
              </View>
            </View>
          </FadeSection>

          <FadeSection delay={220}>
            <View style={styles.section}>
              <Text style={styles.label}>Watering Frequency</Text>
              <View style={styles.frequencyGrid}>
                {FREQUENCY_PRESETS.map((p) => (
                  <TouchableOpacity
                    key={p.days}
                    style={[styles.freqChip, frequencyDays === p.days && styles.freqChipSelected]}
                    onPress={() => { Haptics.selectionAsync(); setFrequencyDays(p.days); }}
                  >
                    <Text style={[styles.freqChipText, frequencyDays === p.days && styles.freqChipTextSelected]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </FadeSection>

          <FadeSection delay={290}>
            <View style={styles.section}>
              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="Any special care instructions…"
                placeholderTextColor={Colors.textMuted}
                value={notes} onChangeText={setNotes}
                multiline numberOfLines={3} maxLength={200} textAlignVertical="top"
              />
            </View>
          </FadeSection>

          <FadeSection delay={360}>
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave} disabled={saving} activeOpacity={0.88}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Add to My Garden 🌱'}</Text>
            </TouchableOpacity>
          </FadeSection>

          <View style={{ height: 120 }} />
        </ScrollView>

        {cardVisible && (
          <Animated.View
            pointerEvents="box-none"
            style={[StyleSheet.absoluteFill, styles.overlay, { opacity: overlayAnim }]}
          >
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={dismissSheet} />
          </Animated.View>
        )}

        {cardVisible && cardSuggestion && (
          <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>

            <View style={styles.shimmerContainer}>
              <Animated.View style={{ transform: [{ translateX: shimmerAnim }] }}>
                <LinearGradient
                  colors={['transparent', Colors.sheetBorder, `${Colors.sheetFreqText}`, Colors.sheetBorder, 'transparent']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ width: 180, height: 3 }}
                />
              </Animated.View>
            </View>

            <View style={styles.sheetHandle} />

            <Animated.View style={[styles.sheetHeader, {
              opacity: headerAnim,
              transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [Spacing.sm, 0] }) }],
            }]}>
              <View style={styles.aiTitleRow}>
                <Animated.View style={{
                  transform: [{ scale: pulseAnim }],
                  opacity: pulseAnim.interpolate({ inputRange: [1, 1.4], outputRange: [0.75, 1] }),
                }}>
                  <Text style={styles.starsEmoji}>✨</Text>
                </Animated.View>
                <Text style={styles.sheetTitle}>AI Care Suggestion</Text>
              </View>
              {cardSuggestion.difficulty in DIFFICULTY_META && (
                <View style={[styles.difficultyBadge, { backgroundColor: DIFFICULTY_META[cardSuggestion.difficulty].bg }]}>
                  <Text style={[styles.difficultyText, { color: DIFFICULTY_META[cardSuggestion.difficulty].color }]}>
                    {DIFFICULTY_META[cardSuggestion.difficulty].label}
                  </Text>
                </View>
              )}
            </Animated.View>

            <Animated.View style={[styles.glowDivider, { opacity: dividerAnim }]} />

            <Animated.Text style={[styles.sheetTip, {
              opacity: tipAnim,
              transform: [{ translateY: tipAnim.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
            }]}>
              {cardSuggestion.tip}
            </Animated.Text>

            <Animated.Text style={[styles.sheetFreq, {
              opacity: freqAnim,
              transform: [{ translateY: freqAnim.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
            }]}>
              {freqLabel}
            </Animated.Text>

            <Animated.View style={[styles.sheetActions, {
              opacity: actionsAnim,
              transform: [{ translateY: actionsAnim.interpolate({ inputRange: [0, 1], outputRange: [Spacing.sm, 0] }) }],
            }]}>
              <TouchableOpacity onPress={applyAndDismiss} activeOpacity={0.88} style={styles.applyBtnWrapper}>
                <LinearGradient
                  colors={[Colors.primaryLight, Colors.primary]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.applyBtn}
                >
                  <Text style={styles.applyBtnText}>Apply Suggestion</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={dismissSheet} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={styles.dismissText}>Dismiss</Text>
              </TouchableOpacity>
            </Animated.View>

          </Animated.View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const HERO_BUBBLE_SIZE  = 96;
const CAMERA_BTN_SIZE   = 28;

const styles = StyleSheet.create({
  scroll:  { flex: 1 },
  content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl, gap: Spacing.xl },

  hero:            { alignItems: 'center', paddingVertical: Spacing.lg, gap: Spacing.sm },
  heroBubbleOuter: { position: 'relative', marginBottom: Spacing.xs },
  heroEmojiBubble: { width: HERO_BUBBLE_SIZE, height: HERO_BUBBLE_SIZE, borderRadius: HERO_BUBBLE_SIZE / 2, backgroundColor: Colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: Spacing.xxs, borderColor: Colors.border, overflow: 'hidden' },
  heroBubblePhoto: { width: HERO_BUBBLE_SIZE, height: HERO_BUBBLE_SIZE, borderRadius: HERO_BUBBLE_SIZE / 2 },
  heroEmoji:       { fontSize: Typography.fontSizeEmojiHero },
  heroCameraBtn:   { position: 'absolute', bottom: Spacing.xxs, right: 0, width: CAMERA_BTN_SIZE, height: CAMERA_BTN_SIZE, borderRadius: CAMERA_BTN_SIZE / 2, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: Spacing.xxs, borderColor: Colors.surface },
  pageTitle:       { fontSize: Typography.fontSizeXXL, fontWeight: Typography.fontWeightBold, color: Colors.primaryDark },
  pageSubtitle:    { fontSize: Typography.fontSizeMD, color: Colors.textSecondary },

  section:      { gap: Spacing.sm },
  label:        { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightSemiBold, color: Colors.primaryDark },
  typeLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  typeHint:     { fontSize: Typography.fontSizeXS, color: Colors.textMuted, fontStyle: 'italic' },
  input:        { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: Typography.fontSizeMD, color: Colors.text },
  notesInput:   { height: CARD_SIZE },

  emojiGrid:              { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  emojiCard:              { borderRadius: BorderRadius.md, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.border, gap: Spacing.xs, position: 'relative' },
  emojiCardSelected:      { backgroundColor: Colors.primaryDark, borderColor: Colors.primaryDark },
  emojiCardIcon:          { fontSize: 30 },
  emojiCardLabel:         { fontSize: Typography.fontSizeXS, fontWeight: Typography.fontWeightMedium, color: Colors.textSecondary },
  emojiCardLabelSelected: { color: Colors.onDarkSubtle },
  checkBadge:             { position: 'absolute', top: Spacing.xs, right: Spacing.xs, width: 16, height: 16, borderRadius: Spacing.sm, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  checkBadgeText:         { fontSize: Typography.fontSizeTiny, color: Colors.white, fontWeight: Typography.fontWeightBold },

  frequencyGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  freqChip:             { borderRadius: BorderRadius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface },
  freqChipSelected:     { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryLight },
  freqChipText:         { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightMedium, color: Colors.textSecondary },
  freqChipTextSelected: { color: Colors.white },

  saveBtn:         { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: Spacing.btnVertical, alignItems: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  saveBtnDisabled: { opacity: 0.6, shadowOpacity: 0, elevation: 0 },
  saveBtnText:     { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: Colors.white, letterSpacing: 0.3 },

  overlay: { backgroundColor: Colors.overlayDark },

  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.darkSurface,
    borderTopLeftRadius:  BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
    borderTopWidth: 1.5, borderLeftWidth: 1.5, borderRightWidth: 1.5,
    borderColor: Colors.sheetBorder,
    shadowColor: Colors.primaryLight,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: Spacing.xl,
    elevation: 16,
  },
  shimmerContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 3,
    borderTopLeftRadius:  BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    overflow: 'hidden',
  },
  sheetHandle:  { width: 38, height: Spacing.xs, borderRadius: BorderRadius.xs, backgroundColor: Colors.onDarkHandle, alignSelf: 'center', marginTop: Spacing.md },
  sheetHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aiTitleRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  starsEmoji:   { fontSize: Typography.fontSizeXL },
  sheetTitle:   { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: Colors.white },
  difficultyBadge: { borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  difficultyText:  { fontSize: Typography.fontSizeXS, fontWeight: Typography.fontWeightBold },
  glowDivider:  { height: 1, backgroundColor: Colors.sheetGlow, shadowColor: Colors.primaryLight, shadowOpacity: 0.8, shadowRadius: Spacing.xs, shadowOffset: { width: 0, height: 0 } },
  sheetTip:     { fontSize: Typography.fontSizeMD, color: Colors.onDarkSubtle, lineHeight: 22 },
  sheetFreq:    { fontSize: Typography.fontSizeSM, color: Colors.sheetFreqText, fontWeight: Typography.fontWeightMedium },
  sheetActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, marginTop: Spacing.xs },
  applyBtnWrapper: { flex: 1 },
  applyBtn:     { borderRadius: BorderRadius.md, paddingVertical: 14, alignItems: 'center', shadowColor: Colors.primaryLight, shadowOffset: { width: 0, height: Spacing.xs }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 },
  applyBtnText: { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightBold, color: Colors.white, letterSpacing: 0.3 },
  dismissText:  { fontSize: Typography.fontSizeSM, color: Colors.onDarkMuted, fontWeight: Typography.fontWeightMedium },
});
