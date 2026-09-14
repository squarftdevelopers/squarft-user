import { View, Text } from "react-native";
import ProgressiveImage from './ProgressiveImage';

const PALETTE = [
    "#4A43EC", "#F97316", "#059669", "#DB2777",
    "#0891B2", "#7C3AED", "#DC2626", "#65A30D",
];

function colorForName(name) {
    const str = (name || "").trim();
    if (!str) return PALETTE[0];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return PALETTE[Math.abs(hash) % PALETTE.length];
}

export default function UserAvatar({ uri, name, size = 48, style, textStyle }) {
    const initial = (name || "").trim().charAt(0).toUpperCase() || "?";

    if (uri) {
        return (
            <ProgressiveImage
                source={{ uri }}
                style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
                resizeMode="cover"
            />
        );
    }

    return (
        <View
            style={[
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: colorForName(name),
                    alignItems: "center",
                    justifyContent: "center",
                },
                style,
            ]}
        >
            <Text
                style={[
                    { color: "#FFFFFF", fontSize: size * 0.42, fontWeight: "700" },
                    textStyle,
                ]}
            >
                {initial}
            </Text>
        </View>
    );
}
