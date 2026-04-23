import React, { useState } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { addPlant, generateId, getPlantEmoji, PLANT_EMOJIS } from '../storage/plantStorage';
import { Plant } from '../types';
import { Colors, BorderRadius, Spacing, Typography } from '../constants/theme';

const PLANT_TYPES = Object.keys(PLANT_EMOJIS);

const FREQUENCY_PRESETS = [
  { label: 'Daily', days: 1 },
  { label: 'Every 2 days', days: 2 },
  { label: 'Every 3 days', days: 3 },
  { label: 'Weekly', days: 7 },
  { label: 'Every 2 weeks', days: 14 },
  { label: 'Monthly', days: 30 },
];

export default function AddPlantScreen() {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [frequencyDays, setFrequencyDays] = useState(7);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Missing info', 'Please enter a name for your plant.');
      return;
    }
    if (!type) {
      Alert.alert('Missing info', 'Please select a plant type.');
      return;
    }

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
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroRow}>
          <Text style={styles.heroEmoji}>{type ? getPlantEmoji(type) : '🪴'}</Text>
          <View>
            <Text style={styles.pageTitle}>Add a Plant</Text>
            <Text style={styles.pageSubtitle}>Fill in your plant's details</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Plant Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. My Monstera"
            placeholderTextColor={Colors.textMuted}
            value={name}
            onChangeText={setName}
            maxLength={40}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Plant Type *</Text>
          <View style={styles.typeGrid}>
            {PLANT_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeChip, type === t && styles.typeChipSelected]}
                onPress={() => setType(t)}
                activeOpacity={0.8}
              >
                <Text style={styles.typeChipEmoji}>{PLANT_EMOJIS[t]}</Text>
                <Text
                  style={[
                    styles.typeChipText,
                    type === t && styles.typeChipTextSelected,
                  ]}
                >
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Watering Frequency *</Text>
          <View style={styles.frequencyGrid}>
            {FREQUENCY_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.days}
                style={[
                  styles.frequencyChip,
                  frequencyDays === preset.days && styles.frequencyChipSelected,
                ]}
                onPress={() => setFrequencyDays(preset.days)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.frequencyChipText,
                    frequencyDays === preset.days && styles.frequencyChipTextSelected,
                  ]}
                >
                  {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

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
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>
            {saving ? 'Saving…' : 'Add to My Garden 🌱'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.xl,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  heroEmoji: {
    fontSize: 56,
  },
  pageTitle: {
    fontSize: Typography.fontSizeXXL,
    fontWeight: Typography.fontWeightBold,
    color: Colors.primaryDark,
  },
  pageSubtitle: {
    fontSize: Typography.fontSizeMD,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  section: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: Typography.fontSizeMD,
    fontWeight: Typography.fontWeightSemiBold,
    color: Colors.primaryDark,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: Typography.fontSizeMD,
    color: Colors.text,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  typeChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeChipEmoji: {
    fontSize: 16,
  },
  typeChipText: {
    fontSize: Typography.fontSizeSM,
    fontWeight: Typography.fontWeightMedium,
    color: Colors.textSecondary,
  },
  typeChipTextSelected: {
    color: '#FFFFFF',
  },
  frequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  frequencyChip: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  frequencyChipSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primaryLight,
  },
  frequencyChipText: {
    fontSize: Typography.fontSizeSM,
    fontWeight: Typography.fontWeightMedium,
    color: Colors.textSecondary,
  },
  frequencyChipTextSelected: {
    color: '#FFFFFF',
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: Typography.fontSizeLG,
    fontWeight: Typography.fontWeightBold,
    color: '#FFFFFF',
  },
});
