import React, { useState, useMemo } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const FAQS_DATA = [
  {
    id: "1",
    question: "How do I register or log in?",
    answer: "Enter your mobile number, verify the OTP sent to your phone, and complete any required profile details. OTP verification confirms control of your phone number."
  },
  {
    id: "2",
    question: "What does the verified badge mean?",
    answer: "It reflects completion of the configured app verification flow for that listing; it is not a guarantee of a property's legal or investment status. Users are advised to conduct independent due diligence."
  },
  {
    id: "3",
    question: "Where can I find saved or previously viewed properties?",
    answer: "Navigate to 'My Activity' from your profile or bottom navigation to view Saved, Seen, Contacted, and Recent property browsing activity."
  },
  {
    id: "4",
    question: "How do I book a site visit?",
    answer: "Select eligible properties, choose an available date and time slot, and submit the visit request. Final assignment and itinerary scheduling are managed through the visit workflow."
  },
  {
    id: "5",
    question: "Why is an OTP required during a visit?",
    answer: "The buyer OTP verifies the start of the assigned visit before the Sales Officer begins the property tour itinerary. This ensures genuine, authorized attendance."
  },
  {
    id: "6",
    question: "Can I reschedule or cancel a visit?",
    answer: "Where the current visit status permits it, you can use the reschedule or cancel option in your visit details, or contact support to request an updated schedule."
  },
  {
    id: "7",
    question: "Why did a property become unavailable?",
    answer: "Approved inventory can change to hold, booked, sold, or another unavailable state in real-time as authoritative project and developer records update."
  },
  {
    id: "8",
    question: "Where do I see my deal and milestones?",
    answer: "Open 'Deals' to view the permitted Admin-created deal, stage history, shortlisted property units, and associated payment milestones."
  },
  {
    id: "9",
    question: "Does Squar FT collect my property payment?",
    answer: "No. The documented workflow specifies that the buyer pays the Developer / Project / Marketing Agency directly outside Squar FT's collection flow. Squar FT synchronizes status after project-side recording and Admin reconciliation."
  },
  {
    id: "10",
    question: "What if payment status looks wrong?",
    answer: "Raise a payment discrepancy support ticket through Profile > Help & Support with the relevant deal/milestone details and permitted receipt reference."
  },
  {
    id: "11",
    question: "How do I contact human support?",
    answer: "Open Profile > Contact Us / Help & Support and raise a ticket. Note that the in-app AI assistant and human support desk operate as separate channels."
  },
  {
    id: "12",
    question: "How do I request account deletion?",
    answer: "You can request account deletion through the published in-app settings or via email to privacy@squarft.com. Identity verification is required, and certain records may be retained as required by applicable law."
  }
];

export default function FAQsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState({ "1": true });

  const toggleExpand = (id) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return FAQS_DATA;
    const q = searchQuery.toLowerCase();
    return FAQS_DATA.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q)
    );
  }, [searchQuery]);

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
          Frequently Asked Questions
        </Text>
        <View className="w-10" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Search Bar */}
        <View className="px-5 pt-5 pb-2">
          <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 shadow-sm">
            <Ionicons name="search-outline" size={20} color="#9CA3AF" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search questions or keywords..."
              placeholderTextColor="#9CA3AF"
              className="flex-1 ml-2.5 text-sm font-manrope text-gray-900"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Intro Subtitle */}
        <View className="px-5 pt-3 pb-4">
          <Text className="text-xs font-manrope-medium text-gray-500 uppercase tracking-wider">
            User App Help Guide ({filteredFaqs.length} Questions)
          </Text>
        </View>

        {/* FAQ Accordion List */}
        <View className="px-5">
          {filteredFaqs.length === 0 ? (
            <View className="bg-white rounded-2xl p-8 items-center justify-center border border-gray-200 mt-2">
              <Ionicons name="help-circle-outline" size={44} color="#D1D5DB" />
              <Text className="text-base font-manrope-bold text-gray-800 mt-3">
                No questions found
              </Text>
              <Text className="text-xs font-manrope text-gray-500 text-center mt-1">
                Try searching with different keywords or contact our support team.
              </Text>
              <Pressable
                onPress={() => setSearchQuery("")}
                className="mt-4 px-4 py-2 bg-gray-100 rounded-lg"
              >
                <Text className="text-xs font-manrope-semibold text-gray-700">Clear Search</Text>
              </Pressable>
            </View>
          ) : (
            filteredFaqs.map((item, index) => {
              const isExpanded = !!expandedIds[item.id];
              return (
                <View
                  key={item.id}
                  className="bg-white rounded-xl mb-3 border border-gray-200 overflow-hidden shadow-xs"
                >
                  <Pressable
                    onPress={() => toggleExpand(item.id)}
                    className="p-4 flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center flex-1 pr-3">
                      <View className="w-6 h-6 rounded-full bg-emerald-50 items-center justify-center mr-3">
                        <Text className="text-xs font-manrope-bold text-emerald-700">
                          {index + 1}
                        </Text>
                      </View>
                      <Text className="flex-1 text-sm font-manrope-bold text-gray-900 leading-snug">
                        {item.question}
                      </Text>
                    </View>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={18}
                      color="#6B7280"
                    />
                  </Pressable>

                  {isExpanded && (
                    <View className="px-4 pb-4 pt-1 border-t border-gray-100 bg-gray-50/50">
                      <Text className="text-xs font-manrope text-gray-600 leading-relaxed">
                        {item.answer}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Contact Support Footer Card */}
        <View className="mx-5 mt-6 p-5 bg-emerald-50 rounded-2xl border border-emerald-200/60">
          <View className="flex-row items-start">
            <View className="w-10 h-10 rounded-full bg-emerald-100 items-center justify-center mr-3.5">
              <Ionicons name="chatbubbles-outline" size={20} color="#047857" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-manrope-bold text-emerald-900">
                Still have questions?
              </Text>
              <Text className="text-xs font-manrope text-emerald-700 mt-1 leading-relaxed">
                Our support team is available Monday to Saturday to assist you with visit bookings, deals, and inquiries.
              </Text>
              <Pressable
                onPress={() => router.push("/(screens)/contact-us")}
                className="mt-3.5 bg-emerald-600 self-start px-4 py-2 rounded-lg active:opacity-80 flex-row items-center"
              >
                <Text className="text-xs font-manrope-bold text-white mr-1.5">
                  Contact Support
                </Text>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
