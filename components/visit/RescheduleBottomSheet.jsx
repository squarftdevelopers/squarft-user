import ProgressiveImage from "../ProgressiveImage";
import React, { useMemo, useCallback, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useDispatch } from "react-redux";
import { addSiteVisit, cancelUpcomingVisit } from "../../store/slices/propertiesSlice";
import { updateSiteVisitThunk } from "../../store/slices/visitSlice";
import ConfirmationModal from "../ConfirmationModal";

const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));

const formatVisitTime = (visitData) => {
  if (visitData?.isoDate) {
    return new Date(visitData.isoDate).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
  if (visitData?.dateFull?.includes("·")) return visitData.dateFull.split("·")[1].trim();
  if (visitData?.dateFull?.includes("|")) return visitData.dateFull.split("|")[1].trim();
  return "10:00 AM";
};

const formatVisitDateKey = (visitData) =>
  visitData?.isoDate ? new Date(visitData.isoDate).toISOString().split("T")[0] : undefined;

const RescheduleBottomSheet = React.forwardRef(({ visitData, onReschedule, onViewMap, isOpeningMap = false }, ref) => {
  const snapPoints = useMemo(() => ["75%"], []);

  const dispatch = useDispatch();

  const closeModal = useCallback(() => {
    ref?.current?.dismiss();
  }, [ref]);

  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancelVisit = useCallback(() => {
    setIsCancelModalVisible(true);
  }, []);

  const confirmCancel = useCallback(async () => {
    if (visitData?.id) {
      setIsCancelling(true);
      if (visitData.isApiVisit && isUuid(visitData.id)) {
        try {
          await dispatch(updateSiteVisitThunk({
            visitId: visitData.id,
            updateData: { status: "cancelled" },
          })).unwrap();
        } catch (error) {
          console.log("Failed to cancel visit:", error);
        }
      }
      dispatch(cancelUpcomingVisit(visitData.id));
      setIsCancelling(false);
      setIsCancelModalVisible(false);
      closeModal();
    }
  }, [visitData, dispatch, closeModal]);

  const handleReschedule = useCallback(() => {
    if (visitData) {
      dispatch(addSiteVisit({
        ...visitData,
        id: visitData.projectId || visitData.id.replace(/_reschedule_.*/, ""),
        propertyIds: visitData.propertyIds || [],
      }));
      closeModal();
      
      const parsedTime = formatVisitTime(visitData);

      onReschedule?.({
        selectedIds: visitData.projectId || visitData.id.replace(/_reschedule_.*/, ""),
        initialDate: formatVisitDateKey(visitData),
        initialTime: parsedTime,
        initialVisitors: visitData.visitors?.toString() || "1",
        initialNotes: visitData.notes || "",
        rescheduleVisitId: visitData.isApiVisit && isUuid(visitData.id) ? visitData.id : undefined,
      });
    }
  }, [visitData, dispatch, onReschedule, closeModal]);

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} />
    ),
    []
  );

  const imageSource = visitData?.image || null;

  const parsedDate = visitData?.isoDate ? new Date(visitData.isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "";
  const parsedTime = formatVisitTime(visitData);
  const displayDate = parsedDate ? `${parsedDate} • ${parsedTime}` : visitData?.dateFull || "Oct 24, 2023 • 10:00 AM";

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: "#E5E7EB", width: 40, height: 4 }}
      backgroundStyle={{ backgroundColor: 'white', borderRadius: 24 }}
    >
      <View className="bg-white rounded-t-[24px] overflow-hidden flex-1">
        <View className="pb-3 px-5 relative mt-1">
          <View className="flex-row items-center justify-center">
            <Pressable onPress={closeModal} className="absolute left-0">
              <Feather name="x" size={20} color="#4B5563" />
            </Pressable>
            <Text className="text-[15px] font-manrope-extrabold text-[#111827]">
              Edit Visit
            </Text>
          </View>
        </View>
        <View className="w-full h-[1px] bg-gray-100" />
        
        <BottomSheetScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
            <View className="px-5 py-4">
                  <View className="border border-gray-100 rounded-[12px] overflow-hidden mb-3 bg-white">
                    <ProgressiveImage 
                      source={imageSource} 
                      className="w-full h-[90px]" 
                      resizeMode="cover" 
                    />
                    <View className="p-3">
                      <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-[14px] font-manrope-extrabold text-[#111827]">
                          {visitData?.title || "The Grand Atrium"}
                        </Text>
                        <View className="bg-[#EEECFF] px-[8px] py-[3px] rounded-full">
                          <Text className="text-[#4A43EC] text-[8px] font-manrope-extrabold tracking-widest uppercase">
                            {visitData?.status || "CONFIRMED"}
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row items-center mb-1.5">
                        <Feather name="calendar" size={12} color="#6B7280" />
                        <Text className="text-[12px] text-[#4B5563] font-manrope ml-2">
                          {displayDate}
                        </Text>
                      </View>
                      <View className="flex-row items-center mb-3">
                        <Feather name="map-pin" size={12} color="#6B7280" />
                        <Text className="text-[12px] text-[#4B5563] font-manrope ml-2">
                          {visitData?.location || "452 Luxury Way, Penthouse Suite"}
                        </Text>
                      </View>
                      <Pressable
                        className={`bg-[#5A50ED] rounded-[8px] py-2.5 flex-row items-center justify-center ${isOpeningMap ? "opacity-80" : ""}`}
                        disabled={isOpeningMap}
                        onPress={() => visitData && onViewMap?.(visitData)}
                      >
                        {isOpeningMap ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Feather name="map" size={12} color="white" />
                        )}
                        <Text className="text-white text-[12px] font-manrope-extrabold ml-1.5">
                          {isOpeningMap ? "Opening..." : "View on Map"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  <View className="border border-gray-100 rounded-[12px] px-3 py-1 mb-3 bg-white">
                    <View className="flex-row justify-between items-center py-2.5 border-b border-gray-50">
                      <Text className="text-[10px] text-[#9CA3AF] font-manrope-extrabold tracking-[1px] uppercase">
                        BOOKING ID
                      </Text>
                      <Text className="text-[12px] font-manrope-extrabold text-[#111827]">
                        {visitData?.bookingId}
                      </Text>
                    </View>
                    <View className="flex-row justify-between items-center py-2.5 border-b border-gray-50">
                      <Text className="text-[10px] text-[#9CA3AF] font-manrope-extrabold tracking-[1px] uppercase">
                        VISITOR
                      </Text>
                      <Text className="text-[12px] font-manrope-extrabold text-[#111827]">
                        {visitData?.visitorName}
                      </Text>
                    </View>
                    <View className="flex-row justify-between items-center py-2.5">
                      <Text className="text-[10px] text-[#9CA3AF] font-manrope-extrabold tracking-[1px] uppercase">
                        DURATION
                      </Text>
                      <Text className="text-[12px] font-manrope-extrabold text-[#111827] text-right">
                        {visitData?.duration}
                      </Text>
                    </View>
                  </View>

                  <Pressable 
                    className="bg-[#111827] rounded-[10px] py-3 flex-row items-center justify-center mb-2"
                    onPress={handleReschedule}
                  >
                    <Feather name="calendar" size={16} color="white" />
                    <Text className="text-white font-manrope-extrabold text-[13px] ml-2">
                      Reschedule Visit
                    </Text>
                  </Pressable>

                  <Pressable 
                    className="bg-[#FFF1F2] rounded-[10px] py-3 flex-row items-center justify-center mb-4"
                    onPress={handleCancelVisit}
                  >
                    <Feather name="x-circle" size={16} color="#EF4444" />
                    <Text className="text-[#EF4444] font-manrope-extrabold text-[13px] ml-2">
                      Cancel Visit
                    </Text>
                  </Pressable>

                  <View className="flex-row justify-center items-center">
                    <Feather name="info" size={12} color="#9CA3AF" />
                    <Text className="text-[#6B7280] font-manrope text-[11px] ml-1.5">
                      Need help? <Text className="text-[#4A43EC]" style={{ textDecorationLine: 'underline' }}>Contact Support</Text>
                    </Text>
                  </View>
            </View>
        </BottomSheetScrollView>
      </View>

      <ConfirmationModal
        visible={isCancelModalVisible}
        onClose={() => setIsCancelModalVisible(false)}
        onConfirm={confirmCancel}
        title="Cancel Site Visit?"
        message="Are you sure you want to cancel this site visit? This action cannot be undone."
        cancelText="No, Keep it"
        confirmText={isCancelling ? "Cancelling..." : "Yes, Cancel"}
        icon="alert-triangle"
        iconColor="#EF4444"
        iconBgColor="#FFF1F2"
        confirmButtonColor="bg-[#EF4444]"
      />

    </BottomSheetModal>
  );
});

RescheduleBottomSheet.displayName = "RescheduleBottomSheet";

export default RescheduleBottomSheet;
