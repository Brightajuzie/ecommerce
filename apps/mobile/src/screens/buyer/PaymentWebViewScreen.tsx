import { useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";
import { API_URL } from "../../api/client";
import type { BuyerStackParamList } from "../../navigation/types";

const REDIRECT_PATH = `${API_URL}/payments/redirect/`;

export function PaymentWebViewScreen() {
  const route = useRoute<RouteProp<BuyerStackParamList, "PaymentWebView">>();
  const navigation = useNavigation<NativeStackNavigationProp<BuyerStackParamList>>();
  const queryClient = useQueryClient();
  const [hasResolved, setHasResolved] = useState(false);
  const resolvedRef = useRef(false);

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
            <ActivityIndicator size="large" />
          </View>
        )}
      />
      {hasResolved && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
});
