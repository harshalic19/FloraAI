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
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { addPlant, generateId, getPlantEmoji, PLANT_EMOJIS } from '../storage/plantStorage';
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

function FadeSection({ delay, children }: { delay: number; children: React.ReactNode }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

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

function EmojiCard({
  type,
  emoji,
  selected,
  onPress,
}: {
  type: string;
  emoji: string;
  selected: boolean;
  onPress: () => void;
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
        style={[styles.emojiCard, selected && styles.emojiCardSelected]}
        onPress={handlePress}
        activeOpacity={1}
      >
        <Text style={styles.emojiCardIcon}>{emoji}</Text>
        <Text style={[styles.emojiCardLabel, selected && styles.emojiCardLabelSelected]}>
          {type}
        </Text>
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
  const [name, setName]                 = useState('');
  const [type, setType]                 = useState('');
  const [frequencyDays, setFrequencyDays] = useState(7);
  const [notes, setNotes]               = useState('');
  const [saving, setSaving]             = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Missing info', 'Please enter a name for your plant.'); return; }
    if (!type)        { Alert.alert('Missing info', 'Please select a plant type.');          return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(true);
    const plant: Plant = {
      id: generateId(),
      name: name.trim(),
      type,
      wateringFrequencyDays: frequencyDays,
      lastWatered: new Date().toISOString(),
      notes: notes.trim() || undefined,
      emoji: getPlantEmoji(type),
      createdAt: new Date().toISOString(),
    };
    await addPlant(plant);
    setSaving(false);
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <FadeSection delay={0}>
          <View style={styles.hero}>
            <View style={styles.heroEmojiBubble}>
              <Text style={styles.heroEmoji}>{type ? getPlantEmoji(type) : '🪴'}</Text>
            </View>
            <Text style={styles.pageTitle}>Add a Plant</Text>
            <Text style={styles.pageSubtitle}>Tell us about your new plant</Text>
          </View>
        </FadeSection>

        {/* Name */}
        <FadeSection delay={80}>
          <View style={styles.section}>
            <Text style={styles.label}>Plant Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. My Monstera"
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={setName}
              maxLength={40}
              returnKeyType="next"
            />
          </View>
        </FadeSection>

        {/* Type grid */}
        <FadeSection delay={150}>
          <View style={styles.section}>
            <Text style={styles.label}>Plant Type</Text>
            <View style={styles.emojiGrid}>
              {PLANT_TYPES.map((t) => (
                <EmojiCard
                  key={t}
                  type={t}
                  emoji={PLANT_EMOJIS[t]}
                  selected={type === t}
                  onPress={() => setType(t)}
                />
              ))}
            </View>
          </View>
        </FadeSection>

        {/* Frequency */}
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

        {/* Notes */}
        <FadeSection delay={290}>
          <View style={styles.section}>
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Any special care instructions…"
              placeholderTextColor={Colors.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              maxLength={200}
              textAlignVertical="top"
            />
          </View>
        </FadeSection>

        {/* Save */}
        <FadeSection delay={360}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.88}
          >
            <Text style={styles.saveBtnText}>
              {saving ? 'Saving…' : 'Add to My Garden 🌱'}
            </Text>
          </TouchableOpacity>
        </FadeSection>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const CARD_SIZE = 88;

const styles = StyleSheet.create({
  scroll:   { flex: 1 },
  content:  { padding: Spacing.xl, paddingBottom: Spacing.xxxl, gap: Spacing.xl },
  hero:     { alignItems: 'center', paddingVertical: Spacing.lg, gap: Spacing.sm },
  heroEmojiBubble: { width: 90, height: 90, borderRadius: 45, backgroundColor: Colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.border, marginBottom: Spacing.xs },
  heroEmoji:       { fontSize: 46 },
  pageTitle:       { fontSize: Typography.fontSizeXXL, fontWeight: Typography.fontWeightBold, color: Colors.primaryDark },
  pageSubtitle:    { fontSize: Typography.fontSizeMD, color: Colors.textSecondary },
  section:         { gap: Spacing.sm },
  label:           { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightSemiBold, color: Colors.primaryDark },
  input:           { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: Typography.fontSizeMD, color: Colors.text },
  notesInput:      { height: 88 },
  emojiGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  emojiCard:       { width: CARD_SIZE, height: CARD_SIZE, borderRadius: BorderRadius.md, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.border, gap: 4, position: 'relative' },
  emojiCardSelected: { backgroundColor: Colors.primaryDark, borderColor: Colors.primaryDark },
  emojiCardIcon:     { fontSize: 30 },
  emojiCardLabel:    { fontSize: 11, fontWeight: Typography.fontWeightMedium, color: Colors.textSecondary },
  emojiCardLabelSelected: { color: 'rgba(255,255,255,0.85)' },
  checkBadge:        { position: 'absolute', top: 5, right: 5, width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  checkBadgeText:    { fontSize: 9, color: '#fff', fontWeight: '700' },
  frequencyGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  freqChip:          { borderRadius: BorderRadius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface },
  freqChipSelected:  { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryLight },
  freqChipText:      { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightMedium, color: Colors.textSecondary },
  freqChipTextSelected: { color: '#FFFFFF' },
  saveBtn:           { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: 18, alignItems: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  saveBtnDisabled:   { opacity: 0.6, shadowOpacity: 0, elevation: 0 },
  saveBtnText:       { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: '#FFFFFF', letterSpacing: 0.3 },
});
