import React, { ComponentProps, useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plant } from '../types';
import {
  getDaysUntilWatering,
  getNextWateringDate,
  getPlants,
  updateLastWatered,
} from '../storage/plantStorage';
import { Colors, BorderRadius, Spacing, Typography } from '../constants/theme';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

interface ReminderItem {
  plant: Plant;
  daysUntil: number;
  nextDate: Date;
}

type SectionKey = 'overdue' | 'today' | 'soon' | 'upcoming';

const SECTION_META: Record<SectionKey, { label: string; icon: IoniconsName; color: string; bg: string }> = {
  overdue:  { label: 'Overdue',        icon: 'alert-circle',     color: Colors.danger,      bg: Colors.dangerBgAlt  },
  today:    { label: 'Water Today',    icon: 'water',            color: Colors.warningDark,  bg: Colors.warningBgAlt },
  soon:     { label: 'Coming Up Soon', icon: 'time-outline',     color: Colors.warningSoon,  bg: Colors.warningBgFaint },
  upcoming: { label: 'Upcoming',       icon: 'calendar-outline', color: Colors.primary,      bg: Colors.accentLight  },
};

function formatRelativeDate(days: number, date: Date): string {
  if (days < 0) return `${Math.abs(days)}d ago`;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function FadeRow({ delay, children }: { delay: number; children: React.ReactNode }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 320, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 320, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

function SectionHeader({ sectionKey, delay }: { sectionKey: SectionKey; delay: number }) {
  const meta = SECTION_META[sectionKey];
  return (
    <FadeRow delay={delay}>
      <View style={[styles.sectionHeader, { backgroundColor: meta.bg }]}>
        <Ionicons name={meta.icon} size={14} color={meta.color} />
        <Text style={[styles.sectionTitle, { color: meta.color }]}>{meta.label}</Text>
      </View>
    </FadeRow>
  );
}

function ReminderCard({
  item,
  sectionKey,
  delay,
  onWater,
  onPress,
}: {
  item: ReminderItem;
  sectionKey: SectionKey;
  delay: number;
  onWater: () => void;
  onPress: () => void;
}) {
  const meta    = SECTION_META[sectionKey];
  const relDate = formatRelativeDate(item.daysUntil, item.nextDate);

  return (
    <FadeRow delay={delay}>
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
        <View style={[styles.cardBorder, { backgroundColor: meta.color }]} />
        <View style={styles.emojiWrap}>
          <Text style={styles.emoji}>{item.plant.emoji ?? '🪴'}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.plantName} numberOfLines={1}>{item.plant.name}</Text>
          <View style={[styles.dateBadge, { backgroundColor: meta.bg }]}>
            <Text style={[styles.dateText, { color: meta.color }]}>{relDate}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.waterBtn, { backgroundColor: meta.bg }]}
          onPress={onWater}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="water" size={18} color={Colors.water} />
          <Text style={[styles.waterBtnLabel, { color: meta.color }]}>Water</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </FadeRow>
  );
}

type ListRow =
  | { type: 'header'; key: string; sectionKey: SectionKey; delay: number }
  | { type: 'item';   key: string; item: ReminderItem; sectionKey: SectionKey; delay: number };

export default function RemindersScreen() {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();
  const [rows, setRows] = useState<ListRow[]>([]);

  const load = useCallback(async () => {
    const plants = await getPlants();
    const reminders: ReminderItem[] = plants.map((p) => ({
      plant: p,
      daysUntil: getDaysUntilWatering(p),
      nextDate:  getNextWateringDate(p),
    }));
    reminders.sort((a, b) => a.daysUntil - b.daysUntil);

    const groups: Record<SectionKey, ReminderItem[]> = {
      overdue:  reminders.filter((r) => r.daysUntil < 0),
      today:    reminders.filter((r) => r.daysUntil === 0),
      soon:     reminders.filter((r) => r.daysUntil >= 1 && r.daysUntil <= 3),
      upcoming: reminders.filter((r) => r.daysUntil > 3),
    };

    const result: ListRow[] = [];
    let delayMs = 120;
    (Object.keys(groups) as SectionKey[]).forEach((sk) => {
      if (!groups[sk].length) return;
      result.push({ type: 'header', key: `h_${sk}`, sectionKey: sk, delay: delayMs });
      delayMs += 40;
      groups[sk].forEach((item) => {
        result.push({ type: 'item', key: item.plant.id, item, sectionKey: sk, delay: delayMs });
        delayMs += 50;
      });
    });
    setRows(result);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleWater = async (plant: Plant) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await updateLastWatered(plant.id);
    await load();
  };

  const handlePlantPress = (plant: Plant) => {
    (navigation as any).navigate('PlantDetail', { plantId: plant.id });
  };

  if (rows.length === 0) {
    return (
      <View style={[styles.empty, { paddingTop: insets.top + Spacing.xl }]}>
        <Ionicons name="checkmark-circle" size={72} color={Colors.success} />
        <Text style={styles.emptyTitle}>All caught up!</Text>
        <Text style={styles.emptySubtitle}>Add plants to see watering reminders here.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <View style={styles.pageTitleRow}>
          <Ionicons name="notifications" size={24} color={Colors.primaryDark} />
          <Text style={styles.pageTitle}>Reminders</Text>
        </View>
        <Text style={styles.pageSubtitle}>Your upcoming watering schedule</Text>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: row }) =>
          row.type === 'header' ? (
            <SectionHeader sectionKey={row.sectionKey} delay={row.delay} />
          ) : (
            <ReminderCard
              item={row.item}
              sectionKey={row.sectionKey}
              delay={row.delay}
              onWater={() => handleWater(row.item.plant)}
              onPress={() => handlePlantPress(row.item.plant)}
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.background },
  header:       { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg },
  pageTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  pageTitle:    { fontSize: Typography.fontSizeXXL, fontWeight: Typography.fontWeightBold, color: Colors.primaryDark },
  pageSubtitle: { fontSize: Typography.fontSizeMD, color: Colors.textSecondary, marginTop: Spacing.xs },
  list:         { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl, gap: Spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: BorderRadius.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, marginTop: Spacing.md, marginBottom: Spacing.xxs },
  sectionTitle:  { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightBold, letterSpacing: 0.4, textTransform: 'uppercase' },
  card:          { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', shadowColor: Colors.black, shadowOffset: { width: 0, height: Spacing.xxs }, shadowOpacity: 0.06, shadowRadius: Spacing.sm, elevation: 2 },
  cardBorder:    { width: Spacing.xs, alignSelf: 'stretch' },
  emojiWrap:     { width: 44, height: 44, borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center', marginLeft: Spacing.md },
  emoji:         { fontSize: Typography.fontSizeEmojiMD },
  cardInfo:      { flex: 1, paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, gap: Spacing.xs },
  plantName:     { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightSemiBold, color: Colors.text },
  dateBadge:     { alignSelf: 'flex-start', borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs },
  dateText:      { fontSize: Typography.fontSizeXS, fontWeight: Typography.fontWeightSemiBold },
  waterBtn:      { alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, marginRight: Spacing.sm, borderRadius: BorderRadius.md },
  waterBtnLabel: { fontSize: Typography.fontSizeXXS, fontWeight: Typography.fontWeightSemiBold },
  empty:         { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxxl, gap: Spacing.md },
  emptyTitle:    { fontSize: Typography.fontSizeXL, fontWeight: Typography.fontWeightBold, color: Colors.primaryDark, textAlign: 'center' },
  emptySubtitle: { fontSize: Typography.fontSizeMD, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
