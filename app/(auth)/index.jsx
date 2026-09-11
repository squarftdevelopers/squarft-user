import { Stack } from "expo-router";

export default function Auth() {
    return (
        <Stack>
            <Stack.Screen name="onboarding1" options={{ headerTitle: "Onboarding 1" }} />
            <Stack.Screen name="onboarding2" options={{ headerTitle: "Onboarding 2" }} />
            <Stack.Screen name="onboarding3" options={{ headerTitle: "Onboarding 3" }} />
            <Stack.Screen name="onboarding4" options={{ headerTitle: "Onboarding 4" }} />
            <Stack.Screen name="complete-login" options={{ headerTitle: "Complete Login" }} />
            <Stack.Screen name="login" options={{ headerTitle: "Login" }} />
            <Stack.Screen name="otp-verification" options={{ headerTitle: "OTP Verification" }} />
        </Stack>
    );
}