import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_SESSION_KEY = "@squarft/auth_session";

export async function saveAuthSession({ token, user }) {
  if (!token) return;

  try {
    await AsyncStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ token, user: user || null }));
  } catch (error) {
    console.log("Failed to save auth session:", error.message);
  }
}

export async function loadAuthSession() {
  try {
    const raw = await AsyncStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;

    const session = JSON.parse(raw);
    if (!session?.token) return null;

    return session;
  } catch (error) {
    console.log("Failed to load auth session:", error.message);
    return null;
  }
}

export async function clearAuthSession() {
  try {
    await AsyncStorage.multiRemove([AUTH_SESSION_KEY, '@project_view_trackers', '@squarft_recent_projects']);
  } catch (_error) {
    throw new Error('Unable to clear your saved session. Please try again.');
  }
}
