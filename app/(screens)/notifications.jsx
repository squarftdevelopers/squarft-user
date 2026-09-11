import { View, Text, Pressable, StatusBar, Platform, ScrollView, Image, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, Stack, useFocusEffect } from "expo-router";
import { useSelector, useDispatch } from "react-redux";
import { useCallback, useState } from "react";
import { markAllAsWatched, markAsWatched, fetchNotificationsThunk } from "../../store/slices/notificationSlice";
import { notificationApi } from "../../services/notificationApi";
import { getNotificationIcon } from "../../utils/notificationIcons";
import { navigateToNotification } from "../../utils/notificationNavigation";

export default function Notifications() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { list: notifications, loading, error, page, hasMore, unreadCount } = useSelector(state => state.notifications);
  const token = useSelector(state => state.auth.token);
  const [marking, setMarking] = useState(false);
  useFocusEffect(useCallback(() => {
    if (token) dispatch(fetchNotificationsThunk(1));
  }, [dispatch, token]));

  const handleNotificationPress = async (notification) => {
    try {
      if (!notification.watched) {
        await notificationApi.markRead(token, notification.id);
        dispatch(markAsWatched(notification.id));
      }
      navigateToNotification(notification);
    } catch (error) { Alert.alert('Unable to open notification', error.message || 'Please try again.'); }
  };
  const markAll = async () => {
    setMarking(true);
    try {
      await notificationApi.markAllRead(token);
      dispatch(markAllAsWatched());
    } catch (error) { Alert.alert('Unable to mark notifications read', error.message || 'Please try again.'); }
    finally { setMarking(false); }
  };

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />

      <View
        className="flex-row items-center justify-between px-5 pb-3 mt-2"
        style={{ paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 8 : 45 }}
      >
        <Pressable onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={22} color="black" />
        </Pressable>
        <Text className="text-[17px] text-[#1F2937] font-lato-bold">Notifications</Text>
        <Pressable 
          onPress={markAll}
          disabled={marking || loading || unreadCount === 0}
          className="bg-[#4A43EC]/10 px-3 py-1.5 rounded-lg"
        >
          <Text className="text-[#4A43EC] text-[11px] font-manrope-bold">Mark all read</Text>
        </Pressable>
      </View>

      {error ? <Pressable onPress={() => dispatch(fetchNotificationsThunk(1))} className="p-5"><Text className="text-red-500">{error} Tap to retry.</Text></Pressable> : null}
      {loading && !notifications.length ? <ActivityIndicator className="mt-10" color="#4A43EC" /> : !error && notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10 -mt-20">
          <Image
            source={require("../../assets/images/Ilustration mailbox.png")}
            style={{ width: 180, height: 180, resizeMode: 'contain' }}
          />
          <Text className="text-[16px] font-manrope-bold text-[#1F2937] mt-5 text-center">
            No notifications yet
          </Text>
          <Text className="text-[12px] font-manrope-medium text-[#9CA3AF] mt-2.5 text-center leading-5">
            Your notifications will appear here.
          </Text>
        </View>
      ) : (
        <ScrollView
          alwaysBounceVertical={true}
          refreshControl={
            <RefreshControl
              refreshing={loading && page === 1}
              onRefresh={() => dispatch(fetchNotificationsThunk(1))}
              colors={["#4A43EC"]}
              tintColor="#4A43EC"
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 100 }}
        >
          {notifications.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }]
              })}
              className="flex-row mb-6 relative"
              onPress={() => handleNotificationPress(item)}
            >
              {getNotificationIcon(item.category || item.type)}
              <View className="ml-4 flex-1">
                <Text className={`text-[15px] ${item.watched ? 'text-[#6B7280]' : 'text-[#1F2937]'} font-manrope-bold mb-0.5`}>
                  {item.title}
                </Text>
                <Text className="text-[13px] text-[#9CA3AF] font-manrope-medium leading-5">
                  {item.description}
                </Text>
                <Text className="text-[10px] text-[#9CA3AF] font-manrope-medium italic self-end mt-1">
                  {item.time}
                </Text>
              </View>
              {!item.watched && (
                <View className="absolute top-1 right-0 w-2 h-2 bg-[#4A43EC] rounded-full" />
              )}
            </Pressable>
          ))}
          {hasMore ? <Pressable disabled={loading} onPress={() => dispatch(fetchNotificationsThunk(page + 1))} className="py-4 items-center"><Text className="text-[#4A43EC]">{loading ? 'Loading…' : 'Load more'}</Text></Pressable> : null}
        </ScrollView>
      )}
    </View>
  );
}
