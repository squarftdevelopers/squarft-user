import { useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import * as Notifications from "expo-notifications";
import { registerForPushNotificationsAsync } from "../services/pushNotifications";
import { fetchNotificationsThunk } from "../store/slices/notificationSlice";
import { navigateToNotification } from "../utils/notificationNavigation";

export default function PushNotificationRegistrar() {
    const { isLoggedIn, token } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const notificationListener = useRef();
    const responseListener = useRef();

    useEffect(() => {
        console.log("[PushNotificationRegistrar] Auth state changed", {
            isLoggedIn,
            hasToken: Boolean(token),
        });

        if (!isLoggedIn || !token) {
            console.log("[PushNotificationRegistrar] Registration skipped", {
                reason: !isLoggedIn ? "not-logged-in" : "missing-auth-token",
            });
            return;
        }

        let cancelled = false;
        dispatch(fetchNotificationsThunk(1));

        // Register for push notifications
        registerForPushNotificationsAsync(token)
            .then((expoPushToken) => {
                if (!cancelled) {
                    console.log("[PushNotificationRegistrar] Registration flow completed", {
                        registered: Boolean(expoPushToken),
                    });
                }
            })
            .catch((error) => {
                if (!cancelled) {
                    console.warn("[PushNotificationRegistrar] Registration flow failed", {
                        message: error.message,
                    });
                }
            });

        // Listen for foreground notifications
        notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
            console.log("[PushNotificationRegistrar] Foreground notification received", {
                title: notification.request.content.title,
                body: notification.request.content.body,
            });

            dispatch(fetchNotificationsThunk(1));
        });

        // Listen for notification tap (app opened from notification)
        responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
            console.log("[PushNotificationRegistrar] Notification tapped", {
                actionIdentifier: response.actionIdentifier,
            });

            const { data } = response.notification.request.content;

            // Navigate to appropriate screen
            if (data) {
                const notificationPayload = {
                    eventKey: data.eventKey,
                    deepLink: data.deepLink,
                    data,
                };
                navigateToNotification(notificationPayload);
            }
        });

        return () => {
            cancelled = true;
            console.log("[PushNotificationRegistrar] Registration effect cleaned up");

            // Clean up listeners
            if (notificationListener.current) {
                try {
                    notificationListener.current.remove();
                } catch (error) {
                    console.warn("[PushNotificationRegistrar] Failed to remove notification listener:", error.message);
                }
            }
            if (responseListener.current) {
                try {
                    responseListener.current.remove();
                } catch (error) {
                    console.warn("[PushNotificationRegistrar] Failed to remove response listener:", error.message);
                }
            }
        };
    }, [isLoggedIn, token, dispatch]);

    return null;
}
