import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { notificationApi } from "./notificationApi";

const USER_APP_KEY = "user_app";

let lastRegisteredExpoToken = null;

const logPushNotification = (message, details = {}) => {
    console.log(`[PushNotifications] ${message}`, details);
};

const warnPushNotification = (message, details = {}) => {
    console.warn(`[PushNotifications] ${message}`, details);
};

const maskExpoPushToken = (expoPushToken) => {
    const token = String(expoPushToken || "");
    if (token.length <= 16) return "masked";
    return `${token.slice(0, 14)}...${token.slice(-8)}`;
};

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

const getProjectId = () =>
    Constants.easConfig?.projectId ||
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.manifest2?.extra?.eas?.projectId ||
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    null;

const ensureAndroidNotificationChannel = async () => {
    if (Platform.OS !== "android") return;

    await Notifications.setNotificationChannelAsync("customer-offers", {
        name: "Customer Offers",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#4A43EC",
        sound: "default",
    });

    logPushNotification("Android notification channel ensured", {
        channelId: "customer-offers",
    });
};

const getGrantedNotificationPermissions = async () => {
    logPushNotification("Checking notification permission status");

    const existing = await Notifications.getPermissionsAsync();
    logPushNotification("Existing permission status read", {
        status: existing.status,
        granted: existing.granted,
        canAskAgain: existing.canAskAgain,
    });

    if (existing.status === "granted") return existing;

    logPushNotification("Requesting notification permission");
    return Notifications.requestPermissionsAsync();
};

export const registerForPushNotificationsAsync = async (authToken) => {
    logPushNotification("Registration started", {
        platform: Platform.OS,
        hasAuthToken: Boolean(authToken),
    });

    if (!authToken || Platform.OS === "web") {
        logPushNotification("Registration skipped", {
            reason: !authToken ? "missing-auth-token" : "web-platform",
        });
        return null;
    }

    if (Platform.OS === "ios" && Constants.isDevice === false) {
        logPushNotification("Registration skipped", {
            reason: "ios-simulator-not-supported",
        });
        return null;
    }

    await ensureAndroidNotificationChannel();

    const permissions = await getGrantedNotificationPermissions();
    logPushNotification("Permission status resolved", {
        status: permissions.status,
        granted: permissions.granted,
        canAskAgain: permissions.canAskAgain,
    });

    if (permissions.status !== "granted") {
        logPushNotification("Registration skipped", {
            reason: "permission-not-granted",
            status: permissions.status,
        });
        return null;
    }

    const projectId = getProjectId();
    logPushNotification("Expo project id resolved", {
        hasProjectId: Boolean(projectId),
        projectId,
    });

    if (!projectId) {
        warnPushNotification("Expo projectId is missing", {
            hint: "Set EXPO_PUBLIC_EAS_PROJECT_ID in squarft-user/.env or add expo.extra.eas.projectId in app.json, then restart Expo with -c.",
        });
        return null;
    }

    const expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    logPushNotification("Expo push token resolved", {
        hasToken: Boolean(expoPushToken),
        expoPushToken: maskExpoPushToken(expoPushToken),
    });

    if (!expoPushToken || expoPushToken === lastRegisteredExpoToken) {
        logPushNotification("Backend registration skipped", {
            reason: !expoPushToken ? "missing-expo-token" : "already-registered-this-session",
            expoPushToken: maskExpoPushToken(expoPushToken),
        });
        return expoPushToken || null;
    }

    const response = await notificationApi.registerPushToken(authToken, {
        appKey: USER_APP_KEY,
        expoPushToken,
        platform: Platform.OS,
    });

    lastRegisteredExpoToken = expoPushToken;
    logPushNotification("Backend registration completed", {
        appKey: USER_APP_KEY,
        tokenId: response?.data?.id || null,
        expoPushToken: maskExpoPushToken(expoPushToken),
    });

    return expoPushToken;
};
