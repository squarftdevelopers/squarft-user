import { View, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
export { isReraApproved } from "../services/projectFilters";

export default function ReraStatusBadge({
  approved,
  approvedLabel = "RERA",
  unapprovedLabel = "Not approved",
  className = "",
  textClassName = "text-[8px]",
  iconSize = 6,
}) {
  const isApproved = Boolean(approved);
  const colors = isApproved
    ? {
        bg: "bg-[#E5F7F1]",
        text: "text-[#00B67A]",
        dot: "bg-[#00B67A]",
        icon: "check",
        iconColor: "white",
      }
    : {
        bg: "bg-gray-100",
        text: "text-gray-500",
        dot: "bg-gray-300",
        icon: "x",
        iconColor: "#6B7280",
      };

  return (
    /* Added 'self-start' here to prevent the badge from stretching horizontally */
    <View className={`flex-row items-center self-start ${colors.bg} px-[6px] py-[2px] rounded ${className}`}>
      <Text className={`${colors.text} ${textClassName} font-manrope-extrabold mr-1`}>
        {isApproved ? approvedLabel : unapprovedLabel}
      </Text>
      <View className={`w-[8px] h-[8px] ${colors.dot} rounded-full items-center justify-center`}>
        <Feather name={colors.icon} size={iconSize} color={colors.iconColor} />
      </View>
    </View>
  );
}
