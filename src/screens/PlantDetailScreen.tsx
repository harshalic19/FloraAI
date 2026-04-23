import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  deletePlant,
  getDaysUntilWatering,
  getNextWateringDate,
  getPlantById,
  updatePlant,
} from '../storage/plantStorage';
import { Plant, RootTabParamList } from '../types';
import { Colors, BorderRadius, Spacing, Typography } from '../constants/theme';

type PlantDetailRouteProp = RouteProp<RootTabParamList, 'PlantDetail'>;

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function WaterStatusBanner({ plant }: { plant: Plant }) {
  const days = getDaysUntilWatering(plant);

  let bg = Colors.accentLight;
  let textColor = Colors.primaryDark;
  let message = `Water in ${days} day${days !== 1 ? 's' : ''}`;
  let icon = '🌿';

  if (days < 0) {
    bg = '#FFE5DC';
    textColor = Colors.danger;
    message = `Overdue by ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''}`;
    icon = '🚨';
  } else if (days === 0) {
    bg = '#FFF3CD';
    textColor = '#856404';
    message = 'Needs water today!';
    icon = '💧';
  } else if (days === 1) {
    bg = '#FFF3CD';
    textColor = '#856404';
    message = 'Water tomorrow';
    icon = '🔔';
  }

  return (
    <View style={[styles.statusBanner, { backgroundColor: bg }]}>
      <Text style={styles.statusIcon}>{icon}</Text>
      <Text style={[styles.statusText, { color: textColor }]}>{message}</Text>
    </View>
  );
}

export default function PlantDetailScreen() {
  const route = useRoute<PlantDetailRouteProp>();
  const navigation = useNavigation();
  const [plant, setPlant] = useState<Plant | null>(null);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const data = await getPlantById(route.params.plantId);
        setPlant(data);
      };
      load();
    }, [route.params.plantId])
  );

  const handleWater = async () => {
    if (!plant) return;
    const updated = { ...plant, lastWatered: new Date().toISOString() };
    setPlant(updated);
    await updatePlant(updated);
  };

  const handleDelete = () => {
    if (!plant) return;
    Alert.alert('Remove Plant', `Remove "${plant.name}" from your garden?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deletePlant(plant.id);
          navigation.goBack();
        },
      },
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

  const nextWatering = getNextWateringDate(plant);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.emojiCircle}>
          <Text style={styles.heroEmoji}>{plant.emoji ?? '🪴'}</Text>
        </View>
        <Text style={styles.plantName}>{plant.name}</Text>
        <Text style={styles.plantType}>{plant.type}</Text>
      </View>

      <WaterStatusBanner plant={plant} />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Care Info</Text>
        <InfoRow
          icon="💧"
          label="Last Watered"
          value={formatDate(plant.lastWatered)}
        />
        <View style={styles.divider} />
        <InfoRow
          icon="📅"
          label="Next Watering"
          value={formatDate(nextWatering.toISOString())}
        />
        <View style={styles.divider} />
        <InfoRow
          icon="🔁"
          label="Frequency"
          value={
            plant.wateringFrequencyDays === 1
              ? 'Every day'
              : `Every ${plant.wateringFrequencyDays} days`
          }
        />
        {plant.notes ? (
          <>
            <View style={styles.divider} />
            <InfoRow icon="📝" label="Notes" value={plant.notes} />
          </>
        ) : null}
        <View style={styles.divider} />
        <InfoRow
          icon="🌱"
          label="Added to Garden"
          value={formatDate(plant.createdAt)}
        />
      </View>

      <TouchableOpacity style={styles.waterBtn} onPress={handleWater} activeOpacity={0.85}>
        <Text style={styles.waterBtnText}>💧 Mark as Watered Today</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.85}>
        <Text style={styles.deleteBtnText}>Remove Plant</Text>
      </TouchableOpacity>
    </ScrollView>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    gap: Spacing.md,
  },
  loadingEmoji: {
    fontSize: 48,
  },
  loadingText: {
    fontSize: Typography.fontSizeMD,
    color: Colors.textSecondary,
  },
  hero: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
    gap: Spacing.sm,
  },
  emojiCircle: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  heroEmoji: {
    fontSize: 52,
  },
  plantName: {
    fontSize: Typography.fontSizeXXL,
    fontWeight: Typography.fontWeightBold,
    color: Colors.primaryDark,
    textAlign: 'center',
  },
  plantType: {
    fontSize: Typography.fontSizeLG,
    color: Colors.textSecondary,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
  },
  statusIcon: {
    fontSize: 24,
  },
  statusText: {
    fontSize: Typography.fontSizeLG,
    fontWeight: Typography.fontWeightSemiBold,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: Typography.fontSizeLG,
    fontWeight: Typography.fontWeightBold,
    color: Colors.primaryDark,
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  infoIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  infoTextBlock: {
    flex: 1,
  },
  infoLabel: {
    fontSize: Typography.fontSizeSM,
    color: Colors.textMuted,
    fontWeight: Typography.fontWeightMedium,
  },
  infoValue: {
    fontSize: Typography.fontSizeMD,
    color: Colors.text,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.xs,
  },
  waterBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  waterBtnText: {
    fontSize: Typography.fontSizeLG,
    fontWeight: Typography.fontWeightBold,
    color: '#FFFFFF',
  },
  deleteBtn: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFCCC4',
    backgroundColor: '#FFF5F3',
  },
  deleteBtnText: {
    fontSize: Typography.fontSizeMD,
    fontWeight: Typography.fontWeightSemiBold,
    color: Colors.danger,
  },
});
