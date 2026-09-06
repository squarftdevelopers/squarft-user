import { BASE_URL } from './config';

export async function postAppActivity(token, endpoint, data = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${BASE_URL}/api/v1/app-activity/${endpoint}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    // Activity reporting must not interrupt login, navigation, or support calls.
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
