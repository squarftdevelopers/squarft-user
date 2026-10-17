import ProgressiveImage from "../../components/ProgressiveImage";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Link, useLocalSearchParams } from "expo-router";

export default function RatingSubmitted() {
    const { image } = useLocalSearchParams();
    return (
        <ScrollView
            className="flex-1 bg-white"
            contentContainerStyle={{ flexGrow: 1, justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 40, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
        >
            <View className="flex-1 items-center justify-center w-full">
                <View className="w-[124px] h-[124px] bg-[#F4F2FF] rounded-full items-center justify-center mb-8">
                    <View
                        className="w-[88px] h-[88px] bg-[#4A43EC] rounded-full items-center justify-center"
                        style={{ shadowColor: "#4A43EC", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 }}
                    >
                        <Feather name="check-circle" size={44} color="white" strokeWidth={2.5} />
                    </View>
                </View>

                <Text className="text-[22px] font-manrope-extrabold text-[#111827] mb-4 text-center">
                    Thank you for your feedback!
                </Text>

                <Text className="text-[15px] font-manrope text-[#6B7280] text-center mb-10 leading-6 px-1">
                    Your rating helps us improve the SquarFT{"\n"}experience for everyone.
                </Text>

                <View
                    className="w-full flex-row items-center border border-gray-100 rounded-2xl p-3 bg-white justify-between"
                    style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 }}
                >
                    <View className="flex-1 pr-4 pl-2">
                        <Text className="font-manrope-extrabold text-[15px] text-[#111827] mb-2">
                            SquarFT Prestige Towers
                        </Text>
                        <View className="flex-row items-center">
                            <View className="w-4 h-4 rounded-full border border-[#4A43EC] items-center justify-center mr-1.5">
                                <Feather name="star" size={9} color="#4A43EC" />
                            </View>
                            <Text className="text-[#4A43EC] text-[13px] font-manrope-extrabold">
                                Project Rated Successfully
                            </Text>
                        </View>
                    </View>
                    <ProgressiveImage
                        source={image || null}
                        className="w-[76px] h-[76px] rounded-xl"
                        resizeMode="cover"
                    />
                </View>
            </View>

            <View className="w-full mt-10">
                <Link href="/(tabs)/visit" asChild>
                    <Pressable
                        className="w-full bg-[#4A43EC] rounded-full py-4 mb-4 items-center"
                        activeOpacity={0.8}
                    >
                        <Text className="text-white font-manrope-extrabold text-[16px] text-center">
                            Back to My Visits
                        </Text>
                    </Pressable>
                </Link>
                <Link href="/(tabs)/home" asChild>
                    <Pressable
                        className="w-full py-2 items-center"
                        activeOpacity={0.6}
                    >
                        <Text className="text-[#4B5563] font-manrope-extrabold text-[16px] text-center">
                            Home
                        </Text>
                    </Pressable>
                </Link>
            </View>
        </ScrollView>
    );
}