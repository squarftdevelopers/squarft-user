import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Keyboard, KeyboardAvoidingView, Platform, SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import Constants from "expo-constants";
import { openFilter, setFilterLocation } from "../../store/slices/filterSlice";

const DEFAULT_COORDINATE = { latitude: 22.7196, longitude: 75.8577 };
const GOOGLE_MAPS_API_KEY =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  "";

const formatAddress = (place) => [
  place?.name,
  place?.street,
  place?.district,
  place?.city,
  place?.region,
  place?.postalCode,
].filter(Boolean).filter((value, index, all) => all.indexOf(value) === index).join(", ");

export default function LocationPicker() {
  const dispatch = useDispatch();
  const mapRef = useRef(null);
  const savedCoordinates = useSelector((state) => state.filter.locationCoordinates || state.location?.coordinates);
  const savedAddress = useSelector((state) => state.filter.address);
  const [coordinate, setCoordinate] = useState(savedCoordinates || DEFAULT_COORDINATE);
  const [address, setAddressLabel] = useState(savedAddress || "Move the map or tap to choose a location");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    let active = true;
    Location.reverseGeocodeAsync(coordinate)
      .then((places) => {
        if (active) setAddressLabel(formatAddress(places?.[0]) || `${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`);
      })
      .catch(() => {
        if (active) setAddressLabel(`${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`);
      });
    return () => { active = false; };
  }, [coordinate]);

  const chooseCoordinate = (coords) => {
    setCoordinate(coords);
    setAddressLabel("Finding address...");
  };

  const useCurrentLocation = async () => {
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location permission needed", "Allow location access to center the map on your position.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      chooseCoordinate(coords);
      mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.015, longitudeDelta: 0.015 }, 500);
    } catch (error) {
      Alert.alert("Could not get your location", error.message || "Please check location services and try again.");
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return undefined;
    }

    const timer = setTimeout(async () => {
      if (!GOOGLE_MAPS_API_KEY) return;
      try {
        setSearching(true);
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&components=country:in&key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}`,
        );
        const result = await response.json();
        setSuggestions(result.status === "OK" ? result.predictions || [] : []);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const selectSearchResult = async (suggestion) => {
    Keyboard.dismiss();
    setSuggestions([]);
    setSearchQuery(suggestion.description);

    try {
      setSearching(true);
      if (GOOGLE_MAPS_API_KEY && suggestion.place_id) {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(suggestion.place_id)}&fields=geometry,formatted_address&key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}`,
        );
        const result = await response.json();
        const location = result.result?.geometry?.location;
        if (location) {
          const coords = { latitude: location.lat, longitude: location.lng };
          chooseCoordinate(coords);
          setAddressLabel(result.result?.formatted_address || suggestion.description);
          mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.015, longitudeDelta: 0.015 }, 500);
          return;
        }
      }

      const results = await Location.geocodeAsync(suggestion.description);
      if (results?.[0]) {
        const coords = { latitude: results[0].latitude, longitude: results[0].longitude };
        chooseCoordinate(coords);
        mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.015, longitudeDelta: 0.015 }, 500);
        return;
      }
      Alert.alert("Location not found", "Try a more specific area, landmark, or address.");
    } catch {
      Alert.alert("Could not find that location", "Try again or place the pin manually on the map.");
    } finally {
      setSearching(false);
    }
  };

  const searchTypedLocation = async () => {
    const query = searchQuery.trim();
    if (!query) return;
    await selectSearchResult({ description: query });
  };

  const selectAddress = () => {
    dispatch(setFilterLocation({ address, coordinates: coordinate }));
    dispatch(openFilter());
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialRegion={{ ...coordinate, latitudeDelta: 0.04, longitudeDelta: 0.04 }}
        onPress={(event) => chooseCoordinate(event.nativeEvent.coordinate)}
        onLongPress={(event) => chooseCoordinate(event.nativeEvent.coordinate)}
      >
        <Marker coordinate={coordinate} draggable onDragEnd={(event) => chooseCoordinate(event.nativeEvent.coordinate)} />
      </MapView>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ position: "absolute", top: 48, left: 16, right: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", elevation: 5 }}>
          <Ionicons name="chevron-back" size={23} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1, height: 44, flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, paddingHorizontal: 12, elevation: 5 }}>
          <Ionicons name="search" size={19} color="#4A43EC" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={searchTypedLocation}
            returnKeyType="search"
            placeholder="Search area, street or landmark"
            placeholderTextColor="#9CA3AF"
            style={{ flex: 1, marginLeft: 8, fontSize: 14, color: "#111827" }}
          />
          {searching && <ActivityIndicator size="small" color="#4A43EC" />}
        </View>
        <TouchableOpacity disabled={locating} onPress={useCurrentLocation} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", elevation: 5, opacity: locating ? 0.6 : 1 }}>
          {locating ? <ActivityIndicator size="small" color="#4A43EC" /> : <MaterialCommunityIcons name="crosshairs-gps" size={23} color="#4A43EC" />}
        </TouchableOpacity>
        </View>
        {suggestions.length > 0 && (
          <View style={{ marginTop: 8, maxHeight: 240, borderRadius: 14, backgroundColor: "#fff", elevation: 8, overflow: "hidden" }}>
            <FlatList
              keyboardShouldPersistTaps="handled"
              data={suggestions}
              keyExtractor={(item) => item.place_id}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => selectSearchResult(item)} style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
                  <MaterialCommunityIcons name="map-marker-outline" size={20} color="#4A43EC" />
                  <Text numberOfLines={2} style={{ flex: 1, marginLeft: 10, color: "#374151", fontSize: 14 }}>{item.description}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </KeyboardAvoidingView>

      <View style={{ position: "absolute", left: 16, right: 16, bottom: 24, backgroundColor: "#fff", borderRadius: 20, padding: 16, elevation: 8 }}>
        <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 6 }}>SELECTED LOCATION</Text>
        <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 14 }} numberOfLines={2}>{address}</Text>
        <TouchableOpacity disabled={address === "Finding address..."} onPress={selectAddress} style={{ height: 50, borderRadius: 14, backgroundColor: "#4A43EC", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>Select this address</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
