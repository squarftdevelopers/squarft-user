import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#F9FAFB]">
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray-100">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center border border-gray-200"
        >
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </Pressable>
        <Text className="text-lg font-manrope-bold text-gray-900">
          Privacy Policy
        </Text>
        <View className="w-10" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 50 }}
        className="px-5"
      >
        {/* Document Header Card */}
        <View className="bg-white rounded-2xl p-5 border border-gray-200 mt-4 mb-4 shadow-xs">
          <View className="flex-row items-center mb-2">
            <View className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 mr-2">
              <Text className="text-[11px] font-manrope-bold text-emerald-800">
                USER PRIVACY
              </Text>
            </View>
            <Text className="text-xs font-manrope text-gray-500">
              Effective: September 2026
            </Text>
          </View>
          <Text className="text-base font-manrope-bold text-gray-900 leading-snug">
            Squar FT Privacy & Data Protection Policy
          </Text>
          <Text className="text-xs font-manrope text-gray-500 mt-1">
            squarFT by Paxtrade Global Pvt. Ltd.
          </Text>
        </View>

        {/* Highlight Card: App-Specific Information Processed */}
        <View className="bg-blue-50/80 rounded-2xl p-4 border border-blue-200 mb-5">
          <View className="flex-row items-center mb-2">
            <Ionicons name="shield-checkmark" size={18} color="#1D4ED8" />
            <Text className="text-xs font-manrope-bold text-blue-900 ml-1.5 uppercase tracking-wide">
              Buyer Data Scope & Processing
            </Text>
          </View>
          <Text className="text-xs font-manrope text-blue-950 leading-relaxed">
            The User App processes:
          </Text>
          <View className="mt-2 space-y-1">
            <Text className="text-xs font-manrope text-blue-900">
              • Preferred city, location and property preferences
            </Text>
            <Text className="text-xs font-manrope text-blue-900">
              • Searches, filters, saved, seen, contacted and recent activity
            </Text>
            <Text className="text-xs font-manrope text-blue-900">
              • Property enquiries and site visit requests / schedules
            </Text>
            <Text className="text-xs font-manrope text-blue-900">
              • Assigned Sales Officer mapping and Buyer OTP used to start a visit
            </Text>
            <Text className="text-xs font-manrope text-blue-900">
              • Property tour feedback and ratings
            </Text>
            <Text className="text-xs font-manrope text-blue-900">
              • Deal milestones, synchronized receipt records and support tickets
            </Text>
          </View>
          <Text className="text-xs font-manrope text-blue-800 mt-2 font-manrope-medium">
            Registered buyers are linked to a synchronized Client Hub profile.
          </Text>
        </View>

        {/* Section 1 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-3 shadow-xs">
          <Text className="text-sm font-manrope-bold text-gray-900 mb-1.5">
            1. What this Policy Covers
          </Text>
          <Text className="text-xs font-manrope text-gray-600 leading-relaxed">
            This Privacy Policy explains how information is collected, used, shared, secured, retained and handled when you use this Squar FT application and connected workflows. Exact data collected depends on your role, features used, and device permissions granted.
          </Text>
        </View>

        {/* Section 2 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-3 shadow-xs">
          <Text className="text-sm font-manrope-bold text-gray-900 mb-1.5">
            2. Common Data We May Process
          </Text>
          <Text className="text-xs font-manrope text-gray-600 leading-relaxed">
            Common categories include mobile phone number and OTP verification data; name and profile details; device identifier, IP address, session and security logs; app preferences and notification settings; support conversations and attachments; and operational audit logs needed to connect your account with authorized Squar FT services.
          </Text>
        </View>

        {/* Section 3 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-3 shadow-xs">
          <Text className="text-sm font-manrope-bold text-gray-900 mb-1.5">
            3. Why We Use Information
          </Text>
          <Text className="text-xs font-manrope text-gray-600 leading-relaxed">
            We use information to create and secure accounts, authenticate users, deliver requested features, operate property discovery, site visits, and deal workflows, provide customer support, maintain synchronized records, prevent abuse and fraud, enforce permissions, send essential service communications, and comply with applicable laws.
          </Text>
        </View>

        {/* Section 4 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-3 shadow-xs">
          <Text className="text-sm font-manrope-bold text-gray-900 mb-1.5">
            4. Sharing and Internal Access
          </Text>
          <Text className="text-xs font-manrope text-gray-600 leading-relaxed">
            Information may be accessible to authorized Squar FT administrators, support personnel, assigned Sales Officers, and project-side users solely where required for the relevant real estate workflow, subject to strict role-based access controls. Trusted service providers process limited data for hosting, OTP/SMS delivery, push notifications, maps, cloud storage, analytics, and security.
          </Text>
        </View>

        {/* Section 5 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-3 shadow-xs">
          <Text className="text-sm font-manrope-bold text-gray-900 mb-1.5">
            5. Sensitive Data and Security
          </Text>
          <Text className="text-xs font-manrope text-gray-600 leading-relaxed">
            Payment references, contact data, and sensitive operational records are protected with industry-standard encryption, access logging, and role-based restrictions. No automated system or Internet transmission can guarantee absolute security, but we maintain rigorous organizational and technical safeguards.
          </Text>
        </View>

        {/* Section 6 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-3 shadow-xs">
          <Text className="text-sm font-manrope-bold text-gray-900 mb-1.5">
            6. Data Retention
          </Text>
          <Text className="text-xs font-manrope text-gray-600 leading-relaxed">
            Information is retained only as reasonably necessary for the operational purposes described, audit logs, dispute resolution, security requirements, and statutory tax and legal obligations under Indian law.
          </Text>
        </View>

        {/* Section 7 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-3 shadow-xs">
          <Text className="text-sm font-manrope-bold text-gray-900 mb-1.5">
            7. Your Choices and Data Deletion
          </Text>
          <Text className="text-xs font-manrope text-gray-600 leading-relaxed">
            You may request access to, correction of, or deletion of your personal data by emailing privacy@squarft.com or via in-app account closure settings. Certain transaction, audit, and legal compliance records may be retained as mandated by law.
          </Text>
        </View>

        {/* Section 8 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-3 shadow-xs">
          <Text className="text-sm font-manrope-bold text-gray-900 mb-1.5">
            8. Device Permissions
          </Text>
          <View className="space-y-1.5 mt-1">
            <Text className="text-xs font-manrope text-gray-600">
              • <Text className="font-manrope-semibold text-gray-800">Location:</Text> Used for property mapping, nearby project discovery, and visit routing.
            </Text>
            <Text className="text-xs font-manrope text-gray-600">
              • <Text className="font-manrope-semibold text-gray-800">Camera / Media:</Text> Used when uploading profile photos or support ticket attachments.
            </Text>
            <Text className="text-xs font-manrope text-gray-600">
              • <Text className="font-manrope-semibold text-gray-800">Notifications:</Text> Used for real-time visit updates, OTPs, and deal milestones.
            </Text>
          </View>
        </View>

        {/* Section 9 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-3 shadow-xs">
          <Text className="text-sm font-manrope-bold text-gray-900 mb-1.5">
            9. Children's Privacy
          </Text>
          <Text className="text-xs font-manrope text-gray-600 leading-relaxed">
            These applications are not designed for children to independently conduct real-estate transactions or workflows. We do not knowingly collect personal data from individuals under 18 years of age.
          </Text>
        </View>

        {/* Section 10 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-4 shadow-xs">
          <Text className="text-sm font-manrope-bold text-gray-900 mb-1.5">
            10. Grievance Officer & Contact
          </Text>
          <Text className="text-xs font-manrope text-gray-600 leading-relaxed">
            In accordance with the Information Technology Act, 2000 and Digital Personal Data Protection laws of India, you may direct any privacy questions or grievances to:
          </Text>
          <Text className="text-xs font-manrope-semibold text-gray-800 mt-2">
            Grievance Officer: Squar FT Privacy Team
          </Text>
          <Text className="text-xs font-manrope text-gray-600">
            Email: privacy@squarft.com
          </Text>
          <Text className="text-xs font-manrope text-gray-600">
            Address: 214/Sadhguru Pariyan , Vijay nagar, Indore
          </Text>
        </View>

        {/* Footer Navigation */}
        <View className="flex-row items-center justify-between p-4 bg-gray-100 rounded-xl mt-2">
          <Pressable
            onPress={() => router.push("/(screens)/terms-and-conditions")}
            className="flex-row items-center"
          >
            <Text className="text-xs font-manrope-bold text-emerald-700 mr-1">
              Terms & Conditions
            </Text>
            <Ionicons name="arrow-forward" size={14} color="#047857" />
          </Pressable>
          <Pressable
            onPress={() => router.push("/(screens)/faqs")}
            className="flex-row items-center"
          >
            <Text className="text-xs font-manrope-bold text-gray-700 mr-1">
              View FAQs
            </Text>
            <Ionicons name="chevron-forward" size={14} color="#4B5563" />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
