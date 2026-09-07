import { View, Text, TouchableOpacity } from "react-native";

export default function DetailFooter({ onBookVisit, disabled = false }) {
    return (
        <View className="flex-row gap-3">
         
            <TouchableOpacity
                onPress={onBookVisit}
                disabled={disabled}
                className={`flex-[2] rounded-2xl py-4 items-center ${disabled ? "bg-gray-300" : "bg-indigo-600"}`}
                style={disabled ? undefined : { shadowColor: "#6C3BFF", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 15, elevation: 8 }}
            >
                <Text className="text-white text-[15px] font-manrope-semibold">{disabled ? "No units available" : "Add to site visit"}</Text>
            </TouchableOpacity>
        </View>
    );
}
