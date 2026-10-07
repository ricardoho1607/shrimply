import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "@/config/firebase";
if (Platform.OS !== "web")
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound:
        notification.request.content.data?.severity === "critical",
      shouldSetBadge: false,
    }),
  });
export async function enableSopPush(
  companyId: string,
  quietHours: { quietStart: string; quietEnd: string } = {
    quietStart: "22:00",
    quietEnd: "06:00",
  },
) {
  if (Platform.OS === "web")
    return { enabled: false, reason: "Use mobile notification permissions." };
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("sop-critical", {
      name: "Critical SOP issues",
      importance: Notifications.AndroidImportance.HIGH,
    });
    await Notifications.setNotificationChannelAsync("sop-routine", {
      name: "Farm task reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted")
    return {
      enabled: false,
      reason:
        "Notification permission was not granted. In-app tasks remain available.",
    };
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId;
  if (!projectId)
    throw new Error("This native build is missing its EAS project ID.");
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await httpsCallable(
    getFunctions(db.app),
    "sopCommand",
  )({
    action: "registerDevice",
    companyId,
    operationId: `device-${Date.now()}`,
    token,
    ...quietHours,
  });
  return { enabled: true, reason: "Mobile SOP notifications enabled." };
}
export function useSopPush() {
  const { user, company, isBuyer } = useAuth(),
    router = useRouter();
  useEffect(() => {
    if (Platform.OS === "web" || !user?.uid || !company?.id || isBuyer) return;
    let active = true;
    const redirect = (response: Notifications.NotificationResponse | null) => {
      if (!active || !response) return;
      const data = response.notification.request.content.data || {};
      if (
        data.companyId !== company.id ||
        typeof data.url !== "string" ||
        !/^\/todo(?:\?taskId=[A-Za-z0-9_-]*)?$/.test(data.url)
      )
        return;
      router.push(data.url as "/todo");
    };
    void Notifications.getLastNotificationResponseAsync()
      .then(redirect)
      .catch(() => undefined);
    const subscription =
      Notifications.addNotificationResponseReceivedListener(redirect);
    return () => {
      active = false;
      subscription.remove();
    };
  }, [user?.uid, company?.id, isBuyer, router]);
}
