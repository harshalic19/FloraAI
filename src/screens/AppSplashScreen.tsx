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

const { width: SW, height: SH } = Dimensions.get('window');

// Layout constants — derived from the HTML design proportions
const WAVE_H   = SH * 0.44;           // green crown covers ~44% of screen
const BLOOM_S  = Math.min(SW * 0.58, 230); // bloom diameter
const BLOOM_TOP = WAVE_H - BLOOM_S / 2;   // center the bloom ON the wave boundary
const CONTENT_TOP = WAVE_H + BLOOM_S / 2 + 14; // text starts 14px below bloom bottom

const C = {
  primary:      '#2D6A4F',
  primaryLight: '#52B788',
  primaryDark:  '#1B4332',
  accent:       '#74C69D',
  accentLight:  '#B7E4C7',
  bg:           '#F8FFF9',
  warn:         '#E9C46A',
  textMuted:    '#95B8A0',
};

// ─── Bloom ───────────────────────────────────────────────────────────────────
function Bloom({ size }: { size: number }) {
  const angles = [0, 60, 120, 180, 240, 300];
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <RadialGradient id="petal" cx="30%" cy="30%" r="70%">
          <Stop offset="0%" stopColor={C.accentLight} />
          <Stop offset="100%" stopColor={C.accent} />
        </RadialGradient>
        <RadialGradient id="cg" cx="50%" cy="40%" r="60%">
          <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
          <Stop offset="100%" stopColor={C.warn} stopOpacity="0" />
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
        <Circle cx="100" cy="100" r="26" fill={C.warn} />
        <Circle cx="100" cy="100" r="26" fill="url(#cg)" />
        <Path
          d="M100 112 C93 100 93 88 100 85 C107 88 107 100 100 112Z"
          fill={C.primaryDark}
          opacity="0.5"
        />
      </G>
    </Svg>
  );
}

// ─── Wave crown (SVG — exact HTML path, scaled to device) ────────────────────
// HTML: viewBox "0 0 390 310", rect height 260, wave path M0 240 Q97 210 195 228 Q293 246 390 218
// We extend the SVG height below WAVE_H so the wave tail clips cleanly
function WaveSvg() {
  const svgH = WAVE_H * (310 / 260); // proportional extra space for the wave tail
  const sx   = SW  / 390;            // x scale to device width
  const sy   = svgH / 310;           // y scale to svg height

  // Scaled wave path (S-curve across the bottom of the green section)
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
          <Stop offset="0%"   stopColor="#1B4332" />
          <Stop offset="100%" stopColor="#1e5c3a" />
        </SvgLinearGradient>
      </Defs>
      {/* Solid gradient fill */}
      <Rect x={0} y={0} width={SW} height={svgH} fill="url(#wg)" />
      {/* White wave cutout identical to HTML design */}
      <Path d={wavePath} fill={C.bg} />
    </Svg>
  );
}

// ─── Dot grid ────────────────────────────────────────────────────────────────
function DotGrid() {
  return (
    <Svg style={StyleSheet.absoluteFillObject} width={SW} height={SH} pointerEvents="none">
      <Defs>
        <Pattern id="dots" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
          <Circle cx="11" cy="11" r="1.2" fill={C.accent} opacity="0.18" />
        </Pattern>
      </Defs>
      <Rect width={SW} height={SH} fill="url(#dots)" />
    </Svg>
  );
}

// ─── Loading dots ─────────────────────────────────────────────────────────────
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
        width: 7, height: 7, borderRadius: 4,
        backgroundColor: primary ? C.primary : C.accentLight,
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
  const waveY     = useRef(new Animated.Value(-WAVE_H * 0.3)).current;
  const bloomS    = useRef(new Animated.Value(0.3)).current;
  const bloomO    = useRef(new Animated.Value(0)).current;
  const logoO     = useRef(new Animated.Value(0)).current;
  const logoY     = useRef(new Animated.Value(18)).current;
  const taglineO  = useRef(new Animated.Value(0)).current;
  const taglineY  = useRef(new Animated.Value(18)).current;
  const subO      = useRef(new Animated.Value(0)).current;
  const subY      = useRef(new Animated.Value(18)).current;
  const screenO   = useRef(new Animated.Value(1)).current;

  const fade = (o: Animated.Value, y: Animated.Value, delay: number) =>
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(o, { toValue: 1, duration: 480, useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 480, useNativeDriver: true }),
      ]),
    ]);

  useEffect(() => {
    // Wave slides down
    Animated.timing(waveY, { toValue: 0, duration: 550, useNativeDriver: true }).start();

    // Bloom springs in at 220ms
    Animated.sequence([
      Animated.delay(220),
      Animated.parallel([
        Animated.spring(bloomS, { toValue: 1, friction: 5, tension: 55, useNativeDriver: true }),
        Animated.timing(bloomO, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
    ]).start();

    // Staggered text
    fade(logoO,    logoY,    520).start();
    fade(taglineO, taglineY, 700).start();
    fade(subO,     subY,     860).start();

    // Fade out at 3.2 s → call onDone
    Animated.sequence([
      Animated.delay(3200),
      Animated.timing(screenO, { toValue: 0, duration: 480, useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) onDone(); });
  }, []);

  return (
    <Animated.View style={[styles.root, { opacity: screenO }]}>
      <StatusBar barStyle="light-content" />

      {/* Dot grid */}
      <DotGrid />

      {/* Green crown wave — SVG path, slides down from above */}
      <Animated.View
        style={[styles.wave, { transform: [{ translateY: waveY }] }]}
        pointerEvents="none"
      >
        <WaveSvg />
      </Animated.View>

      {/* Bloom — centered exactly on the wave boundary */}
      <Animated.View
        style={[
          styles.bloom,
          {
            opacity:   bloomO,
            transform: [{ scale: bloomS }],
          },
        ]}
      >
        <Bloom size={BLOOM_S} />
      </Animated.View>

      {/* Content block — starts just below the bloom */}
      <View style={styles.content}>
        {/* Wordmark */}
        <Animated.View
          style={[styles.wordmark, { opacity: logoO, transform: [{ translateY: logoY }] }]}
        >
          <Text style={styles.wordFlora}>Flora</Text>
          <View style={styles.aiBadge}>
            <Text style={styles.aiText}>AI</Text>
          </View>
        </Animated.View>

        {/* PLANT CARE */}
        <Animated.View style={{ opacity: logoO, transform: [{ translateY: logoY }] }}>
          <Text style={styles.plantCareLabel}>Plant Care</Text>
        </Animated.View>

        {/* Divider */}
        <Animated.View style={[styles.divider, { opacity: logoO }]} />

        {/* Tagline */}
        <Animated.View
          style={{ opacity: taglineO, transform: [{ translateY: taglineY }] }}
        >
          <Text style={styles.tagline}>
            Your plants,{'\n'}always cared for.
          </Text>
        </Animated.View>

        {/* Sub-copy */}
        <Animated.View
          style={[styles.subWrap, { opacity: subO, transform: [{ translateY: subY }] }]}
        >
          <Text style={styles.subCopy}>
            Smart watering reminders, care tips,{'\n'}and plant health — all in one place.
          </Text>
        </Animated.View>
      </View>

      {/* Loading dots */}
      <LoadingDots />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.bg,
    overflow: 'hidden',
  },

  // Wave: absolutely positioned SVG — height includes the wave tail
  wave: {
    position: 'absolute',
    top: 0,
    left: 0,
  },

  // Bloom: absolutely centered horizontally, straddles wave boundary
  bloom: {
    position: 'absolute',
    top: BLOOM_TOP,
    left: SW / 2 - BLOOM_S / 2,
    zIndex: 3,
  },

  // Content block below bloom
  content: {
    position: 'absolute',
    top: CONTENT_TOP,
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  // Wordmark row
  wordmark: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
  },
  wordFlora: {
    fontFamily: 'Georgia',
    fontSize: 42,
    fontWeight: '700',
    color: C.primary,
    letterSpacing: -0.5,
    lineHeight: 46,
  },
  aiBadge: {
    backgroundColor: C.primary,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 7,
  },
  aiText: {
    color: C.accentLight,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },

  // PLANT CARE
  plantCareLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: C.textMuted,
    letterSpacing: 3.5,
    textTransform: 'uppercase',
    marginTop: 6,
  },

  // Divider
  divider: {
    width: 36,
    height: 2,
    borderRadius: 2,
    backgroundColor: C.accentLight,
    marginTop: 20,
    marginBottom: 16,
  },

  // Tagline
  tagline: {
    fontFamily: 'Georgia',
    fontSize: 22,
    fontWeight: '700',
    color: C.primaryDark,
    textAlign: 'center',
    lineHeight: 30,
    paddingHorizontal: 36,
  },

  // Sub-copy
  subWrap: { marginTop: 10 },
  subCopy: {
    fontSize: 13,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 44,
  },

  // Loading dots
  dotsRow: {
    position: 'absolute',
    bottom: 52,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 7,
  },
});
