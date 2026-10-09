import { View, Text, Pressable, Platform, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { StatusBar } from "expo-status-bar";
import SuccessCheck from "../../components/SuccessCheck";
import { maskProjectName } from "../../services/projectDisplay";

export default function BookingStatus() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { date, time, propertyName: paramPropertyName, propertyId: paramPropertyId, bookingIds } = useLocalSearchParams();
  const upcomingVisits = useSelector((state) => state.properties.upcomingSiteVisits);

  const bookedIds = bookingIds ? bookingIds.split(",") : [];
  const bookedProperties = bookedIds.length > 0
    ? bookedIds.map((id) => upcomingVisits?.find(v => String(v.id) === id)).filter(Boolean)
    : [];

  const fallbackProperty = upcomingVisits?.find(v => v.projectId === paramPropertyId);
  // Fall back to a single synthetic entry when redux hasn't caught up yet (older links, etc.)
  const properties = bookedProperties.length > 0
    ? bookedProperties
    : [{
        title: paramPropertyName || fallbackProperty?.title || "Property",
        projectId: paramPropertyId,
        bookingId: fallbackProperty?.bookingId,
      }];

  const propertyName = properties.length === 1 ? properties[0].title : `${properties.length} properties`;
  const displayPropertyName = (property) => maskProjectName(property.title || property.name) || "Property";

  const formattedDate = date
    ? new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : "October 24, 2023";

  const displayTime = time || "10:00 AM - 12:00 PM";
  const getBookingIdLabel = (property) =>
    property.bookingId
      ? `#${property.bookingId}`
      : property.projectId
        ? `#SQFT-${property.projectId.toString().padStart(5, '0')}`
        : "#SQFT-88291";

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      {/* Header */}
      <View style={{ paddingTop: Platform.OS === "ios" ? insets.top : 40, backgroundColor: "white" }}>
        <View className="flex-row items-center justify-between px-6 py-2 bg-white">
          <Pressable
            onPress={() => router.replace('/home')}
            className="w-10 h-10 justify-center"
          >
            <Feather name="x" size={24} color="#111827" />
          </Pressable>

          <Text className="text-[16px] font-manrope-bold text-[#111827]">
            Booking Status
          </Text>

          <View className="w-10 h-10" />
        </View>
      </View>

      <ScrollView
        className="flex-1 bg-white px-6"
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Icon */}
        <View className="items-center mb-8 mt-2">
          <SuccessCheck />
        </View>

        {/* Messaging */}
        <Text className="text-center text-[20px] font-manrope-extrabold text-[#111827] mb-8">
          Booking Successful
        </Text>
        <Text className="text-center text-[13px] font-manrope-medium text-[#6B7280] leading-[18px] mb-10">
          Your reservation at {maskProjectName(propertyName)} has been confirmed.{"\n"}A confirmation email is on its way.
        </Text>

        {/* Property Card(s) */}
        {properties.map((property, index) => (
          <View
            key={property.id || property.projectId || index}
            className="bg-white rounded-[18px] border border-gray-100 shadow-sm overflow-hidden mb-5"
          >
            <View className="p-4">
              <View className="flex-row justify-between items-start mb-1.5">
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-9 h-9 rounded-full bg-[#F1EFFF] items-center justify-center mr-3">
                    <Text className="text-[#4A43EC] text-[12px] font-manrope-extrabold">{index + 1}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-[10px] font-manrope-bold text-[#9CA3AF] uppercase tracking-[1px] mb-0.5">
                      Property {index + 1}
                    </Text>
                    <Text className="text-[15px] font-manrope-extrabold text-[#111827]" numberOfLines={1}>
                      {displayPropertyName(property)}
                    </Text>
                  </View>
                </View>
                <View className="bg-[#EEEBFF] px-2.5 py-[3px] rounded-full">
                  <Text className="text-[#4A43EC] text-[9px] font-manrope-bold uppercase">
                    CONFIRMED
                  </Text>
                </View>
              </View>

              <Text className="text-[#4A43EC] text-[11px] font-manrope-medium mb-4">
                Booking ID: {getBookingIdLabel(property)}
              </Text>

              <View className="h-[1px] bg-gray-50 mb-4" />

              <View className="flex-row justify-between items-center mb-3">
                <View className="flex-row items-center">
                  <Feather name="calendar" size={13} color="#9CA3AF" />
                  <Text className="text-[12px] font-manrope-medium text-[#6B7280] ml-2">Date</Text>
                </View>
                <Text className="text-[12px] font-manrope-bold text-[#111827]">{formattedDate}</Text>
              </View>

              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center">
                  <Feather name="clock" size={13} color="#9CA3AF" />
                  <Text className="text-[12px] font-manrope-medium text-[#6B7280] ml-2">Time</Text>
                </View>
                <Text className="text-[12px] font-manrope-bold text-[#111827]">
                  {property.dateFull ? property.dateFull.split('·')[1]?.trim() || displayTime : displayTime}
                </Text>
              </View>
            </View>
          </View>
        ))}

        {/* Action Buttons */}
        <View className="gap-2.5 pb-8">
          
          <Pressable
            onPress={() => router.replace('/(tabs)/home')}
            className="bg-[#F1F5F9] rounded-[14px] py-[14px] items-center justify-center"
          >
            <Text className="text-[#111827] font-manrope-bold text-[14px]">Back to Home</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
