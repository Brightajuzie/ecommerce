import { useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";
import { API_URL } from "../../api/client";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import type { BuyerStackParamList } from "../../navigation/types";

const REDIRECT_PATH = `${API_URL}/payments/redirect/`;

export function PaymentWebViewScreen() {
  const route = useRoute<RouteProp<BuyerStackParamList, "PaymentWebView">>();
  const navigation = useNavigation<NativeStackNavigationProp<BuyerStackParamList>>();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const [hasResolved, setHasResolved] = useState(false);
  const resolvedRef = useRef(false);
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1 },
    loading: {
      position: "absolute" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: colors.surface,
    },
  }));

  const handleNavigationChange = (event: WebViewNavigation) => {
    if (resolvedRef.current) return;
    if (event.url.startsWith(REDIRECT_PATH)) {
      resolvedRef.current = true;
      setHasResolved(true);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      navigation.replace("OrderDetail", { orderId: route.params.orderId });
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: route.params.checkoutUrl }}
        onNavigationStateChange={handleNavigationChange}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={theme.primaryColor} />
          </View>
        )}
      />
      {hasResolved && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.primaryColor} />
        </View>
      )}
    </View>
  );
}
