import { useEffect, useRef } from "react";
import { Animated, View, type DimensionValue, type StyleProp, type ViewStyle } from "react-native";
import { useThemedStyles } from "../theme/useThemedStyles";

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width = "100%", height = 16, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.35)).current;
  const styles = useThemedStyles((colors) => ({
    skeleton: {
      backgroundColor: colors.surfaceAlt,
    },
  }));

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function ProductCardSkeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const styles = useThemedStyles((colors) => ({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 10,
      margin: 6,
      flexGrow: 1,
      shadowColor: "#000",
      shadowOpacity: colors.shadowOpacity,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
    },
    image: {
      width: "100%",
      aspectRatio: 1,
      borderRadius: 12,
      marginBottom: 10,
    },
  }));

  return (
    <View style={[styles.card, style]}>
      <Skeleton style={styles.image} borderRadius={12} />
      <Skeleton width="45%" height={12} borderRadius={6} style={{ marginBottom: 6 }} />
      <Skeleton width="85%" height={15} borderRadius={6} style={{ marginBottom: 8 }} />
      <Skeleton width="60%" height={16} borderRadius={6} />
    </View>
  );
}

export function OrderCardSkeleton() {
  const styles = useThemedStyles((colors) => ({
    card: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 10,
      shadowColor: "#000",
      shadowOpacity: colors.shadowOpacity,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
    },
  }));

  return (
    <View style={styles.card}>
      <Skeleton width={40} height={40} borderRadius={10} />
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton width="40%" height={14} borderRadius={6} />
        <Skeleton width="25%" height={11} borderRadius={4} />
      </View>
      <View style={{ alignItems: "flex-end", gap: 6 }}>
        <Skeleton width={60} height={14} borderRadius={6} />
        <Skeleton width={50} height={16} borderRadius={8} />
      </View>
    </View>
  );
}

export function CartItemSkeleton() {
  const styles = useThemedStyles((colors) => ({
    card: {
      flexDirection: "row" as const,
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginBottom: 10,
    },
  }));

  return (
    <View style={styles.card}>
      <Skeleton width={76} height={76} borderRadius={14} />
      <View style={{ flex: 1, marginLeft: 12, justifyContent: "center", gap: 8 }}>
        <Skeleton width="70%" height={15} borderRadius={6} />
        <Skeleton width="35%" height={14} borderRadius={6} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
          <Skeleton width={70} height={26} borderRadius={8} />
          <Skeleton width={26} height={26} borderRadius={8} />
        </View>
      </View>
    </View>
  );
}
