import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plant } from '../types';
import {
  getDaysUntilWatering,
  getNextWateringDate,
  getPlants,
  updatePlant,
} from '../storage/plantStorage';
import { Colors, BorderRadius, Spacing, Typography } from '../constants/theme';

interface ReminderItem {
  plant: Plant;
  daysUntil: number;
  nextDate: Date;
}

function formatRelativeDate(days: number, date: Date): string {
  if (days < 0) return `Was due ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} ago`;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function urgencyColor(days: number): { bg: string; text: string; dot: string } {
  if (days < 0) return { bg: '#FFE5DC', text: Colors.danger, dot: Colors.danger };
  if (days === 0) return { bg: '#FFF3CD', text: '#856404', dot: '#E9C46A' };
  if (days <= 2) return { bg: '#FFF8E1', text: '#6D5B00', dot: '#F4D03F' };
  return { bg: Colors.accentLight, text: Colors.primaryDark, dot: Colors.primaryLight };
}

function ReminderCard({
  item,
  onWater,
  onPress,
}: {
  item: ReminderItem;
  onWater: () => void;
  onPress: () => void;
}) {
  const colors = urgencyColor(item.daysUntil);
  const relDate = formatRelativeDate(item.daysUntil, item.nextDate);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.urgencyDot, { backgroundColor: colors.dot }]} />
      <View style={styles.emojiWrap}>
        <Text style={styles.emoji}>{item.plant.emoji ?? '🪴'}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.plantName} numberOfLines={1}>{item.plant.name}</Text>
        <View style={[styles.dateBadge, { backgroundColor: colors.bg }]}>
          <Text style={[styles.dateText, { color: colors.text }]}>{relDate}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.waterBtn} onPress={onWater}>
        <Text style={styles.waterBtnText}>💧</Text>
        <Text style={styles.waterBtnLabel}>Watered</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

type ListRow =
  | { type: 'header'; key: string; title: string }
  | { type: 'item'; key: string; item: ReminderItem };

export default function RemindersScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<ListRow[]>([]);

  const load = useCallback(async () => {
    const plants = await getPlants();
    const reminders: ReminderItem[] = plants.map((p) => ({
      plant: p,
      daysUntil: getDaysUntilWatering(p),
      nextDate: getNextWateringDate(p),
    }));
    reminders.sort((a, b) => a.daysUntil - b.daysUntil);

    const overdue = reminders.filter((r) => r.daysUntil < 0);
    const today = reminders.filter((r) => r.daysUntil === 0);
    const soon = reminders.filter((r) => r.daysUntil >= 1 && r.daysUntil <= 3);
    const upcoming = reminders.filter((r) => r.daysUntil > 3);

    const result: ListRow[] = [];
    const push = (title: string, items: ReminderItem[]) => {
      if (!items.length) return;
      result.push({ type: 'header', key: `h_${title}`, title });
      items.forEach((item) =>
        result.push({ type: 'item', key: item.plant.id, item })
      );
    };

    push('🚨 Overdue', overdue);
    push('💧 Water Today', today);
    push('🔔 Coming Up Soon', soon);
    push('📅 Upcoming', upcoming);

    setRows(result);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleWater = async (plant: Plant) => {
    const updated = { ...plant, lastWatered: new Date().toISOString() };
    await updatePlant(updated);
    await load();
  };

  const handlePlantPress = (plant: Plant) => {
    (navigation as any).navigate('PlantDetail', { plantId: plant.id });
  };

  if (rows.length === 0) {
    return (
      <View style={[styles.empty, { paddingTop: insets.top }]}>
        <Text style={styles.emptyEmoji}>🎉</Text>
        <Text style={styles.emptyTitle}>All caught up!</Text>
        <Text style={styles.emptySubtitle}>
          Add plants in your garden to see watering reminders here.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <Text style={styles.pageTitle}>Reminders 🔔</Text>
        <Text style={styles.pageSubtitle}>Your upcoming watering schedule</Text>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(row) => row.key}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: row }) => {
          if (row.type === 'header') {
            return <SectionHeader title={row.title} />;
          }
          return (
            <ReminderCard
              item={row.item}
              onWater={() => handleWater(row.item.plant)}
              onPress={() => handlePlantPress(row.item.plant)}
            />
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  pageTitle: {
    fontSize: Typography.fontSizeXXL,
    fontWeight: Typography.fontWeightBold,
    color: Colors.primaryDark,
  },
  pageSubtitle: {
    fontSize: Typography.fontSizeMD,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  list: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  sectionHeader: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.fontSizeMD,
    fontWeight: Typography.fontWeightBold,
    color: Colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'visible',
  },
  urgencyDot: {
    width: 10,
    height: 10,
    borderRadius: BorderRadius.full,
    flexShrink: 0,
  },
  emojiWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 24,
  },
  info: {
    flex: 1,
    gap: Spacing.xs,
  },
  plantName: {
    fontSize: Typography.fontSizeMD,
    fontWeight: Typography.fontWeightSemiBold,
    color: Colors.text,
  },
  dateBadge: {
    alignSelf: 'flex-start',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  dateText: {
    fontSize: Typography.fontSizeXS,
    fontWeight: Typography.fontWeightSemiBold,
  },
  waterBtn: {
    alignItems: 'center',
    gap: 2,
    padding: Spacing.sm,
  },
  waterBtnText: {
    fontSize: 22,
  },
  waterBtnLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeightMedium,
  },
  empty: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
    gap: Spacing.md,
  },
  emptyEmoji: {
    fontSize: 72,
  },
  emptyTitle: {
    fontSize: Typography.fontSizeXL,
    fontWeight: Typography.fontWeightBold,
    color: Colors.primaryDark,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: Typography.fontSizeMD,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
