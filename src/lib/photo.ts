import * as ImagePicker from 'expo-image-picker';

/** Fait choisir ou prendre une photo, renvoyée en JPEG base64 (null si annulé). */
export async function pickPhoto(source: 'camera' | 'library'): Promise<string | null> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], base64: true, quality: 0.6 };
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
  }
  const result =
    source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return null;
  return result.assets[0]?.base64 ?? null;
}
