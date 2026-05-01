import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plant } from '../types';
import { getDaysUntilWatering, getPlants } from '../storage/plantStorage';
import { Colors, BorderRadius, Spacing, Typography } from '../constants/theme';

// ─── Ring geometry ──────────────────────────────────────────────────────���────

const RING_RADIUS    = 85;
const RING_SIZE      = 220;
const CIRCUMFERENCE  = 2 * Math.PI * RING_RADIUS;
const RING_STROKE    = 14;
const BAR_MAX_HEIGHT = 64;

// ─── Health score helpers ────────────────────────────────────────────────────

function ringColor(score: number): string {
  if (score <= 40) return Colors.danger;
  if (score <= 70) return Colors.warning;
  return Colors.success;
}

function scoreMessage(score: number): string {
  if (score <= 40) return 'Your garden needs some love 😟';
  if (score <= 70) return 'Getting there! Keep watering 🌱';
  return 'Your garden is thriving! 🌿';
}

function calcStreak(plants: Plant[]): number {
  const wateringDays = new Set<string>();
  plants.forEach((p) => {
    const d = new Date(p.lastWatered);
    wateringDays.add(d.toISOString().slice(0, 10));
  });
  let streak = 0;
  const check = new Date();
  while (wateringDays.has(check.toISOString().slice(0, 10))) {
    streak++;
    check.setDate(check.getDate() - 1);
  }
  return streak;
}

function calcHealthScore(plants: Plant[], streak: number): number {
  if (plants.length === 0) return 0;
  let points = 0;
  plants.forEach((p) => {
    const d = getDaysUntilWatering(p);
    if (d > 2)       points += 10;
    else if (d >= 0) points += 5;
  });
  const plantScore  = (points / (plants.length * 10)) * 80;
  const streakBonus = Math.min(streak * 2, 20);
  return Math.round(Math.min(100, plantScore + streakBonus));
}

function calcWeekActivity(plants: Plant[]): { day: string; count: number; isToday: boolean }[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const key   = d.toISOString().slice(0, 10);
    const count = plants.filter(
      (p) => new Date(p.lastWatered).toISOString().slice(0, 10) === key,
    ).length;
    const day = d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1);
    return { day, count, isToday: i === 6 };
  });
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface Stats {
  score: number;
  streak: number;
  total: number;
  overdue: number;
  dueSoon: number;
  healthy: number;
  wateredThisWeek: number;
  weekActivity: { day: string; count: number; isToday: boolean }[];
  plants: Plant[];
}

function buildStats(plants: Plant[]): Stats {
  const streak  = calcStreak(plants);
  const score   = calcHealthScore(plants, streak);
  const now     = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);

  const overdue  = plants.filter((p) => getDaysUntilWatering(p) < 0).length;
  const dueSoon  = plants.filter((p) => { const d = getDaysUntilWatering(p); return d >= 0 && d <= 2; }).length;
  const healthy  = plants.filter((p) => getDaysUntilWatering(p) > 2).length;
  const wateredThisWeek = plants.filter((p) => new Date(p.lastWatered) >= weekAgo).length;

  return { score, streak, total: plants.length, overdue, dueSoon, healthy, wateredThisWeek, weekActivity: calcWeekActivity(plants), plants };
}

// ─── Health ring with animated fill ──────────────────────────────────────────

function HealthRing({ score }: { score: number }) {
  const [displayScore, setDisplayScore] = useState(0);
  const [dashOffset, setDashOffset]     = useState(CIRCUMFERENCE);
  const animValue = useRef(new Animated.Value(0)).current;
  const color     = ringColor(score);

  useEffect(() => {
    animValue.setValue(0);
    setDisplayScore(0);
    setDashOffset(CIRCUMFERENCE);

    const id = animValue.addListener(({ value }) => {
      setDisplayScore(Math.round(value * score));
      setDashOffset(CIRCUMFERENCE * (1 - (value * score) / 100));
    });

    Animated.timing(animValue, {
      toValue: 1, duration: 1600, delay: 150,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    }).start();

    return () => animValue.removeListener(id);
  }, [score]);

  const CX = RING_SIZE / 2;
  const CY = RING_SIZE / 2;

  return (
    <View style={[styles.ringWrapper, { shadowColor: color }]}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Circle cx={CX} cy={CY} r={RING_RADIUS} stroke={Colors.ringTrack} strokeWidth={RING_STROKE} fill="none" />
        <Circle
          cx={CX} cy={CY} r={RING_RADIUS}
          stroke={color} strokeWidth={RING_STROKE} fill="none"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${CX},${CY}`}
        />
      </Svg>
      <View style={styles.ringCenter} pointerEvents="none">
        <Ionicons name="leaf" size={Typography.fontSizeEmojiLG} color={color} style={styles.ringLeaf} />
        <Text style={[styles.ringScore, { color }]}>{displayScore}</Text>
        <Text style={styles.ringSubtext}>/ 100</Text>
      </View>
    </View>
  );
}

// ─── Fade-in animated card ───────────────────────────────────────────────────

function FadeCard({ delay = 0, style, children }: { delay?: number; style?: any; children: React.ReactNode }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 420, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 420, delay, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
    ]).start();
  }, []);

  return <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
}

// ─── Bounce-in number ────────────────────────────────────────────────────────

function BouncyNumber({ value, style }: { value: number; style?: any }) {
  const scale   = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale,   { toValue: 1, delay: 500, useNativeDriver: true, friction: 5, tension: 90 }),
      Animated.timing(opacity, { toValue: 1, duration: 250, delay: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.Text style={[{ opacity, transform: [{ scale }] }, style]}>{value}</Animated.Text>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function GardenStatsScreen() {
  const insets = useSafeAreaInsets();
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [animKey, setAnimKey] = useState(0);

  const load = useCallback(async () => {
    const plants = await getPlants();
    setStats(buildStats(plants));
    setAnimKey((k) => k + 1);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!stats) return null;

  const maxActivity = Math.max(...stats.weekActivity.map((d) => d.count), 1);
  const color       = ringColor(stats.score);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg, paddingBottom: Spacing.tabClearance }]}
      showsVerticalScrollIndicator={false}
    >
      <View key={animKey} style={styles.innerContent}>

        <FadeCard delay={0}>
          <View style={styles.titleRow}>
            <Ionicons name="bar-chart" size={26} color={Colors.primaryDark} />
            <Text style={styles.screenTitle}>Garden Stats</Text>
          </View>
        </FadeCard>

        {/* ── Dark premium health card ── */}
        <FadeCard delay={80} style={styles.healthCard}>
          <Text style={styles.healthLabel}>GARDEN HEALTH</Text>
          <HealthRing score={stats.score} />
          <Text style={[styles.healthMessage, { color }]}>{scoreMessage(stats.score)}</Text>
        </FadeCard>

        {/* ── Streak + plants row ── */}
        <View style={styles.statsRow}>
          <FadeCard delay={200} style={styles.statCard}>
            <Ionicons name="flame" size={30} color={Colors.streakOrange} />
            <BouncyNumber value={stats.streak} style={styles.statBigNum} />
            <Text style={styles.statLabel}>day streak</Text>
            <Text style={styles.statHint}>
              {stats.streak > 0 ? "don't break the chain!" : 'Start watering daily!'}
            </Text>
          </FadeCard>

          <FadeCard delay={280} style={styles.statCard}>
            <Ionicons name="leaf" size={30} color={Colors.primary} />
            <BouncyNumber value={stats.total} style={styles.statBigNum} />
            <Text style={styles.statLabel}>total plants</Text>
            <Text style={styles.statHint}>{stats.wateredThisWeek} watered this week</Text>
          </FadeCard>
        </View>

        {/* ── 7-day activity bar chart ── */}
        <FadeCard delay={360} style={styles.card}>
          <Text style={styles.cardTitle}>Watering Activity</Text>
          <Text style={styles.cardSubtitle}>Last 7 days</Text>
          <View style={styles.barChart}>
            {stats.weekActivity.map((day, i) => {
              const barH  = day.count === 0 ? Spacing.xs : Math.max(Spacing.sm, Math.round((day.count / maxActivity) * BAR_MAX_HEIGHT));
              const barBg = day.isToday ? Colors.primary : day.count > 0 ? Colors.primaryLight : Colors.border;
              return (
                <View key={i} style={styles.barColumn}>
                  <View style={styles.barTrack}>
                    <View style={[styles.bar, { height: barH, backgroundColor: barBg, opacity: day.count === 0 ? 0.4 : 1 }]} />
                  </View>
                  <Text style={[styles.barDayLabel, day.isToday && styles.barDayLabelToday]}>{day.day}</Text>
                  {day.count > 0 && <Text style={styles.barCountLabel}>{day.count}</Text>}
                </View>
              );
            })}
          </View>
        </FadeCard>

        {/* ── Plant status overview ── */}
        <FadeCard delay={440} style={styles.card}>
          <Text style={styles.cardTitle}>Plant Status</Text>

          <View style={styles.pillRow}>
            <View style={[styles.pill, { backgroundColor: Colors.dangerBg }]}>
              <View style={[styles.pillDot, { backgroundColor: Colors.danger }]} />
              <Text style={[styles.pillText, { color: Colors.danger }]}>{stats.overdue} Overdue</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: Colors.warningBg }]}>
              <View style={[styles.pillDot, { backgroundColor: Colors.warningDot }]} />
              <Text style={[styles.pillText, { color: Colors.warningText }]}>{stats.dueSoon} Due Soon</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: Colors.accentLight }]}>
              <View style={[styles.pillDot, { backgroundColor: Colors.success }]} />
              <Text style={[styles.pillText, { color: Colors.primaryDark }]}>{stats.healthy} Healthy</Text>
            </View>
          </View>

          {stats.plants.length === 0 ? (
            <Text style={styles.emptyMsg}>No plants yet. Add some! 🌱</Text>
          ) : (
            <View style={styles.plantList}>
              {stats.plants.map((p) => {
                const days        = getDaysUntilWatering(p);
                const accentColor = days < 0 ? Colors.danger  : days <= 2 ? Colors.warning  : Colors.success;
                const badgeBg     = days < 0 ? Colors.dangerBg : days <= 2 ? Colors.warningBg : Colors.accentLight;
                const badgeColor  = days < 0 ? Colors.danger  : days <= 2 ? Colors.warningText : Colors.primaryDark;
                const statusLabel = days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days}d`;
                return (
                  <View key={p.id} style={[styles.plantRow, { borderLeftColor: accentColor }]}>
                    <Text style={styles.plantRowEmoji}>{p.emoji ?? '🪴'}</Text>
                    <View style={styles.plantRowInfo}>
                      <Text style={styles.plantRowName} numberOfLines={1}>{p.name}</Text>
                      <Text style={styles.plantRowType}>{p.type}</Text>
                    </View>
                    <View style={[styles.plantRowBadge, { backgroundColor: badgeBg }]}>
                      <Text style={[styles.plantRowBadgeText, { color: badgeColor }]}>{statusLabel}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </FadeCard>

      </View>
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.background },
  content:      { paddingHorizontal: Spacing.xl },
  innerContent: { gap: Spacing.lg },

  titleRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  screenTitle: { fontSize: Typography.fontSizeXXL, fontWeight: Typography.fontWeightBold, color: Colors.primaryDark },

  // ── Dark health card ─────────────────────────────────
  healthCard: {
    backgroundColor: Colors.darkSurface,
    borderRadius:    BorderRadius.xl,
    paddingVertical:   Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    shadowColor:   Colors.black,
    shadowOffset:  { width: 0, height: Spacing.sm },
    shadowOpacity: 0.45,
    shadowRadius:  Spacing.xl,
    elevation:     10,
  },
  healthLabel: {
    fontSize:    Typography.fontSizeXS,
    fontWeight:  Typography.fontWeightBold,
    color:       Colors.onDarkFaint,
    letterSpacing: 1.8,
    marginBottom:  Spacing.md,
  },
  healthMessage: {
    fontSize:   Typography.fontSizeMD,
    fontWeight: Typography.fontWeightSemiBold,
    marginTop:  Spacing.md,
    textAlign:  'center',
  },

  // ── Ring ────────────────────────────────────────────
  ringWrapper: {
    width:  RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius:  Spacing.xxl,
    elevation:     8,
  },
  ringCenter: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  ringLeaf:    { marginBottom: Spacing.xxs },
  ringScore:   { fontSize: Typography.fontSizeScore, fontWeight: Typography.fontWeightBold, lineHeight: 56 },
  ringSubtext: { fontSize: Typography.fontSizeSM, color: Colors.onDarkFaint, marginTop: -Spacing.xxs },

  // ── Stats row ────────────────────────────────────────
  statsRow: { flexDirection: 'row', gap: Spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius:    BorderRadius.lg,
    padding:         Spacing.lg,
    alignItems:      'center',
    gap:             Spacing.xs,
    shadowColor:     Colors.black,
    shadowOffset:    { width: 0, height: Spacing.xxs },
    shadowOpacity:   0.06,
    shadowRadius:    Spacing.sm,
    elevation:       2,
  },
  statBigNum: { fontSize: Typography.fontSizeStat, fontWeight: Typography.fontWeightBold, color: Colors.primaryDark, lineHeight: 50 },
  statLabel:  { fontSize: Typography.fontSizeSM, color: Colors.textSecondary, fontWeight: Typography.fontWeightMedium },
  statHint:   { fontSize: Typography.fontSizeXS, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.xxs },

  // ── Generic card ─────────────────────────────────────
  card: {
    backgroundColor: Colors.surface,
    borderRadius:    BorderRadius.lg,
    padding:         Spacing.lg,
    shadowColor:     Colors.black,
    shadowOffset:    { width: 0, height: Spacing.xxs },
    shadowOpacity:   0.06,
    shadowRadius:    Spacing.sm,
    elevation:       2,
  },
  cardTitle:    { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: Colors.primaryDark },
  cardSubtitle: { fontSize: Typography.fontSizeSM, color: Colors.textSecondary, marginTop: Spacing.xxs, marginBottom: Spacing.lg },

  // ── Bar chart ─────────────────────────────────────────
  barChart:         { flexDirection: 'row', gap: Spacing.sm },
  barColumn:        { flex: 1, alignItems: 'center', gap: Spacing.xs },
  barTrack:         { width: '100%', height: BAR_MAX_HEIGHT, justifyContent: 'flex-end', alignItems: 'center' },
  bar:              { width: '70%', borderRadius: BorderRadius.sm },
  barDayLabel:      { fontSize: Typography.fontSizeXXS, color: Colors.textSecondary, fontWeight: Typography.fontWeightMedium },
  barDayLabelToday: { color: Colors.primary, fontWeight: Typography.fontWeightBold },
  barCountLabel:    { fontSize: Typography.fontSizeTiny, color: Colors.textMuted },

  // ── Pills ─────────────────────────────────────────────
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md, marginBottom: Spacing.lg },
  pill:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm - Spacing.xxs, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  pillDot: { width: Spacing.sm, height: Spacing.sm, borderRadius: BorderRadius.xs + Spacing.xxs },
  pillText:{ fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightSemiBold },

  // ── Plant list ────────────────────────────────────────
  plantList: { gap: Spacing.sm },
  plantRow:  {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.md,
    borderLeftWidth: Spacing.xs,
    padding: Spacing.md, gap: Spacing.md,
  },
  plantRowEmoji:     { fontSize: Typography.fontSizeEmoji },
  plantRowInfo:      { flex: 1 },
  plantRowName:      { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightSemiBold, color: Colors.text },
  plantRowType:      { fontSize: Typography.fontSizeXS, color: Colors.textSecondary, marginTop: Spacing.xxs },
  plantRowBadge:     { borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs },
  plantRowBadgeText: { fontSize: Typography.fontSizeXS, fontWeight: Typography.fontWeightSemiBold },

  emptyMsg: { fontSize: Typography.fontSizeMD, color: Colors.textSecondary, textAlign: 'center', paddingVertical: Spacing.xl },
});
