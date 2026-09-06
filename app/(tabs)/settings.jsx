import {
    View, Text, TouchableOpacity,
    ScrollView, Switch, Alert, ActivityIndicator, Platform, RefreshControl,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { router, useFocusEffect } from "expo-router";
import { logoutThunk, fetchProfileThunk, updateProfilePictureThunk } from "../../store/slices/authSlice";
import { getProfileDisplay } from "../../services/profileDisplay";
import { AI_BASE_URL } from "../../services/config";
import { ProfileSkeleton } from "../../components/SkeletonLoader";
import UserAvatar from "../../components/UserAvatar";
import {
    authenticateBiometric,
    getBiometricLabel,
    getBiometricLockEnabled,
    isBiometricHardwareAvailable,
    setBiometricLockEnabled,
} from "../../utils/biometricLock";

const cardShadow = {
    shadowColor: "#7a7878ff",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
};

function SectionLabel({ text }) {
    return (
        <Text style={{
            fontSize: 11, fontWeight: '700', color: '#9CA3AF',
            letterSpacing: 1, marginHorizontal: 20,
            marginTop: 24, marginBottom: 8,
        }}>
            {text}
        </Text>
    );
}

function SettingsCard({ children, style }) {
    return (
        <View style={[{
            marginHorizontal: 16,
            backgroundColor: '#ffffffff',
            borderRadius: 16,
            overflow: 'hidden',
            ...cardShadow,
        }, style]}>
            {children}
        </View>
    );
}

function RowDivider() {
    return <View style={{ height: 2, backgroundColor: '#F3F4F6', marginLeft: 20, marginRight: 20 }} />;
}

function SettingsRow({ icon, iconBg, label, sublabel, sublabelColor, right, onPress, isLast }) {
    return (
        <>
            <TouchableOpacity
                onPress={onPress}
                disabled={!onPress}
                accessibilityRole={onPress ? "button" : undefined}
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}
            >
                <View style={{
                    width: 36, height: 36, borderRadius: 10,
                    backgroundColor: iconBg ?? '#EEF2FF',
                    alignItems: 'center', justifyContent: 'center',
                    marginRight: 12,
                }}>
                    {icon}
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>{label}</Text>
                    {sublabel ? (
                        <Text style={{ fontSize: 12, color: sublabelColor ?? '#9CA3AF', marginTop: 1 }}>{sublabel}</Text>
                    ) : null}
                </View>
                {right ?? <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />}
            </TouchableOpacity>
            {!isLast && <RowDivider />}
        </>
    );
}

export default function Settings() {
    const dispatch = useDispatch();
    const [loggingOut, setLoggingOut] = useState(false);
    const [biometricLockOn, setBiometricLockOn] = useState(false);
    const [biometricLabel, setBiometricLabel] = useState("Biometric Lock");
    const [biometricBusy, setBiometricBusy] = useState(false);

    const { profile, user, profileLoading, profileError, isLoggedIn, token, profilePictureLoading } = useSelector((state) => state.auth);

    useFocusEffect(useCallback(() => {
        if (isLoggedIn) dispatch(fetchProfileThunk());
    }, [isLoggedIn, dispatch]));

    useEffect(() => {
        (async () => {
            const [enabled, label] = await Promise.all([
                getBiometricLockEnabled(),
                getBiometricLabel(),
            ]);
            setBiometricLockOn(enabled);
            setBiometricLabel(label);
        })();
    }, []);

    const handleBiometricToggle = async (nextValue) => {
        if (biometricBusy) return;

        if (nextValue) {
            const available = await isBiometricHardwareAvailable();
            if (!available) {
                Alert.alert(
                    "Not available",
                    `${biometricLabel} is not set up on this device. Please enroll it in your device settings first.`
                );
                return;
            }
        }

        setBiometricBusy(true);
        try {
            const confirmed = await authenticateBiometric(
                nextValue ? `Enable ${biometricLabel} lock` : `Disable ${biometricLabel} lock`
            );
            if (!confirmed) return;

            await setBiometricLockEnabled(nextValue);
            setBiometricLockOn(nextValue);
        } catch (error) {
            Alert.alert('Unable to update lock', error?.message || 'Please try again.');
        } finally {
            setBiometricBusy(false);
        }
    };

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Logout', style: 'destructive', onPress: async () => {
                    setLoggingOut(true);
                    try {
                        await dispatch(logoutThunk()).unwrap();
                        router.replace('/(auth)/login');
                    } catch (error) {
                        Alert.alert('Logout failed', typeof error === 'string' ? error : 'Please try again.');
                    } finally {
                        setLoggingOut(false);
                    }
                },
            },
        ]);
    };

    const handleProfilePicturePick = async () => {
        if (profilePictureLoading) return;
        if (!isLoggedIn || !token) {
            Alert.alert("Login required", "Please login before updating your profile photo.");
            return;
        }

        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                Alert.alert("Permission needed", "Allow photo access to update your profile picture.");
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                // The native Android crop screen (UCrop) hides its "Done" button behind
                // the edge-to-edge system bars, so crop manually there instead.
                allowsEditing: Platform.OS === "ios",
                aspect: [1, 1],
                quality: 0.85,
            });

            if (result.canceled) return;

            const asset = result.assets?.[0];
            if (!asset?.uri) return;

            const actions = [];
            if (Platform.OS === 'android' && asset.width && asset.height) {
                const size = Math.min(asset.width, asset.height);
                actions.push({ crop: {
                    originX: Math.round((asset.width - size) / 2),
                    originY: Math.round((asset.height - size) / 2),
                    width: size, height: size,
                } });
            }
            actions.push({ resize: { width: 1024 } });
            // Normalize HEIC/PNG selections and keep multipart metadata consistent.
            const picture = await ImageManipulator.manipulateAsync(asset.uri, actions,
                { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG });
            await dispatch(updateProfilePictureThunk({
                uri: picture.uri, name: 'profile-picture.jpg', type: 'image/jpeg',
            })).unwrap();

            Alert.alert("Profile updated", "Your profile photo has been updated.");
        } catch (error) {
            Alert.alert("Upload failed", (typeof error === "string" ? error : error?.message) || "Please try again.");
        }
    };

    const startCustomerSupportCall = () => {
        const phoneNumber = displayPhone;
        const name = displayName;

        if (!phoneNumber) {
            Alert.alert(
                'Phone number needed',
                'Please complete your profile phone number before starting a support call.'
            );
            return;
        }

        router.push({
            pathname: '/(screens)/voice-agent',
            params: {
                phoneNumber,
                name,
            },
        });
    };

    const display = getProfileDisplay(profile, user);
    const { name: displayName, phone: displayPhone, email: displayEmail, avatar: displayAvatar, branch } = display;

    if (profileLoading && !profile) return <ProfileSkeleton />;

    return (

        <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
            <View
                style={{
                    height: 1,
                    backgroundColor: '#e3dfdfff',
                    width: '100%',
                    marginVertical: 1,
                }}
            />
            <ScrollView
                refreshControl={<RefreshControl refreshing={profileLoading && !!profile} onRefresh={() => dispatch(fetchProfileThunk())} />}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 210 }}
            >

                {profileError ? (
                    <TouchableOpacity onPress={() => dispatch(fetchProfileThunk())} style={{ padding: 16 }}>
                        <Text style={{ color: '#DC2626' }}>{profileError} Tap to retry.</Text>
                    </TouchableOpacity>
                ) : null}
                <View style={{ alignItems: 'center', paddingTop: 30, paddingBottom: 2 }}>
                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={handleProfilePicturePick}
                        disabled={profilePictureLoading}
                        style={{ position: 'relative', marginBottom: 12, borderWidth: 5, borderColor: '#FFFFFF', borderRadius: 50, shadowColor: "#949193ff", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 30, elevation: 16 }}
                    >
                        <UserAvatar
                            uri={displayAvatar}
                            name={displayName}
                            size={80}
                        />
                        <View style={{
                            position: 'absolute', bottom: 0, right: 0,
                            width: 24, height: 24, borderRadius: 12,
                            backgroundColor: '#4A43EC',
                            alignItems: 'center', justifyContent: 'center',
                            borderWidth: 2, borderColor: '#F3F4F6',
                        }}>
                            {profilePictureLoading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Feather name="camera" size={11} color="#fff" />
                            )}
                        </View>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: '#0F172A', marginBottom: 6 }}>
                        {displayName}
                    </Text>
                    {displayEmail ? <Text style={{ fontSize: 13, color: '#64748B' }}>{displayEmail}</Text> : null}
                </View>

                {/* Personal Information */}
                <SectionLabel text="PERSONAL INFORMATION" />
                <SettingsCard>
                    <SettingsRow
                        icon={<Ionicons name="person-outline" size={18} color="#4A43EC" />}
                        label="Full Name"
                        sublabel={displayName}
                        right={<View />}
                    />
                    <SettingsRow
                        icon={<Feather name="phone" size={17} color="#4A43EC" />}
                        label="Phone Number"
                        sublabel={displayPhone || "Not available"}
                        right={<View />}
                    />
                    {branch?.name ? <SettingsRow
                        icon={<Ionicons name="business-outline" size={18} color="#4A43EC" />}
                        label="Branch"
                        sublabel={[branch.name, branch.city].filter(Boolean).join(' — ')}
                        right={<View />}
                    /> : null}
                    <SettingsRow
                        icon={<MaterialCommunityIcons name="fingerprint" size={18} color="#4A43EC" />}
                        label="Biometric Lock"
                        sublabel={biometricLockOn ? `Enabled (${biometricLabel})` : "Disabled"}
                        right={
                            biometricBusy ? (
                                <ActivityIndicator size="small" color="#4A43EC" />
                            ) : (
                                <Switch
                                    value={biometricLockOn}
                                    onValueChange={handleBiometricToggle}
                                    trackColor={{ false: '#E5E7EB', true: '#4A43EC' }}
                                    thumbColor="#fff"
                                />
                            )
                        }
                        isLast
                    />
                </SettingsCard>

                {/* My Activity */}
                <SectionLabel text="MY ACTIVITY" />
                <SettingsCard>
                             
                    <SettingsRow
                        icon={<Ionicons name="heart-outline" size={18} color="#4A43EC" />}
                        label="Saved Properties & Projects"
                        onPress={() => router.push('/(screens)/saved-properties')}
                    />
                    <SettingsRow
                        icon={<MaterialCommunityIcons name="history" size={18} color="#4A43EC" />}
                        label="Recent Searches"
                        onPress={() => router.push('/(screens)/recent-searches')}
                        isLast
                    />
                </SettingsCard>

                {/* App Settings */}
                <SectionLabel text="APP SETTINGS" />
                <SettingsCard>
                    <SettingsRow
                        icon={<Ionicons name="notifications-outline" size={18} color="#475569" />}
                        label="Notifications"
                        onPress={() => router.push("/(screens)/notifications")}
                        isLast
                    />
                </SettingsCard>

                {/* Support */}
                <SectionLabel text="SUPPORT" />
                <SettingsCard>
                    {AI_BASE_URL ? <SettingsRow
                        icon={<Ionicons name="call-outline" size={18} color="#475569" />}
                        label="AI Customer Support"
                        onPress={startCustomerSupportCall}
                    /> : null}
                    <SettingsRow
                        icon={<MaterialCommunityIcons name="email-outline" size={18} color="#475569" />}
                        label="Contact Us"
                        onPress={() => router.push("/(screens)/contact-us")}
                        isLast
                    />
                </SettingsCard>

                {/* Logout */}
                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleLogout}
                    disabled={loggingOut}
                    style={{
                        marginHorizontal: 16, marginTop: 28,
                        backgroundColor: '#1A1A1A',
                        borderRadius: 16, paddingVertical: 16,
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
                    }}
                >
                    <MaterialCommunityIcons name="logout" size={20} color="#fff" />
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>{loggingOut ? "Logging out…" : "Logout"}</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}
