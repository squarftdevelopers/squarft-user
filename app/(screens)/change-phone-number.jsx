import React, { useState } from "react";
import { View, Text, Pressable, TextInput, Alert, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSelector, useDispatch } from "react-redux";
import { router } from "expo-router";
import { fetchProfileThunk } from "../../store/slices/authSlice";
import { profileApi } from "../../services/profileApi";

export default function ChangePhoneNumber() {
    const dispatch = useDispatch();
    const { profile, token, verifiedToken } = useSelector((state) => state.auth);
    const currentPhone = profile?.user?.phone || "";
    
    const [newPhone, setNewPhone] = useState("");
    const [loading, setLoading] = useState(false);

    const handleCompleteChange = async () => {
        if (!newPhone.trim()) {
            Alert.alert('Error', 'Please enter a new phone number');
            return;
        }

        if (newPhone === currentPhone) {
            Alert.alert('Error', 'New phone number must be different from current number');
            return;
        }

        if (!/^\d{10}$/.test(newPhone)) {
            Alert.alert('Error', 'Please enter a valid 10-digit phone number');
            return;
        }

        try {
            setLoading(true);
            await profileApi.updatePhoneNumber(token, verifiedToken, newPhone);
            
            // Refresh profile data
            await dispatch(fetchProfileThunk()).unwrap();
            
            Alert.alert(
                'Success',
                'Phone number updated successfully',
                [
                    {
                        text: 'OK',
                        onPress: () => router.push('/(tabs)/settings')
                    }
                ]
            );
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to update phone number');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-white">
            {/* Header */}
            <View className="pt-14 pb-4 px-5 bg-white border-b border-gray-100">
                <View className="flex-row items-center">
                    <Pressable onPress={() => router.back()} className="mr-3">
                        <Feather name="arrow-left" size={24} color="#111827" />
                    </Pressable>
                    <Text className="text-xl font-manrope-bold text-gray-900">Change Phone Number</Text>
                </View>
            </View>

            {/* Content */}
            <View className="flex-1 px-5 pt-8">
                <View className="items-center mb-8">
                    <View className="w-16 h-16 bg-[#10B981] rounded-full items-center justify-center mb-4">
                        <Feather name="check" size={28} color="#fff" />
                    </View>
                    <Text className="text-2xl font-manrope-bold text-gray-900 mb-2">Verified!</Text>
                    <Text className="text-sm text-gray-500 font-manrope text-center">
                        Enter your new phone number below
                    </Text>
                </View>

                {/* Current Phone */}
                <View className="mb-6">
                    <Text className="text-sm font-manrope-bold text-gray-700 mb-2">Current Phone Number</Text>
                    <View className="bg-gray-50 rounded-xl px-4 py-4 border border-gray-200">
                        <Text className="text-base font-manrope text-gray-500">{currentPhone}</Text>
                    </View>
                </View>

                {/* New Phone Input */}
                <View className="mb-8">
                    <Text className="text-sm font-manrope-bold text-gray-700 mb-2">New Phone Number</Text>
                    <View className="flex-row items-center bg-white rounded-xl px-4 py-4 border-2 border-gray-200">
                        <Text className="text-base font-manrope text-gray-500 mr-2">+91</Text>
                        <TextInput
                            value={newPhone}
                            onChangeText={setNewPhone}
                            placeholder="eg. 7867986757"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="phone-pad"
                            maxLength={10}
                            className="flex-1 text-base font-manrope text-gray-900"
                        />
                    </View>
                    <Text className="text-xs text-gray-500 font-manrope mt-2">
                        Enter 10-digit mobile number without country code
                    </Text>
                </View>

                <View className="bg-[#FEF3C7] rounded-xl p-4 mb-6">
                    <View className="flex-row items-start">
                        <Feather name="alert-circle" size={16} color="#F59E0B" style={{ marginTop: 2, marginRight: 8 }} />
                        <Text className="flex-1 text-sm text-[#92400E] font-manrope">
                            Make sure you have access to this number. You'll need it to log in to your account.
                        </Text>
                    </View>
                </View>

                {/* Complete Button */}
                <Pressable
                    onPress={handleCompleteChange}
                    disabled={loading || !newPhone.trim()}
                    className="bg-[#4A43EC] rounded-xl py-4 items-center"
                    style={{ opacity: loading || !newPhone.trim() ? 0.5 : 1 }}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text className="text-white font-manrope-bold text-base">Complete Change</Text>
                    )}
                </Pressable>
            </View>
        </View>
    );
}
