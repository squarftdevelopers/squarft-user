import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Keyboard,
  Linking,
  Platform,
  Pressable,
  StatusBar,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { Stack, useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { maskProjectName } from "../../services/projectDisplay";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { chatApi } from "../../services/chatApi";
import { fetchProfileThunk } from "../../store/slices/authSlice";

const INITIAL_MESSAGES = [];
const CHAT_SEND_SOUND = require("../../assets/sounds/chat-send.wav");
const CHAT_RECEIVE_SOUND = require("../../assets/sounds/chat-receive.wav");

const QUICK_PROMPTS = [
  {
    label: "2BHK flats",
    prompt: "Find 2 BHK flats in Indore.",
  },
  {
    label: "Under 50L",
    prompt: "Show properties under 50 lakh.",
  },
  {
    label: "Vijay Nagar",
    prompt: "Find properties in Vijay Nagar.",
  },
  {
    label: "Ready to move",
    prompt: "Show ready to move properties.",
  },
];

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatPrice(property) {
  if (property?.price_formatted) return property.price_formatted;
  const price = Number(property?.price || 0);
  if (!price) return "Price on request";
  if (price >= 10000000) return `Rs ${(price / 10000000).toFixed(1)} Cr`;
  if (price >= 100000) return `Rs ${(price / 100000).toFixed(0)} L`;
  return `Rs ${price.toLocaleString("en-IN")}`;
}

function getReplyText(response) {
  return (
    response?.reply ||
    response?.raw?.message ||
    response?.raw?.error ||
    "I received your request, but could not read the response properly."
  );
}

function getFirstName(profile) {
  const name =
    profile?.user?.full_name ||
    profile?.user?.first_name ||
    profile?.first_name ||
    profile?.firstName ||
    profile?.name ||
    "";

  return name.trim().split(" ")[0] || null;
}

function getInitials(profile) {
  const fullName =
    profile?.user?.full_name ||
    [profile?.user?.first_name, profile?.user?.last_name].filter(Boolean).join(" ") ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    profile?.name ||
    "";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  return (parts[0]?.slice(0, 2) || "U").toUpperCase();
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function playChatSound(soundAsset) {
  try {
    const { sound } = await Audio.Sound.createAsync(soundAsset, {
      shouldPlay: true,
      volume: 0.45,
    });
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  } catch (error) {
    console.log("Chat sound failed:", error.message);
  }
}

function ThinkingMessage() {
  const dots = useRef([new Animated.Value(0.35), new Animated.Value(0.35), new Animated.Value(0.35)]).current;

  useEffect(() => {
    const animations = dots.map((dot) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot, {
            toValue: 1,
            duration: 260,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.35,
            duration: 260,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      )
    );
    Animated.stagger(120, animations).start();

    return () => {
      animations.forEach((animation) => animation.stop());
    };
  }, [dots]);

  return (
    <View className="mb-3 w-full flex-row items-start">
      <View className="w-10 items-start">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-[#EDEBFF]">
          <MaterialCommunityIcons name="robot-outline" size={18} color="#4A43EC" />
        </View>
      </View>
      <View className="flex-1">
        <View
          className="self-start rounded-2xl rounded-tl-sm bg-white px-4 py-3"
          style={{
            shadowColor: "#111827",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 10,
            elevation: 2,
          }}
        >
          <View className="h-5 flex-row items-center gap-1.5">
            {dots.map((dot, index) => (
              <Animated.View
                key={index}
                className="h-2 w-2 rounded-full bg-[#4A43EC]"
                style={{
                  opacity: dot,
                  transform: [
                    {
                      translateY: dot.interpolate({
                        inputRange: [0.35, 1],
                        outputRange: [2, -3],
                      }),
                    },
                  ],
                }}
              />
            ))}
          </View>
        </View>
      </View>
      <View className="w-10" />
    </View>
  );
}

function ChatMessage({ item, renderProperty, renderSlot, renderContact, userInitials }) {
  const pop = useRef(new Animated.Value(item.role === "bot" ? 0 : 1)).current;
  const isUser = item.role === "user";
  const hasProperties = Array.isArray(item.properties) && item.properties.length > 0;
  const hasSlots = Array.isArray(item.slots) && item.slots.length > 0;

  useEffect(() => {
    if (!isUser) {
      Animated.spring(pop, {
        toValue: 1,
        friction: 7,
        tension: 120,
        useNativeDriver: true,
      }).start();
    }
  }, [isUser, pop]);

  const aiBubbleStyle = !isUser
    ? {
        opacity: pop,
        transform: [
          {
            scale: pop.interpolate({
              inputRange: [0, 1],
              outputRange: [0.94, 1],
            }),
          },
          {
            translateY: pop.interpolate({
              inputRange: [0, 1],
              outputRange: [8, 0],
            }),
          },
        ],
      }
    : undefined;

  return (
    <View className="mb-3 w-full flex-row items-start">
      <View className="w-10 items-start">
        {!isUser && (
          <View className="h-8 w-8 items-center justify-center rounded-full bg-[#EDEBFF]">
            <MaterialCommunityIcons name="robot-outline" size={18} color="#4A43EC" />
          </View>
        )}
      </View>
      <View className="flex-1">
        <Animated.View
          className={`max-w-full rounded-2xl px-4 py-3 ${isUser ? "self-end rounded-tr-sm bg-[#4A43EC]" : "self-start rounded-tl-sm bg-white"
            }`}
          style={[
            !isUser
              ? {
                  shadowColor: "#111827",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06,
                  shadowRadius: 10,
                  elevation: 2,
                }
              : undefined,
            aiBubbleStyle,
          ]}
        >
          <Text
            className={`text-[13px] leading-5 ${isUser ? "font-manrope-semibold text-white" : "font-manrope-medium text-[#1F2937]"
              }`}
          >
            {item.text}
            {!isUser && item.isStreaming ? " " : ""}
          </Text>
        </Animated.View>

        {!isUser && hasProperties && item.properties.map(renderProperty)}
        {!isUser && hasSlots && <View className="mt-2">{item.slots.map(renderSlot)}</View>}
        {!isUser && item.customerNumber && renderContact(item.customerNumber)}
      </View>
      <View className="w-10 items-end">
        {isUser && (
          <View className="h-8 w-8 items-center justify-center rounded-full bg-[#4A43EC]">
            <Text className="text-[11px] font-manrope-extrabold text-white">{userInitials}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function ChatBot() {
  const router = useRouter();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);
  const { width, height } = useWindowDimensions();
  const { isLoggedIn, loading, profile, token } = useSelector((state) => state.auth);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [sessionId, setSessionId] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const canSend = message.trim().length > 0 && !isSending && !isStreaming;
  const firstName = getFirstName(profile);
  const userInitials = getInitials(profile);

  const restingBottomInset = Math.max(insets.bottom, Platform.OS === "ios" ? 28 : 12);
  const bottomInset = useRef(new Animated.Value(restingBottomInset)).current;

  useEffect(() => {
    if (isLoggedIn && token && !profile) {
      dispatch(fetchProfileThunk());
    }
  }, [dispatch, isLoggedIn, profile, token]);

  // Manual keyboard-avoiding, driven by JS keyboard events rather than
  // KeyboardAvoidingView — that component's "height"/"padding" behaviors
  // have proven unreliable on this app (residual gaps on Android after the
  // keyboard closes, offset math issues on iOS), so we track the keyboard's
  // own height directly and animate the input bar's bottom padding to match.
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      const keyboardHeight = event?.endCoordinates?.height ?? 0;
      Animated.timing(bottomInset, {
        toValue: Math.max(keyboardHeight, restingBottomInset),
        duration: event?.duration || 250,
        useNativeDriver: false,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      Animated.timing(bottomInset, {
        toValue: restingBottomInset,
        duration: 200,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [bottomInset, restingBottomInset]);

  const appendMessage = (nextMessage) => {
    setMessages((current) => [...current, nextMessage]);
  };

  const updateMessage = (messageId, patch) => {
    setMessages((current) =>
      current.map((item) => (item.id === messageId ? { ...item, ...patch } : item))
    );
  };

  const streamBotMessage = async (response) => {
    const botId = createId("bot");
    const fullText = getReplyText(response);
    const step = 4;

    setIsStreaming(true);
    playChatSound(CHAT_RECEIVE_SOUND);
    appendMessage({
      id: botId,
      role: "bot",
      text: "",
      isStreaming: true,
      properties: response.properties,
      slots: response.slots,
      customerNumber: response.customer_number,
      raw: response.raw,
    });

    if (!fullText) {
      updateMessage(botId, { isStreaming: false });
      setIsStreaming(false);
      return;
    }

    for (let index = step; index < fullText.length + step; index += step) {
      updateMessage(botId, { text: fullText.slice(0, index) });
      await wait(14);
    }

    updateMessage(botId, { text: fullText, isStreaming: false });
    setIsStreaming(false);
  };

  const sendMessage = async (text = message) => {
    const trimmed = text.trim();
    if (!trimmed || isSending || isStreaming) return;

    appendMessage({ id: createId("user"), role: "user", text: trimmed });
    playChatSound(CHAT_SEND_SOUND);
    setMessage("");
    setIsSending(true);

    try {
      const response = await chatApi.sendMessage({
        message: trimmed,
        sessionId,
        token,
      });

      if (response.sessionId) {
        setSessionId(response.sessionId);
      }

      setIsSending(false);
      await streamBotMessage(response);
    } catch (error) {
      setIsSending(false);
      playChatSound(CHAT_RECEIVE_SOUND);
      appendMessage({
        id: createId("error"),
        role: "bot",
        text:
          error.message === "Network request failed"
            ? "Cannot connect to the AI service. Please check that the chatbot backend is running."
            : error.message,
      });
    } finally {
      setIsSending(false);
      setIsStreaming(false);
    }
  };

  const requestVisit = (property) => {
    sendMessage(`I want to visit ${property.name || "this property"}. property_id: ${property.id}`);
  };

  const bookSlot = (slot) => {
    sendMessage(`Book this visit slot: ${slot.slot_start || slot.display}`);
  };

  const renderProperty = (property) => (
    <View key={property.id || property.name} className="mt-3 rounded-xl border border-[#E5E7EB] bg-[#FAFAFF] p-3">
      <Text className="text-[13px] font-manrope-extrabold text-[#111827]">{maskProjectName(property.name) || "Property"}</Text>
      <View className="mt-2 flex-row flex-wrap gap-2">
        {!!property.location && (
          <Text className="rounded-md bg-white px-2 py-1 text-[10px] font-manrope-bold text-[#6B7280]">
            {property.location}
          </Text>
        )}
        {!!property.bhk && (
          <Text className="rounded-md bg-white px-2 py-1 text-[10px] font-manrope-bold text-[#6B7280]">
            {property.bhk} BHK
          </Text>
        )}
        {!!property.type && (
          <Text className="rounded-md bg-white px-2 py-1 text-[10px] font-manrope-bold text-[#6B7280]">
            {property.type}
          </Text>
        )}
      </View>
      <Text className="mt-2 text-[13px] font-manrope-extrabold text-[#4A43EC]">{formatPrice(property)}</Text>
      <View className="mt-3 flex-row gap-2">
        <Pressable
          onPress={() => router.push({ pathname: "/(screens)/project-detail", params: { id: property.id } })}
          className="flex-1 items-center rounded-lg border border-[#DAD7FF] bg-white py-2"
        >
          <Text className="text-[11px] font-manrope-bold text-[#4A43EC]">View</Text>
        </Pressable>
        <Pressable onPress={() => requestVisit(property)} className="flex-1 items-center rounded-lg bg-[#4A43EC] py-2">
          <Text className="text-[11px] font-manrope-bold text-white">Visit</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderSlot = (slot, index) => (
    <Pressable
      key={slot.id || slot.slot_start || index}
      onPress={() => bookSlot(slot)}
      className="mt-2 flex-row items-center rounded-xl border border-[#DAD7FF] bg-[#F7F6FF] px-3 py-2"
    >
      <Ionicons name="calendar-outline" size={16} color="#4A43EC" />
      <Text className="ml-2 flex-1 text-[12px] font-manrope-bold text-[#374151]">
        {slot.display || slot.slot_start || "Available slot"}
      </Text>
      <Ionicons name="chevron-forward" size={15} color="#4A43EC" />
    </Pressable>
  );

  const renderContact = (number) => (
    <Pressable
      onPress={() => Linking.openURL(`tel:${number}`)}
      className="mt-3 flex-row items-center rounded-xl bg-[#FFF7ED] px-3 py-3"
    >
      <View className="h-9 w-9 items-center justify-center rounded-full bg-white">
        <Ionicons name="call-outline" size={18} color="#F97316" />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-[11px] font-manrope-medium text-[#9A3412]">Talk to our team</Text>
        <Text className="text-[14px] font-manrope-extrabold text-[#111827]">{number}</Text>
      </View>
    </Pressable>
  );

  const renderMessage = ({ item }) => {
    return (
      <ChatMessage
        item={item}
        renderProperty={renderProperty}
        renderSlot={renderSlot}
        renderContact={renderContact}
        userInitials={userInitials}
      />
    );
  };

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center px-10">
      <MaterialCommunityIcons name="robot-outline" size={45} color="#4A43EC" />
      <Text className="mt-3 text-center text-[20px] font-manrope-medium leading-7 text-[#111827]">
        {loading && !firstName
          ? "What can I help\nwith?"
          : `What can I help\nwith${firstName ? `, ${firstName}` : ""}?`}
      </Text>
    </View>
  );

  return (
    <View className="flex-1 bg-[#F9FAFB]">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />
      <Svg
        pointerEvents="none"
        width={width}
        height={height}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}
      >
        <Defs>
          <RadialGradient id="chatBottomGlow" cx="50%" cy="100%" rx="92%" ry="64%" fx="50%" fy="100%">
            <Stop offset="0%" stopColor="#BEB7FF" stopOpacity="1" />
            <Stop offset="42%" stopColor="#DED9FF" stopOpacity="0.82" />
            <Stop offset="72%" stopColor="#F0EEFF" stopOpacity="0.46" />
            <Stop offset="100%" stopColor="#F9FAFB" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#chatBottomGlow)" />
      </Svg>

      <View
        className="flex-row items-center justify-between border-b border-[#EEF0F4] bg-white px-5 pb-4"
        style={{ paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 12 : 54 }}
      >
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-[#F4F5F7]">
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </Pressable>
        <View className="items-center">
          <Text className="text-[17px] font-lato-bold text-[#111827]">Sasha AI</Text>
          <Text className="mt-0.5 text-[11px] font-manrope-medium text-[#00A86B]">
            {isSending ? "Thinking..." : isStreaming ? "Typing..." : "Online"}
          </Text>
        </View>
        <View className="h-10 w-10" />
      </View>

      <FlatList
        ref={listRef}
        style={{ flex: 1 }}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={isSending ? <ThinkingMessage /> : null}
        contentContainerStyle={{ flexGrow: 1, padding: 20, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      <Animated.View
        className="border-t border-[#EEF0F4] bg-white px-5 pt-3"
        style={{ paddingBottom: bottomInset }}
      >
        <View className="mb-3 flex-row items-center gap-2">
          {QUICK_PROMPTS.map((item) => (
            <Pressable
              key={item.label}
              disabled={isSending || isStreaming}
              onPress={() => sendMessage(item.prompt)}
              className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2 py-1.5"
            >
              <Text className="text-[10px] font-manrope-bold text-[#4B5563]">{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <View className="flex-row items-center rounded-2xl bg-[#F4F5F7] px-4 py-2">
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Ask about properties..."
            placeholderTextColor="#9CA3AF"
            multiline
            editable={!isSending && !isStreaming}
            className="max-h-24 flex-1 py-2 pr-3 text-[14px] font-manrope-medium text-[#111827]"
          />
          <Pressable
            onPress={() => sendMessage()}
            disabled={!canSend}
            className={`h-10 w-10 items-center justify-center rounded-full ${canSend ? "bg-[#4A43EC]" : "bg-[#D1D5DB]"}`}
          >
            <Ionicons name="send" size={17} color="white" />
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}
