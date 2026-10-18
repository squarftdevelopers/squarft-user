import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

// Match Expo's picker result so callers retain their existing upload pipelines.
export async function pickUpload(options = {}, allowDocuments = false) {
  const choose = (buttons) => new Promise(resolve => Alert.alert('Upload', 'Choose an image source.', [
    ...buttons.map(([text, source]) => ({ text, onPress: () => resolve(source) })),
    { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
  ], { cancelable: true, onDismiss: () => resolve(null) }));
  // Android supports at most three alert buttons, including Cancel.
  let source = allowDocuments ? await choose([['Add photo', 'photo'], ['Browse files', 'files']]) : 'photo';
  if (source === 'photo') source = await choose([['Camera', 'camera'], ['Gallery', 'gallery']]);
  if (!source) return { canceled: true, assets: null };
  try {
    if (source === 'files') return await DocumentPicker.getDocumentAsync(options);
    const permission = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', `Allow ${source === 'camera' ? 'camera' : 'photo library'} access to upload an image.`);
      return { canceled: true, assets: null };
    }
    const { type: _type, multiple, copyToCacheDirectory: _cache, ...imageOptions } = options;
    const pickerOptions = { quality: 0.8, ...imageOptions, mediaTypes: ['images'] };
    if (multiple) pickerOptions.allowsMultipleSelection = true;
    if (source === 'camera') {
      delete pickerOptions.allowsMultipleSelection;
      delete pickerOptions.selectionLimit;
    }
    const result = await (source === 'camera' ? ImagePicker.launchCameraAsync(pickerOptions) : ImagePicker.launchImageLibraryAsync(pickerOptions));
    if (result.canceled) return result;
    return { ...result, assets: result.assets.map(asset => ({ ...asset, name: asset.fileName || `photo-${Date.now()}.jpg`, type: asset.mimeType || 'image/jpeg' })) };
  } catch (error) {
    Alert.alert('Could not open picker', error?.message || 'Please try again.');
    return { canceled: true, assets: null };
  }
}
