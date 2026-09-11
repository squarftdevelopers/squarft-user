import { Text, View, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Platform, ImageBackground, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useRef, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setOtpDigit, clearOtp, setLoggedIn, clearError, clearAuthInputs , verifyOtpThunk, sendOtpThunk, registerThunk, loginThunk } from "../../store/slices/authSlice";
import { addNotification } from "../../store/slices/notificationSlice";
import { NOTIFICATION_EVENTS } from "../../constants/notificationTypes";

const logo = require("../../assets/icons/app-icon.png");

export default function OtpVerification() {
    const dispatch = useDispatch();
    const { otp, otpFlow, otpToken, mobile, fullName, branchId, loading, error } = useSelector((state) => state.auth);
    const inputs = useRef([]);
    const autoSubmittedRef = useRef(false);

    useEffect(() => {
        dispatch(clearError());
        dispatch(clearAuthInputs());
        autoSubmittedRef.current = false;
        const focusTimeout = setTimeout(() => inputs.current[0]?.focus(), 300);
        return () => clearTimeout(focusTimeout);
    }, [dispatch]);

    const handleChange = (text, index) => {
        const digits = text.replace(/[^0-9]/g, '');

        // Autofill / paste of the full code can land in a single box.
        if (digits.length > 1) {
            digits.slice(0, 6).split('').forEach((d, i) => {
                dispatch(setOtpDigit({ index: i, value: d }));
            });
            const lastFilledIndex = Math.min(digits.length, 6) - 1;
            if (digits.length < 6) {
                inputs.current[lastFilledIndex + 1]?.focus();
            } else {
                Keyboard.dismiss();
            }
            return;
        }

        const digit = digits.slice(-1);
        dispatch(setOtpDigit({ index, value: digit }));
        if (digit && index < 5) {
            inputs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    const handleVerify = useCallback(async () => {
        dispatch(clearError());
        const otpString = otp.join('');
        if (otpString.length !== 6) {
            return;
        }
        const result = await dispatch(verifyOtpThunk({ otp_token: otpToken, otp: otpString }));

        if (!verifyOtpThunk.fulfilled.match(result)) {
            return;
        }

        const verifiedToken = result.payload.verified_token;

        if (otpFlow === 'login') {
            const loginResult = await dispatch(loginThunk({ verified_token: verifiedToken }));
            if (loginThunk.fulfilled.match(loginResult)) {
                dispatch(clearOtp());
                dispatch(setLoggedIn(true));
                router.replace("/(tabs)/home");
            }
            return;
        }

        // otpFlow === 'register'
        const [firstName, ...rest] = fullName.trim().split(/\s+/);
        const lastName = rest.join(' ');
        const registerResult = await dispatch(registerThunk({
            verified_token: verifiedToken,
            first_name: firstName,
            last_name: lastName,
            branch_id: branchId,
        }));

        if (registerThunk.fulfilled.match(registerResult)) {
            dispatch(clearOtp());
            dispatch(addNotification({
                title: 'Welcome to SquarFT',
                description: 'Your account is ready. Explore verified properties, save favourites, and book a site visit.',
                eventKey: NOTIFICATION_EVENTS.USER_WELCOME,
                category: 'success',
                deepLink: '/home',
                data: {
                    user_name: registerResult.payload?.user?.first_name || 'User',
                },
            }));

            dispatch(setLoggedIn(true));
            router.replace("/(tabs)/home");
        }
    }, [otp, otpToken, otpFlow, fullName, branchId, dispatch]);

    // Auto-submit once all 6 digits are present (covers paste + OS autofill).
    useEffect(() => {
        const otpString = otp.join('');
        if (otpString.length === 6 && !loading && !autoSubmittedRef.current) {
            autoSubmittedRef.current = true;
            Keyboard.dismiss();
            handleVerify();
        }
        if (otpString.length < 6) {
            autoSubmittedRef.current = false;
        }
    }, [otp, loading, handleVerify]);

    const handleResend = async () => {
        dispatch(clearError());
        dispatch(clearOtp());
        autoSubmittedRef.current = false;
        await dispatch(sendOtpThunk({ phone: mobile, purpose: otpFlow }));
        inputs.current[0]?.focus();
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
                            <Image source={logo} style={{ width: 110, height: 110, margin: -26,  }} resizeMode="contain" />
                        </View>
                        <Text className="text-white text-[26px] font-manrope-bold mb-5 ">OTP Verification</Text>
                        <Text className="text-white/80 text-[14px] font-lato-regular">OTP has been sent to {mobile}</Text>
                    </ImageBackground>

                    <View className="flex-1 bg-white px-8 pt-10 ">
                        <View className="flex-row justify-center mb-10" style={{ gap: 12 }}>
                            {otp.map((digit, index) => (
                                <TextInput
                                    key={index}
                                    ref={(ref) => (inputs.current[index] = ref)}
                                    value={digit}
                                    onChangeText={(text) => handleChange(text, index)}
                                    onKeyPress={(e) => handleKeyPress(e, index)}
                                    keyboardType="number-pad"
                                    textContentType={index === 0 ? "oneTimeCode" : "none"}
                                    autoComplete={index === 0 ? "sms-otp" : "off"}
                                    importantForAutofill={index === 0 ? "yes" : "no"}
                                    maxLength={index === 0 ? 6 : 1}
                                    style={{
                                        marginTop: 10,
                                        marginBottom: 10,
                                        width: 48, height: 56,
                                        borderWidth: 1,
                                        borderColor: digit ? '#4A43EC' : '#E5E7EB',
                                        borderRadius: 12,
                                        textAlign: 'center',
                                        fontSize: 18,
                                        color: '#000',
                                    }}
                                />
                            ))}
                        </View>

                        {error && (
                            <Text className="text-red-500 text-[13px] mb-4 text-center">{error}</Text>
                        )}

                        <TouchableOpacity 
                            onPress={handleVerify} 
                            disabled={loading}
                            className="bg-[#4A43EC] rounded-2xl py-4 items-center mb-10"
                        >
                            {loading
                                ? <ActivityIndicator color="#fff" />
                                : <Text className="text-white text-[15px] font-semibold">Submit</Text>
                            }
                        </TouchableOpacity>

                        <View className="flex-row justify-center items-center">
                            <Text className="text-gray-500 text-[14px]">Didn&apos;t get the OTP?  </Text>
                            <TouchableOpacity onPress={handleResend} disabled={loading}>
                                <Text className="text-[#4A43EC] text-[14px] font-semibold">Resend OTP</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}
