import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";

const SPLASH_DURATION_MS = 650;

export default function Index() {
    const router = useRouter();
    const { isLoggedIn, authChecked } = useSelector((state) => state.auth);

    useEffect(() => {
        if (!authChecked) return undefined;

        const splashTimer = setTimeout(() => {
            router.replace(isLoggedIn ? "/(tabs)/home" : "/(auth)/onboarding1");
        }, SPLASH_DURATION_MS);

        return () => clearTimeout(splashTimer);
    }, [authChecked, isLoggedIn, router]);

    return (
        <View className="flex-1 bg-[#4848FF]">
            <StatusBar hidden />
            <Image
                source={require("../assets/images/splash-mobile.gif")}
                style={StyleSheet.absoluteFill}
                contentFit="contain"
            />
        </View>
    );
}
