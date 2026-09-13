import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Stack, useRootNavigationState, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Provider, useDispatch, useSelector } from "react-redux";
import { useFonts } from "expo-font";
import { AppState, Platform } from "react-native";
import * as NavigationBar from "expo-navigation-bar";
import "../global.css";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { FontAwesome, Ionicons, MaterialIcons, MaterialCommunityIcons, AntDesign, Feather, Octicons, FontAwesome6 } from "@expo/vector-icons";
import { registerGlobals } from "@livekit/react-native";

import { Lato_400Regular, Lato_700Bold } from "@expo-google-fonts/lato";
import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from "@expo-google-fonts/inter";
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";
import { PublicSans_400Regular, PublicSans_600SemiBold, PublicSans_700Bold, PublicSans_800ExtraBold } from "@expo-google-fonts/public-sans";
import { store } from "../store/store";
import AppActivityTracker from "../components/AppActivityTracker";
import PushNotificationRegistrar from "../components/PushNotificationRegistrar";
import FilterModal from "../components/FilterModal";
import { hydrateAndCleanTrackers } from "../store/slices/projectViewTrackingSlice";
import { hydrateAndCleanRecentTrackers } from "../store/slices/recentProjectsSlice";
import * as Location from "expo-location";
import { setCoordinates, setLocationPermission } from "../store/slices/locationSlice";
import { hydrateAuthThunk, logoutThunk } from "../store/slices/authSlice";
import { getJwtExpiryMs, isJwtExpired } from "../utils/tokenExpiry";
import AnimatedSplashScreen from "../components/AnimatedSplashScreen";

if (!globalThis.__SQUARFT_LIVEKIT_GLOBALS_REGISTERED__) {
    registerGlobals();
    globalThis.__SQUARFT_LIVEKIT_GLOBALS_REGISTERED__ = true;
}

SplashScreen.preventAutoHideAsync();

function AuthHydrator() {
    const dispatch = useDispatch();
    const authChecked = useSelector((state) => state.auth.authChecked);

    useEffect(() => {
        dispatch(hydrateAuthThunk());
    }, [dispatch]);

    useEffect(() => {
        if (!authChecked) return undefined;

        const timer = setTimeout(() => {
            SplashScreen.hideAsync();
        }, 300);
        return () => clearTimeout(timer);
    }, [authChecked]);

    return null;
}

function SessionExpiryGuard() {
    const dispatch = useDispatch();
    const router = useRouter();
    const token = useSelector((state) => state.auth.token);
    const isLoggedIn = useSelector((state) => state.auth.isLoggedIn);

    useEffect(() => {
        if (!token || !isLoggedIn) return undefined;

        let expiryTimer;
        let signingOut = false;
        const signOutIfExpired = () => {
            if (signingOut || !isJwtExpired(token)) return;
            signingOut = true;
            dispatch(logoutThunk()).finally(() => router.replace("/(auth)/login"));
        };

        const expiresAt = getJwtExpiryMs(token);
        if (expiresAt !== null) {
            const delay = expiresAt - Date.now();
            if (delay <= 0) {
                signOutIfExpired();
            } else {
                // setTimeout cannot schedule values above this limit safely.
                expiryTimer = setTimeout(signOutIfExpired, Math.min(delay, 2147483647));
            }
        }

        const appStateSubscription = AppState.addEventListener("change", (state) => {
            if (state === "active") signOutIfExpired();
        });

        return () => {
            if (expiryTimer) clearTimeout(expiryTimer);
            appStateSubscription.remove();
        };
    }, [dispatch, isLoggedIn, router, token]);

    return null;
}

function ActivityTrackerHydrator() {
    const dispatch = useDispatch();
    const token = useSelector((state) => state.auth.token);

    useEffect(() => {
        dispatch(hydrateAndCleanTrackers());
        dispatch(hydrateAndCleanRecentTrackers());
    }, [dispatch]);

    useEffect(() => {
        // Never trigger the OS location prompt on splash/auth screens.
        if (!token) return undefined;
        let active = true;
        const requestLocation = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (!active) return;
                dispatch(setLocationPermission(status));
                if (status !== 'granted') return;

                const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                if (active) {
                    dispatch(setCoordinates({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    }));
                }
            } catch {
                if (active) dispatch(setLocationPermission('unavailable'));
            }
        };
        requestLocation();
        return () => { active = false; };
    }, [dispatch, token]);

    return null;
}

export default function RootLayout() {
    const rootNavigationState = useRootNavigationState();
    const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);

    const [fontsLoaded] = useFonts({
        ...FontAwesome.font,
        ...Ionicons.font,
        ...MaterialIcons.font,
        ...MaterialCommunityIcons.font,
        ...AntDesign.font,
        ...Feather.font,
        ...Octicons.font,
        ...FontAwesome6.font,
        Lato_400Regular,
        Lato_700Bold,
        Inter_400Regular,
        Inter_600SemiBold,
        Inter_700Bold,
        Inter_800ExtraBold,
        Manrope_400Regular,
        Manrope_500Medium,
        Manrope_600SemiBold,
        Manrope_700Bold,
        Manrope_800ExtraBold,
        PublicSans_400Regular,
        PublicSans_600SemiBold,
        PublicSans_700Bold,
        PublicSans_800ExtraBold,
    });

    useEffect(() => {
        if (Platform.OS !== "android") return;

        NavigationBar.setBackgroundColorAsync("#ffffff").catch(() => { });
        NavigationBar.setButtonStyleAsync("dark").catch(() => { });
    }, []);

    if (!fontsLoaded || !rootNavigationState?.key) return null;

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <StatusBar style="dark" backgroundColor="transparent" translucent={true} />
                <Provider store={store}>
                    <BottomSheetModalProvider>
                        <AuthHydrator />
                        <SessionExpiryGuard />
                        <ActivityTrackerHydrator />
                        <AppActivityTracker />
                        <PushNotificationRegistrar />
                        <FilterModal />
                        <Stack screenOptions={{ gestureEnabled: false }}>
                            <Stack.Screen name="index" options={{ headerShown: false }} />
                            <Stack.Screen name="(auth)" options={{ headerShown: false, animation: "none" }} />
                            <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: "none" }} />
                            <Stack.Screen name="(screens)" options={{ headerShown: false }} />
                        </Stack>
                        {showAnimatedSplash && (
                            <AnimatedSplashScreen onFinish={() => setShowAnimatedSplash(false)} />
                        )}
                    </BottomSheetModalProvider>
                </Provider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}   
