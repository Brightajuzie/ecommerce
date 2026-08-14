import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

interface Particle {
  emoji: string;
  /** Horizontal position as a percentage of the container width. */
  left: number;
  size: number;
  /** Full drift-cycle duration in ms — varied per particle so they don't move in lockstep. */
  duration: number;
  delay: number;
  driftX: number;
}

// A fixed, hand-tuned set (not random) so the hero looks the same on every
// load instead of occasionally clustering — position/size/timing spread
// deliberately across the hero width and a few different rhythms.
const PARTICLES: Particle[] = [
  { emoji: "🍃", left: 6, size: 22, duration: 6000, delay: 0, driftX: 10 },
  { emoji: "🍊", left: 22, size: 18, duration: 7200, delay: 900, driftX: -8 },
  { emoji: "🍋", left: 78, size: 20, duration: 6600, delay: 300, driftX: 12 },
  { emoji: "🥬", left: 90, size: 16, duration: 8000, delay: 1400, driftX: -10 },
  { emoji: "🍇", left: 55, size: 15, duration: 7600, delay: 2000, driftX: 8 },
  { emoji: "🌿", left: 38, size: 17, duration: 6800, delay: 1100, driftX: -6 },
];

function FloatingParticle({ particle }: { particle: Particle }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(particle.delay),
        Animated.timing(progress, {
          toValue: 1,
          duration: particle.duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [particle, progress]);

  const translateY = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -16, 0] });
  const translateX = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, particle.driftX, 0] });
  const rotate = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: ["-6deg", "6deg", "-6deg"] });
  const opacity = progress.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0.55, 0.85, 0.85, 0.55] });

  return (
    <Animated.Text
      style={[
        styles.particle,
        {
          left: `${particle.left}%`,
          fontSize: particle.size,
          opacity,
          transform: [{ translateY }, { translateX }, { rotate }],
        },
      ]}
    >
      {particle.emoji}
    </Animated.Text>
  );
}

/**
 * Purely decorative drifting leaves/fruit for the Home hero — reinforces
 * the grocery-store brand with motion without competing for taps
 * (pointerEvents="none", absolutely positioned behind the search bar/text).
 * Cheap: a handful of Animated.Text nodes on the native driver, no images.
 */
export function FloatingProduce() {
  return (
    <View style={styles.layer} pointerEvents="none">
      {PARTICLES.map((particle, index) => (
        <FloatingParticle key={index} particle={particle} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden" },
  particle: { position: "absolute", top: 6 },
});
