import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useDispatch } from 'react-redux';
import { authApi } from '../../services/authApi';
import { clearFilters } from '../../store/slices/filterSlice';

const PURPLE = '#4A43EC';

export default function BrowseLocation() {
  const dispatch = useDispatch();
  const mounted = useRef(true);
  const busy = useRef(false);
  const [branches, setBranches] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    authApi.getBranches()
      .then((items) => { if (active) setBranches(items.filter((branch) => branch.id)); })
      .catch(() => { if (active) setError('We couldn’t load branches. Please try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  const openBranch = (branch) => {
    Keyboard.dismiss();
    dispatch(clearFilters());
    router.push({ pathname: '/(screens)/property-listing', params: { branchId: branch.id, branchName: branch.name } });
  };

  const useCurrentLocation = async () => {
    if (busy.current) return;
    busy.current = true;
    setLocating(true);
    Keyboard.dismiss();
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!mounted.current) return;
      if (status !== 'granted') {
        Alert.alert('Location permission needed', 'Allow location access in your device settings to find nearby projects. You can also choose a branch below.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (!mounted.current) return;
      dispatch(clearFilters());
      router.push({ pathname: '/(screens)/property-listing', params: {
        locationFilter: '1', latitude: String(position.coords.latitude), longitude: String(position.coords.longitude), locationName: 'Current location',
      } });
    } catch {
      if (mounted.current) Alert.alert('Could not get your location', 'Check that location services are enabled and try again, or choose a branch below.');
    } finally {
      busy.current = false;
      if (mounted.current) setLocating(false);
    }
  };

  const search = query.trim().toLowerCase();
  const visibleBranches = branches.filter((branch) => `${branch.name || ''} ${branch.city || ''}`.toLowerCase().includes(search));

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={21} color="#172033" />
        </TouchableOpacity>
        <View style={styles.search}>
          <Ionicons name="search-outline" size={17} color="#8B90A0" />
          <TextInput value={query} onChangeText={setQuery} placeholder="Search branches or cities" placeholderTextColor="#8B90A0" accessibilityLabel="Search branches or cities" style={styles.input} autoCorrect={false} returnKeyType="search" />
          {!!query && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')} style={styles.clear}><Ionicons name="close-circle" size={19} color="#8B90A0" /></TouchableOpacity>}
        </View>
      </View>
      <FlatList
        data={loading || error ? [] : visibleBranches}
        numColumns={2}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        columnWrapperStyle={styles.columns}
        ListHeaderComponent={<>
          <Image source={require('../../assets/images/property.jpg')} resizeMode="contain" style={styles.hero} accessibilityLabel="Find a home with SquarFT" />
          <Text style={styles.title}>Find your next home</Text>
          <Text style={styles.subtitle}>Browse nearby or choose a branch below.</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: locating, busy: locating }} disabled={locating} onPress={useCurrentLocation} style={[styles.locationButton, locating && { opacity: 0.7 }]}>
            {locating ? <ActivityIndicator color="#fff" /> : <MaterialCommunityIcons name="crosshairs-gps" size={18} color="#fff" />}
            <Text style={styles.locationLabel}>{locating ? 'Finding your location…' : 'Use current location'}</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>Find projects within 10 km of your location</Text>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Explore by branch</Text>{!loading && !error && <Text style={styles.count}>{visibleBranches.length} available</Text>}</View>
        </>}
        renderItem={({ item }) => <TouchableOpacity disabled={locating} accessibilityRole="button" accessibilityLabel={`View projects in ${item.name}`} onPress={() => openBranch(item)} style={styles.branch}>
          <Text style={styles.branchName} numberOfLines={2}>{item.name}</Text>
          <View style={styles.branchFooter}><Text style={styles.city} numberOfLines={1}>{item.city || 'Explore projects'}</Text></View>
        </TouchableOpacity>}
        ListEmptyComponent={<View style={styles.empty}>
          {loading ? <ActivityIndicator color={PURPLE} /> : <>
            <MaterialCommunityIcons name={error ? 'wifi-off' : 'map-marker-outline'} size={30} color="#9296A5" />
            <Text style={styles.emptyText}>{error || (search ? 'No branches match your search.' : 'No branches are available yet.')}</Text>
            <TouchableOpacity accessibilityRole="button" onPress={() => error || !search ? setAttempt((value) => value + 1) : setQuery('')} style={styles.retry}><Text style={styles.retryText}>{error ? 'Try again' : search ? 'Clear search' : 'Refresh'}</Text></TouchableOpacity>
          </>}
        </View>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4, gap: 6 },
  back: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F7FB', borderWidth: 1, borderColor: '#EEEEF4', borderRadius: 11, paddingLeft: 12, minHeight: 44 },
  input: { flex: 1, paddingHorizontal: 8, paddingVertical: 10, color: '#172033', fontSize: 12 },
  clear: { padding: 12 },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  hero: { width: '100%', height: 150, marginTop: 8 },
  title: { fontFamily: 'Manrope_700Bold', fontSize: 19, lineHeight: 26, color: '#172033', textAlign: 'center', marginTop: 8 },
  subtitle: { fontSize: 12, lineHeight: 18, color: '#7A8090', textAlign: 'center', marginTop: 5 },
  locationButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, minHeight: 44, borderRadius: 11, backgroundColor: PURPLE, marginTop: 18 },
  locationLabel: { color: '#fff', fontSize: 13, fontWeight: '600', flexShrink: 1 },
  hint: { textAlign: 'center', color: '#9296A5', fontSize: 10, marginTop: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#172033' },
  count: { fontSize: 11, color: '#9296A5' },
  columns: { gap: 10 },
  branch: { flex: 1, maxWidth: '50%', padding: 12, minHeight: 70, borderWidth: 1, borderColor: '#EEEEF3', borderRadius: 11, marginBottom: 10, backgroundColor: '#fff' },
  branchName: { fontSize: 12, fontWeight: '600', color: '#172033', lineHeight: 18 },
  branchFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  city: { flex: 1, color: '#858B9B', fontSize: 11 },
  empty: { paddingVertical: 30, alignItems: 'center', gap: 12 },
  emptyText: { color: '#7A8090', textAlign: 'center', lineHeight: 22 },
  retry: { padding: 12 },
  retryText: { color: PURPLE, fontWeight: '700' },
});
