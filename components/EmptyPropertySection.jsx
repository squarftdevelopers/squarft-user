import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';

/**
 * EmptyPropertySection
 * 
 * High-quality UI fallback component for empty property/project sections.
 * 
 * Props:
 * - icon: string (icon name)
 * - iconFamily: "mci" (default) | "feather" | "ionicons"
 * - title: string
 * - description: string
 * - actionText?: string
 * - onAction?: () => void
 * - variant?: "section" (default) | "carousel" | "list" | "compact"
 * - width?: number (for carousel cards)
 * - style?: object
 */
export default function EmptyPropertySection({
  icon = "home-search-outline",
  iconFamily = "mci",
  title = "No Properties Available",
  description = "New verified properties will be available here soon.",
  actionText,
  onAction,
  variant = "section",
  container = false,
  width,
  style,
}) {
  const renderIcon = (size = 22, color = "#4A43EC") => {
    if (iconFamily === "feather") {
      return <Feather name={icon} size={size} color={color} />;
    }
    if (iconFamily === "ionicons") {
      return <Ionicons name={icon} size={size} color={color} />;
    }
    return <MaterialCommunityIcons name={icon} size={size} color={color} />;
    const safeIcon = icon === "home-sparkle-outline" ? "home-search-outline" : icon;
    return <MaterialCommunityIcons name={safeIcon} size={size} color={color} />;
  };

  // Clean centered fallback without card container
  if (!container && variant !== "compact" && variant !== "list") {
    return (
      <View
        className="w-full items-center justify-center py-5 px-4"
        style={style}
      >
        <View className="w-12 h-12 rounded-full bg-[#F0EEFF] items-center justify-center mb-2.5">
          {renderIcon(22, "#4A43EC")}
        </View>
        <Text className="text-[14px] font-manrope-bold text-gray-900 text-center mb-1">
          {title}
        </Text>
        <Text className="text-[12px] font-manrope text-gray-400 text-center leading-4 max-w-[280px]">
          {description}
        </Text>
        {Boolean(actionText && onAction) && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onAction}
            className="mt-3 bg-[#4A43EC] px-5 py-2.5 rounded-xl flex-row items-center justify-center"
            style={{ shadowColor: '#4A43EC', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 2 }}
          >
            <Text className="text-white font-manrope-bold text-[12px] mr-1.5">{actionText}</Text>
            <Feather name="arrow-right" size={13} color="white" />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (variant === "carousel") {
    return (
      <View
        className="bg-white rounded-2xl p-4 border border-gray-100 items-center justify-center"
        style={[
          {
            width: width || 260,
            minHeight: 146,
            shadowColor: "#4A43EC",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 2,
          },
          style,
        ]}
      >
        <View className="w-11 h-11 rounded-full bg-[#F0EEFF] items-center justify-center mb-2.5">
          {renderIcon(20, "#4A43EC")}
        </View>
        <Text className="text-[13px] font-manrope-bold text-gray-900 text-center mb-1" numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-[11px] font-manrope text-gray-400 text-center leading-4 px-2" numberOfLines={2}>
          {description}
        </Text>
      </View>
    );
  }

  if (variant === "list") {
    return (
      <View className="items-center justify-center px-6 py-12" style={style}>
        <View className="w-20 h-20 rounded-full bg-[#F3F1FF] items-center justify-center mb-4 border-4 border-white shadow-sm">
          <View className="w-14 h-14 rounded-full bg-[#EDE9FE] items-center justify-center">
            {renderIcon(28, "#4A43EC")}
          </View>
        </View>
        <Text className="text-[17px] font-manrope-extrabold text-gray-900 text-center mb-2">
          {title}
        </Text>
        <Text className="text-[13px] font-manrope text-gray-500 text-center leading-5 max-w-[290px] mb-5">
          {description}
        </Text>
        {Boolean(actionText && onAction) && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onAction}
            className="bg-[#4A43EC] px-6 py-3 rounded-xl flex-row items-center justify-center"
            style={{ shadowColor: '#4A43EC', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 }}
          >
            <Text className="text-white font-manrope-bold text-[13px] mr-2">{actionText}</Text>
            <Feather name="arrow-right" size={14} color="white" />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (variant === "compact") {
    return (
      <View
        className="flex-row items-center bg-[#F8F9FD] rounded-2xl p-4 border border-[#EDF0F8]"
        style={style}
      >
        <View className="w-10 h-10 rounded-full bg-[#EDE9FE] items-center justify-center mr-3">
          {renderIcon(18, "#4A43EC")}
        </View>
        <View className="flex-1 pr-2">
          <Text className="text-[13px] font-manrope-bold text-gray-900" numberOfLines={1}>
            {title}
          </Text>
          <Text className="text-[11px] font-manrope text-gray-500 leading-4 mt-0.5" numberOfLines={2}>
            {description}
          </Text>
        </View>
        {Boolean(actionText && onAction) && (
          <TouchableOpacity
            onPress={onAction}
            className="bg-white border border-[#4A43EC]/25 px-3 py-1.5 rounded-lg"
          >
            <Text className="text-[11px] font-manrope-bold text-[#4A43EC]">{actionText}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Default: "section" card
  return (
    <View
      className="mx-5 my-2 p-5 bg-[#F8F9FD] rounded-2xl border border-[#EDF0F8] items-center"
      style={style}
    >
      <View className="w-12 h-12 rounded-full bg-[#EDE9FE] items-center justify-center mb-3">
        <View className="w-9 h-9 rounded-full bg-[#DDD6FE] items-center justify-center">
          {renderIcon(20, "#4A43EC")}
        </View>
      </View>
      <Text className="text-[15px] font-manrope-extrabold text-gray-900 text-center mb-1">
        {title}
      </Text>
      <Text className="text-[12px] font-manrope text-gray-500 text-center leading-5 px-3 mb-3">
        {description}
      </Text>
      {Boolean(actionText && onAction) && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onAction}
          className="flex-row items-center bg-white border border-[#4A43EC]/20 px-4 py-2 rounded-xl"
          style={{ shadowColor: '#4A43EC', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 }}
        >
          <Text className="text-[12px] font-manrope-bold text-[#4A43EC] mr-1.5">{actionText}</Text>
          <Feather name="arrow-right" size={13} color="#4A43EC" />
        </TouchableOpacity>
      )}
    </View>
  );
}
