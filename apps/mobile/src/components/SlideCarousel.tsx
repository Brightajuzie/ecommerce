import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Linking,
  Pressable,
  Text,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { SlideDto } from "@ikaystores/shared";
import { SlidesApi } from "../api/endpoints";
import { optimizedImageUrl } from "../utils/image";
import { useTheme } from "../theme/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";

const AUTOPLAY_INTERVAL_MS = 4000;

export function SlideCarousel() {
  const theme = useTheme();
  const slidesQuery = useQuery({ queryKey: ["slides"], queryFn: SlidesApi.listActive });
  const slides = slidesQuery.data ?? [];
  const [slideWidth, setSlideWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList<SlideDto>>(null);
  const styles = useThemedStyles((colors) => ({
    wrapper: { marginBottom: 16 },
    slide: { height: 160, borderRadius: 16, overflow: "hidden" as const },
    image: { width: "100%" as const, height: "100%" as const, backgroundColor: colors.border },
    captionOverlay: {
      position: "absolute" as const,
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: "rgba(0,0,0,0.45)",
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    captionText: { color: "#fff", fontWeight: "700" as const, fontSize: 15 },
    dotsRow: {
      flexDirection: "row" as const,
      justifyContent: "center" as const,
      alignItems: "center" as const,
      gap: 6,
      marginTop: 10,
    },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
    dotActive: { width: 18, backgroundColor: theme.primaryColor },
  }));

  // Auto-advances one slide at a time on a fixed interval — pauses whenever
  // there's only one (or zero) slides, and re-syncs immediately after a
  // manual swipe (via onMomentumScrollEnd below) rather than fighting it.
  useEffect(() => {
    if (slides.length < 2 || slideWidth === 0) return;
    const timer = setInterval(() => {
      setActiveIndex((current) => {
        const next = (current + 1) % slides.length;
        listRef.current?.scrollToOffset({ offset: next * slideWidth, animated: true });
        return next;
      });
    }, AUTOPLAY_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [slides.length, slideWidth]);

  if (slides.length === 0) {
    return null;
  }

  const openSlideLink = (linkUrl: string | null) => {
    if (linkUrl) {
      Linking.openURL(linkUrl).catch(() => {});
    }
  };

  const onWrapperLayout = (event: LayoutChangeEvent) => {
    setSlideWidth(event.nativeEvent.layout.width);
  };

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (slideWidth === 0) return;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
    setActiveIndex(Math.max(0, Math.min(index, slides.length - 1)));
  };

  return (
    <View style={styles.wrapper} onLayout={onWrapperLayout}>
      {slideWidth > 0 && (
        <>
          <FlatList
            ref={listRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            data={slides}
            keyExtractor={(item: SlideDto) => item.id}
            snapToInterval={slideWidth}
            decelerationRate="fast"
            onMomentumScrollEnd={onMomentumScrollEnd}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.slide, { width: slideWidth }]}
                onPress={() => openSlideLink(item.linkUrl)}
              >
                <Image source={{ uri: optimizedImageUrl(item.imageUrl, slideWidth * 2) }} style={styles.image} />
                {item.title ? (
                  <View style={styles.captionOverlay}>
                    <Text style={styles.captionText} numberOfLines={2}>
                      {item.title}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            )}
          />
          {slides.length > 1 && (
            <View style={styles.dotsRow}>
              {slides.map((slide, index) => (
                <View key={slide.id} style={[styles.dot, index === activeIndex && styles.dotActive]} />
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}
