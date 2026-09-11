import { Text, View, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Platform, ScrollView, ImageBackground, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { clearError, clearAuthInputs , startLoginThunk } from "../../store/slices/authSlice";
const logo = require("../../assets/icons/app-icon.png");

const COUNTRY_CODE = "+91";

export default function Login() {
    const dispatch = useDispatch();
    const { loading, error } = useSelector((state) => state.auth);
    const [localNumber, setLocalNumber] = useState('');

    useEffect(() => {
        dispatch(clearError());
        dispatch(clearAuthInputs());
    }, [dispatch]);

    const handleSendOtp = async () => {
        dispatch(clearError());
        const phone = `${COUNTRY_CODE}${localNumber}`;
        if (loading || localNumber.length !== 10) return;
        const result = await dispatch(startLoginThunk({ phone }));
        if (startLoginThunk.fulfilled.match(result)) {
            router.push(result.payload.needsRegistration ? '/complete-login' : '/otp-verification');
        }
    };

    return (
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View className="flex-1">
                    <StatusBar style="light" />
                    <ImageBackground
                        source={require('../../assets/images/auth_grid_bg.png')}
                        style={{ paddingTop: 64, paddingBottom: 40, paddingHorizontal: 24, backgroundColor: '#4A43EC' }}
                        resizeMode="cover"
                    >
                        <View style={{ width: 60, height: 60, overflow: 'hidden', marginBottom: 1 }}>
                            <Image source={logo} style={{ width: 110, height: 110, margin: -26, }} resizeMode="contain" />
                        </View>
                        <Text className="text-white text-[26px] font-manrope-bold mb-5">Login</Text>
                        <Text className="text-white/80 text-[14px]">Enter your phone number to continue</Text>
                    </ImageBackground>

                    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 24, paddingTop: 32 }} keyboardShouldPersistTaps="handled">

                        <Text className="text-gray-500 text-[13px] mb-1.5">Phone Number</Text>
                        <View className="border border-gray-200 rounded-xl px-4 py-2 mb-5 flex-row items-center">
                            <Text className="text-[15px] text-black font-lato-bold mr-2">{COUNTRY_CODE}</Text>
                            <View className="w-[1px] h-5 bg-gray-200 mr-2" />
                            <TextInput
                                value={localNumber}
                                onChangeText={(val) => setLocalNumber(val.replace(/[^0-9]/g, '').slice(0, 10))}
                                placeholder="Phone Number"
                                placeholderTextColor="#aaa"
                                keyboardType="phone-pad"
                                maxLength={10}
                                className="flex-1 text-[15px] text-black"
                            />
                        </View>

                        {error && (
                            <Text className="text-red-500 text-[13px] mb-4 text-center">{error}</Text>
                        )}

                        <TouchableOpacity
                            onPress={handleSendOtp}
                            disabled={loading || localNumber.length !== 10}
                            className="bg-[#4A43EC] rounded-2xl py-4 items-center mb-8"
                            style={{ opacity: localNumber.length !== 10 ? 0.5 : 1 }}
                        >
                            {loading
                                ? <ActivityIndicator color="#fff" />
                                : <Text className="text-white text-[16px] font-lato-bold">Continue</Text>
                            }
                        </TouchableOpacity>

                        <View className="items-center justify-center pt-2 pb-4">
                            <Text className="text-center text-xs text-gray-400 font-lato leading-5">
                                By continuing, you agree to our{"\n"}
                                <Text
                                    onPress={() => router.push({ pathname: "/(screens)/coming-soon", params: { title: "Terms & Conditions" } })}
                                    className="font-bold text-[#4A43EC]"
                                >
                                    Terms & Conditions
                                </Text>
                                {" "}and{" "}
                                <Text
                                    onPress={() => router.push({ pathname: "/(screens)/coming-soon", params: { title: "Privacy Policy" } })}
                                    className="font-bold text-[#4A43EC]"
                                >
                                    Privacy Policy
                                </Text>
                            </Text>
                        </View>

                    </ScrollView>
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}
