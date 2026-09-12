import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function TermsAndConditionsScreen() {
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
          Terms & Conditions
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
                USER APP
              </Text>
            </View>
            <Text className="text-xs font-manrope text-gray-500">
              Effective: September 2026
            </Text>
          </View>
          <Text className="text-base font-manrope-bold text-gray-900 leading-snug">
            Squar FT Platform Terms of Service
          </Text>
          <Text className="text-xs font-manrope text-gray-500 mt-1">
            Operated by squarFT by Paxtrade Global Pvt. Ltd.
          </Text>
        </View>

        {/* App-Specific Critical Notice Callout */}
        <View className="bg-amber-50 rounded-2xl p-4 border border-amber-200/80 mb-5">
          <View className="flex-row items-center mb-2">
            <Ionicons name="information-circle" size={18} color="#B45309" />
            <Text className="text-xs font-manrope-bold text-amber-900 ml-1.5 uppercase tracking-wide">
              Important Buyer Notice
            </Text>
          </View>
          <Text className="text-xs font-manrope text-amber-900 leading-relaxed">
            Property availability, price, project information and unit status can change. Booking a visit does not reserve or purchase a property. Deals are created through authorized Admin workflows.
          </Text>
          <Text className="text-xs font-manrope text-amber-900 leading-relaxed mt-2 font-manrope-semibold">
            Payments: Buyer payments are made directly to the Developer / Project / Marketing Agency outside Squar FT's collection flow. Synchronized status is displayed following project-side recording and Admin reconciliation.
          </Text>
        </View>

        {/* Section 1 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-3 shadow-xs">
          <Text className="text-sm font-manrope-bold text-gray-900 mb-1.5">
            1. Acceptance and Scope
          </Text>
          <Text className="text-xs font-manrope text-gray-600 leading-relaxed">
            These Terms govern access to and use of this Squar FT application. By registering, logging in or using the app, you agree to these Terms and the Privacy Policy. The app is part of the connected Squar FT operating system, and permitted records may synchronize with Admin, support, project, visit, deal, payment or other linked modules as required for the workflow.
          </Text>
        </View>

        {/* Section 2 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-3 shadow-xs">
          <Text className="text-sm font-manrope-bold text-gray-900 mb-1.5">
            2. Eligibility and Account Security
          </Text>
          <Text className="text-xs font-manrope text-gray-600 leading-relaxed">
            You must provide accurate information, use a mobile number you are authorized to use, keep OTPs and account access confidential, and promptly report suspected unauthorized use. OTP verification confirms control of a mobile number; it does not by itself guarantee identity, ownership, authority, project approval, payment status or transaction completion.
          </Text>
        </View>

        {/* Section 3 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-3 shadow-xs">
          <Text className="text-sm font-manrope-bold text-gray-900 mb-1.5">
            3. Accurate Information and Documents
          </Text>
          <Text className="text-xs font-manrope text-gray-600 leading-relaxed">
            Information, documents, photographs, property/project details, KYC records, payment references, feedback and other submissions must be accurate and lawfully provided. Do not impersonate another person, upload forged or misleading documents, submit content without authority, or misuse another person's personal information.
          </Text>
        </View>

        {/* Section 4 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-3 shadow-xs">
          <Text className="text-sm font-manrope-bold text-gray-900 mb-1.5">
            4. Platform Records and Approvals
          </Text>
          <Text className="text-xs font-manrope text-gray-600 leading-relaxed">
            Some records are subject to verification, correction, approval, rejection, suspension or administrative review. A draft, submission, recommendation, displayed status or notification is not a substitute for legal, financial, technical, title, RERA, regulatory or professional due diligence.
          </Text>
        </View>

        {/* Section 5 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-3 shadow-xs">
          <Text className="text-sm font-manrope-bold text-gray-900 mb-1.5">
            5. Acceptable Use
          </Text>
          <Text className="text-xs font-manrope text-gray-600 leading-relaxed">
            Do not attempt unauthorized access, bypass role/branch restrictions, interfere with security controls, scrape protected data at scale, send spam, introduce malicious code, manipulate operational records, or use the service for unlawful, fraudulent, abusive or misleading activity.
          </Text>
        </View>

        {/* Section 6 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-3 shadow-xs">
          <Text className="text-sm font-manrope-bold text-gray-900 mb-1.5">
            6. Third-Party Services
          </Text>
          <Text className="text-xs font-manrope text-gray-600 leading-relaxed">
            The app may rely on maps, OTP/SMS gateways, push notifications, cloud storage, device permissions, external calling or banking/payment references. Independent third-party services may have their own terms and availability.
          </Text>
        </View>

        {/* Section 7 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-3 shadow-xs">
          <Text className="text-sm font-manrope-bold text-gray-900 mb-1.5">
            7. Availability and Changes
          </Text>
          <Text className="text-xs font-manrope text-gray-600 leading-relaxed">
            Features may be updated, suspended, limited or discontinued for maintenance, security, legal, operational or product reasons. Terms and policies may be revised; the current effective version is always accessible in-app and on the official website.
          </Text>
        </View>

        {/* Section 8 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-3 shadow-xs">
          <Text className="text-sm font-manrope-bold text-gray-900 mb-1.5">
            8. Suspension and Termination
          </Text>
          <Text className="text-xs font-manrope text-gray-600 leading-relaxed">
            Access may be restricted for security risk, policy breach, invalid/rejected KYC, misuse, fraud indicators, unauthorized activity, legal requirements or operational reasons. Logout revokes the current active session; account closure/deletion is handled through a separate process.
          </Text>
        </View>

        {/* Section 9 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-3 shadow-xs">
          <Text className="text-sm font-manrope-bold text-gray-900 mb-1.5">
            9. Intellectual Property
          </Text>
          <Text className="text-xs font-manrope text-gray-600 leading-relaxed">
            The app, brand, interfaces, software, workflows, text, graphics and platform content are owned by or licensed to squarFT by Paxtrade Global Pvt. Ltd., except user-provided content and third-party materials.
          </Text>
        </View>

        {/* Section 10 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-4 shadow-xs">
          <Text className="text-sm font-manrope-bold text-gray-900 mb-1.5">
            10. Applicable Law & Dispute Resolution
          </Text>
          <Text className="text-xs font-manrope text-gray-600 leading-relaxed">
            These Terms are governed by the applicable laws of India. Mandatory statutory consumer rights remain unaffected. Any disputes shall be subject to the exclusive jurisdiction of the competent courts in Indore, Madhya Pradesh, India.
          </Text>
        </View>

        {/* Footer Navigation */}
        <View className="flex-row items-center justify-between p-4 bg-gray-100 rounded-xl mt-2">
          <Pressable
            onPress={() => router.push("/(screens)/privacy-policy")}
            className="flex-row items-center"
          >
            <Text className="text-xs font-manrope-bold text-emerald-700 mr-1">
              Privacy Policy
            </Text>
            <Ionicons name="arrow-forward" size={14} color="#047857" />
          </Pressable>
          <Pressable
            onPress={() => router.push("/(screens)/contact-us")}
            className="flex-row items-center"
          >
            <Text className="text-xs font-manrope-bold text-gray-700 mr-1">
              Contact Support
            </Text>
            <Ionicons name="chevron-forward" size={14} color="#4B5563" />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
