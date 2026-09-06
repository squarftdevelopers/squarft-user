import { Text, View, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Platform, ScrollView, ImageBackground, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setFullName, setOtpFlow, clearError, setBranch, sendOtpThunk } from "../../store/slices/authSlice";

import { authApi } from "../../services/authApi";

const logo = require("../../assets/icons/app-icon.png");

export default function CompleteLogin() {
    const dispatch = useDispatch();
    const { fullName, mobile, branchId, branchName, loading, error } = useSelector((state) => state.auth);
    const [branches, setBranches] = useState([]);
    const [branchesLoading, setBranchesLoading] = useState(true);
    const [branchesError, setBranchesError] = useState('');
    const [pickerOpen, setPickerOpen] = useState(false);
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        dispatch(clearError());
    }, [dispatch]);

    useEffect(() => {
        let active = true;
        setBranchesLoading(true);
        setBranchesError('');
        authApi.getBranches().then((items) => {
            if (active) setBranches(items);
        }).catch((err) => {
            if (active) setBranchesError(err.message || 'Unable to load branches');
        }).finally(() => {
            if (active) setBranchesLoading(false);
        });
        return () => { active = false; };
    }, [retry]);

    const handleRegister = async () => {
        dispatch(clearError());
        if (loading || !canSubmit) return;
        dispatch(setOtpFlow("register"));
        const result = await dispatch(sendOtpThunk({ phone: mobile, purpose: "register" }));
        if (sendOtpThunk.fulfilled.match(result)) {
            router.push("/otp-verification");
        }
    };

    const canSubmit = fullName.trim().length > 0 && !branchesLoading && !branchesError
        && branches.some((branch) => branch.id === branchId);

    if (!/^\+91\d{10}$/.test(mobile)) return <Redirect href="/login" />;

    return (
        <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
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
                        <Text className="text-white text-[26px] font-manrope-bold mb-5">Complete Login</Text>
                        <Text className="text-white/80 text-[14px]">Add your name and branch to continue</Text>
                        <TouchableOpacity onPress={() => router.replace('/login')} disabled={loading}>
                            <Text className="text-white text-[14px] mt-3 underline">{mobile} · Change number</Text>
                        </TouchableOpacity>
                    </ImageBackground>

                    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 24, paddingTop: 32 }} keyboardShouldPersistTaps="handled">

                        <Text className="text-gray-500 text-[13px] mb-1.5">Full Name</Text>
                        <View className="border border-gray-200 rounded-xl px-4 py-2 mb-5">
                            <TextInput
                                value={fullName}
                                editable={!loading}
                                autoCapitalize="words"
                                onChangeText={(val) => dispatch(setFullName(val))}
                                placeholder="Full Name"
                                placeholderTextColor="#aaa"
                                className="text-[15px] text-black"
                            />
                        </View>

                        <Text className="text-gray-500 text-[13px] mb-1.5">Branch</Text>
                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel="Select Branch"
                            accessibilityState={{ expanded: pickerOpen }}
                            disabled={branchesLoading || loading || !!branchesError}
                            onPress={() => setPickerOpen(!pickerOpen)}
                            className="border border-gray-200 rounded-xl px-4 py-4 mb-3"
                        >
                            <Text className="text-[15px] text-black">{branchesLoading ? 'Loading branches...' : (branchName || 'Select Branch')} ▾</Text>
                        </TouchableOpacity>
                        {branchesError ? (
                            <View className="mb-4">
                                <Text className="text-red-500">{branchesError}</Text>
                                <TouchableOpacity onPress={() => setRetry(retry + 1)}>
                                    <Text className="text-[#4A43EC] py-3">Retry loading branches</Text>
                                </TouchableOpacity>
                            </View>
                        ) : null}
                        {!branchesLoading && !branchesError && branches.length === 0 ? (
                            <View className="mb-4">
                                <Text className="text-gray-500">No branches available. Please try again later.</Text>
                                <TouchableOpacity onPress={() => setRetry(retry + 1)}>
                                    <Text className="text-[#4A43EC] py-3">Refresh branches</Text>
                                </TouchableOpacity>
                            </View>
                        ) : null}
                        {pickerOpen && !branchesLoading && !branchesError ? (
                            <View className="border border-gray-200 rounded-xl mb-5">
                                {branches.map((branch) => {
                                    const label = branch.city ? `${branch.name} — ${branch.city}` : branch.name;
                                    return (
                                        <TouchableOpacity key={branch.id} disabled={loading}
                                            accessibilityRole="radio"
                                            accessibilityState={{ checked: branchId === branch.id }}
                                            onPress={() => {
                                                dispatch(setBranch({ id: branch.id, name: label }));
                                                setPickerOpen(false);
                                            }} className="px-4 py-3 border-b border-gray-100">
                                            <Text className={branchId === branch.id ? 'text-[#4A43EC]' : 'text-gray-800'}>{label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        ) : null}

                        {error && (
                            <Text className="text-red-500 text-[13px] mb-4 text-center">{error}</Text>
                        )}

                        <TouchableOpacity
                            onPress={handleRegister}
                            disabled={loading || !canSubmit}
                            className="bg-[#4A43EC] rounded-2xl py-4 items-center"
                            style={{ opacity: !canSubmit ? 0.5 : 1 }}
                        >
                            {loading
                                ? <ActivityIndicator color="#fff" />
                                : <Text className="text-white text-[16px] font-semibold">Send OTP</Text>
                            }
                        </TouchableOpacity>

                    </ScrollView>
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}
