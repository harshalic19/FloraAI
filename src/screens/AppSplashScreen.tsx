import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import Svg, {
  Ellipse,
  Circle,
  Path,
  Defs,
  RadialGradient,
  LinearGradient as SvgLinearGradient,
  Stop,
  G,
  Pattern,
  Rect,
} from 'react-native-svg';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

const { width: SW, height: SH } = Dimensions.get('window');

// Layout constants — derived from the HTML design proportions
const WAVE_H    = SH * 0.44;
const BLOOM_S   = Math.min(SW * 0.58, 230);
const BLOOM_LIFT = 45;
const BLOOM_TOP  = WAVE_H - BLOOM_S / 2 - BLOOM_LIFT;
const CONTENT_TOP = WAVE_H + BLOOM_S / 2 - BLOOM_LIFT + 14;

// ─── Bloom ──────────────────────────────────────────────────────���────────────
function Bloom({ size }: { size: number }) {
  const angles = [0, 60, 120, 180, 240, 300];
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <RadialGradient id="petal" cx="30%" cy="30%" r="70%">
          <Stop offset="0%" stopColor={Colors.accentLight} />
          <Stop offset="100%" stopColor={Colors.accent} />
        </RadialGradient>
        <RadialGradient id="cg" cx="50%" cy="40%" r="60%">
          <Stop offset="0%" stopColor={Colors.white} stopOpacity="0.3" />
          <Stop offset="100%" stopColor={Colors.warning} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <G>
        {angles.map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          const cx  = 100 + Math.cos(rad) * 38;
          const cy  = 100 + Math.sin(rad) * 38;
          return (
            <Ellipse
              key={i}
              cx={cx} cy={cy} rx={20} ry={30}
              transform={`rotate(${deg + 90} ${cx} ${cy})`}
              fill="url(#petal)"
              opacity={i % 2 === 0 ? 0.9 : 0.65}
            />
          );
        })}
        <Circle cx="100" cy="100" r="26" fill={Colors.warning} />
        <Circle cx="100" cy="100" r="26" fill="url(#cg)" />
        <Path
          d="M100 112 C93 100 93 88 100 85 C107 88 107 100 100 112Z"
          fill={Colors.primaryDark}
          opacity="0.5"
        />
      </G>
    </Svg>
  );
}

// ─── Wave crown ────────────────────��────────────────────────────��────────────
function WaveSvg() {
  const svgH = WAVE_H * (310 / 260);
  const sx   = SW  / 390;
  const sy   = svgH / 310;

  const wavePath = [
    `M0 ${240 * sy}`,
    `Q${97  * sx} ${210 * sy}`,
    ` ${195 * sx} ${228 * sy}`,
    `Q${293 * sx} ${246 * sy}`,
    ` ${SW}       ${218 * sy}`,
    `L${SW} ${svgH}`,
    `L0 ${svgH}Z`,
  ].join(' ');

  return (
    <Svg width={SW} height={svgH}>
      <Defs>
        <SvgLinearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%"   stopColor={Colors.primaryDark} />
          <Stop offset="100%" stopColor="#1e5c3a" />
        </SvgLinearGradient>
      </Defs>
      <Rect x={0} y={0} width={SW} height={svgH} fill="url(#wg)" />
      <Path d={wavePath} fill={Colors.background} />
    </Svg>
  );
}

// ─── Dot grid ───────────────────────────────────────────────���────────────────
function DotGrid() {
  return (
    <Svg style={StyleSheet.absoluteFillObject} width={SW} height={SH} pointerEvents="none">
      <Defs>
        <Pattern id="dots" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
          <Circle cx="11" cy="11" r="1.2" fill={Colors.accent} opacity="0.18" />
        </Pattern>
      </Defs>
      <Rect width={SW} height={SH} fill="url(#dots)" />
    </Svg>
  );
}

// ─── Loading dots ─────────────────────────────────────────────────────���───────
function LoadingDots() {
  const a0 = useRef(new Animated.Value(0.35)).current;
  const a1 = useRef(new Animated.Value(0.35)).current;
  const a2 = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const pulse = (a: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(a, { toValue: 1,    duration: 380, useNativeDriver: true }),
          Animated.timing(a, { toValue: 0.35, duration: 380, useNativeDriver: true }),
          Animated.delay(360),
        ])
      );
    const l0 = pulse(a0, 0);
    const l1 = pulse(a1, 200);
    const l2 = pulse(a2, 400);
    l0.start(); l1.start(); l2.start();
    return () => { l0.stop(); l1.stop(); l2.stop(); };
  }, []);

  const dot = (a: Animated.Value, primary: boolean) => (
    <Animated.View
      style={{
        width: 7, height: 7, borderRadius: BorderRadius.xs + Spacing.xxs,
        backgroundColor: primary ? Colors.primary : Colors.accentLight,
        opacity: a,
        transform: [{ scale: a }],
      }}
    />
  );

  return (
    <View style={styles.dotsRow}>
      {dot(a0, false)}
      {dot(a1, true)}
      {dot(a2, false)}
    </View>
  );
}

// ─── Splash screen ────────────────────────────────────────────────────────────
interface Props { onDone: () => void; }

export default function AppSplashScreen({ onDone }: Props) {
  const waveY    = useRef(new Animated.Value(-WAVE_H * 0.3)).current;
  const bloomS   = useRef(new Animated.Value(0.3)).current;
  const bloomO   = useRef(new Animated.Value(0)).current;
  const logoO    = useRef(new Animated.Value(0)).current;
  const logoY    = useRef(new Animated.Value(18)).current;
  const taglineO = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(18)).current;
  const subO     = useRef(new Animated.Value(0)).current;
  const subY     = useRef(new Animated.Value(18)).current;
  const screenO  = useRef(new Animated.Value(1)).current;

  const fade = (o: Animated.Value, y: Animated.Value, delay: number) =>
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(o, { toValue: 1, duration: 480, useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 480, useNativeDriver: true }),
      ]),
    ]);

  useEffect(() => {
    Animated.timing(waveY, { toValue: 0, duration: 550, useNativeDriver: true }).start();

    Animated.sequence([
      Animated.delay(220),
      Animated.parallel([
        Animated.spring(bloomS, { toValue: 1, friction: 5, tension: 55, useNativeDriver: true }),
        Animated.timing(bloomO, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
    ]).start();

    fade(logoO,    logoY,    520).start();
    fade(taglineO, taglineY, 700).start();
    fade(subO,     subY,     860).start();

    Animated.sequence([
      Animated.delay(3200),
      Animated.timing(screenO, { toValue: 0, duration: 480, useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) onDone(); });
  }, []);

  return (
    <Animated.View style={[styles.root, { opacity: screenO }]}>
      <StatusBar barStyle="light-content" />
      <DotGrid />

      <Animated.View style={[styles.wave, { transform: [{ translateY: waveY }] }]} pointerEvents="none">
        <WaveSvg />
      </Animated.View>

      <Animated.View style={[styles.bloom, { opacity: bloomO, transform: [{ scale: bloomS }] }]}>
        <Bloom size={BLOOM_S} />
      </Animated.View>

      <View style={styles.content}>
        <Animated.View style={[styles.wordmark, { opacity: logoO, transform: [{ translateY: logoY }] }]}>
          <Text style={styles.wordFlora}>Flora</Text>
          <View style={styles.aiBadge}>
            <Text style={styles.aiText}>AI</Text>
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: logoO, transform: [{ translateY: logoY }] }}>
          <Text style={styles.plantCareLabel}>Plant Care</Text>
        </Animated.View>

        <Animated.View style={[styles.divider, { opacity: logoO }]} />

        <Animated.View style={{ opacity: taglineO, transform: [{ translateY: taglineY }] }}>
          <Text style={styles.tagline}>
            Your plants,{'\n'}always cared for.
          </Text>
        </Animated.View>

        <Animated.View style={[styles.subWrap, { opacity: subO, transform: [{ translateY: subY }] }]}>
          <Text style={styles.subCopy}>
            Smart watering reminders, care tips,{'\n'}and plant health — all in one place.
          </Text>
        </Animated.View>
      </View>

      <LoadingDots />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  wave:  { position: 'absolute', top: 0, left: 0 },
  bloom: { position: 'absolute', top: BLOOM_TOP, left: SW / 2 - BLOOM_S / 2, zIndex: 3 },
  content: { position: 'absolute', top: CONTENT_TOP, left: 0, right: 0, alignItems: 'center' },

  wordmark: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  wordFlora: {
    fontFamily:    'Georgia',
    fontSize:      Typography.fontSizeStat,
    fontWeight:    Typography.fontWeightBold,
    color:         Colors.primary,
    letterSpacing: -0.5,
    lineHeight:    46,
  },
  aiBadge: {
    backgroundColor:  Colors.primary,
    borderRadius:     BorderRadius.xl,
    paddingHorizontal: Spacing.sm,
    paddingVertical:   3,
    marginTop:         7,
  },
  aiText: {
    color:      Colors.accentLight,
    fontSize:   Typography.fontSizeSM,
    fontWeight: Typography.fontWeightBold,
    lineHeight: 16,
  },

  plantCareLabel: {
    fontSize:      Typography.fontSizeXS,
    fontWeight:    Typography.fontWeightMedium,
    color:         Colors.textMuted,
    letterSpacing: 3.5,
    textTransform: 'uppercase',
    marginTop:     6,
  },

  divider: {
    width:           36,
    height:          Spacing.xxs,
    borderRadius:    BorderRadius.xs,
    backgroundColor: Colors.accentLight,
    marginTop:       Spacing.xl,
    marginBottom:    Spacing.lg,
  },

  tagline: {
    fontFamily:       'Georgia',
    fontSize:         Typography.fontSizeEmoji,
    fontWeight:       Typography.fontWeightBold,
    color:            Colors.primaryDark,
    textAlign:        'center',
    lineHeight:       30,
    paddingHorizontal: 36,
  },

  subWrap: { marginTop: 10 },
  subCopy: {
    fontSize:          Typography.fontSizeSM,
    color:             Colors.textMuted,
    textAlign:         'center',
    lineHeight:        20,
    paddingHorizontal: 44,
  },

  dotsRow: {
    position:       'absolute',
    bottom:         52,
    left:           0,
    right:          0,
    flexDirection:  'row',
    justifyContent: 'center',
    gap:            7,
  },
});
