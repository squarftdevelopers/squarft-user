import { Stack } from "expo-router";

export default function AuthLayout() {
    return (
        <Stack screenOptions={{ headerShown: false, animation: "none" }}>
            <Stack.Screen name="onboarding1" />
            <Stack.Screen name="onboarding2" />
            <Stack.Screen name="onboarding3" />
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="complete-login" />
            <Stack.Screen name="forgot-password" />
            <Stack.Screen name="change-password" />
            <Stack.Screen name="otp-verification" />
        </Stack>
    );
}
