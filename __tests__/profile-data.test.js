import { beforeEach, expect, jest, test } from '@jest/globals';
import { configureStore } from '@reduxjs/toolkit';
import { getProfileDisplay } from '../services/profileDisplay';
import authReducer, { fetchProfileThunk, logout } from '../store/slices/authSlice';
import notificationReducer, { fetchNotificationsThunk, normalizeNotification } from '../store/slices/notificationSlice';
import { profileApi } from '../services/profileApi';
import { notificationApi } from '../services/notificationApi';
jest.mock('../services/config', () => ({ BASE_URL: 'https://example.test' }));
jest.mock('../services/profileApi', () => ({ profileApi: { getUserProfile: jest.fn() } }));
jest.mock('../services/notificationApi', () => ({ notificationApi: { list: jest.fn() } }));
jest.mock('../utils/authStorage', () => ({ saveAuthSession: jest.fn(), clearAuthSession: jest.fn() }));
const store = () => configureStore({ reducer: { auth: authReducer, notifications: notificationReducer }, preloadedState: { auth: { ...authReducer(undefined, {}), token: 'session', user: { id: 'user', first_name: 'Manas' }, isLoggedIn: true } } });
beforeEach(() => jest.clearAllMocks());
test('profile uses actual names including single-name accounts and hides placeholder email', () => {
  expect(getProfileDisplay({ user: { first_name: 'Manas', last_name: null, email: 'No email provided', branch: { name: 'Central' } } }, null)).toMatchObject({ name: 'Manas', email: null, phone: null, branch: { name: 'Central' } });
  expect(getProfileDisplay(null, { first_name: 'Existing', phone: '+919876543210' })).toMatchObject({ name: 'Existing', phone: '+919876543210' });
});
test('profile fetch preserves session identity and has independent errors', async () => {
  const state = store();
  profileApi.getUserProfile.mockResolvedValueOnce({ user: { full_name: 'Manas', branch: { name: 'Central' } } });
  await state.dispatch(fetchProfileThunk());
  expect(state.getState().auth.user.id).toBe('user');
  profileApi.getUserProfile.mockRejectedValueOnce(new Error('Offline'));
  await state.dispatch(fetchProfileThunk());
  expect(state.getState().auth).toMatchObject({ profileError: 'Offline', profileLoading: false, error: null });
});
test('profile response arriving after logout cannot restore previous identity', async () => {
  let finish;
  profileApi.getUserProfile.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const state = store();
  const pending = state.dispatch(fetchProfileThunk());
  state.dispatch(logout());
  finish({ user: { id: 'old-user' } });
  await pending;
  expect(state.getState().auth.user).toBeNull();
  expect(state.getState().auth.profile).toBeNull();
});
test('notification inbox starts empty and uses persisted server read status', () => {
  expect(notificationReducer(undefined, {}).list).toEqual([]);
  expect(normalizeNotification({ id: 'n', body: 'Visit confirmed', is_read: true, metadata: { deepLink: '/myActivity' } })).toMatchObject({ description: 'Visit confirmed', watched: true, deepLink: '/myActivity' });
});
test('notification pagination deduplicates and uses total unread count', async () => {
  const state = store();
  notificationApi.list.mockResolvedValueOnce({ data: [{ id: 'a' }], unread_count: 4 });
  await state.dispatch(fetchNotificationsThunk(1));
  notificationApi.list.mockResolvedValueOnce({ data: [{ id: 'a' }, { id: 'b', is_read: true }], unread_count: 4 });
  await state.dispatch(fetchNotificationsThunk(2));
  expect(state.getState().notifications.list.map(item => item.id)).toEqual(['a', 'b']);
  expect(state.getState().notifications.unreadCount).toBe(4);
  state.dispatch(logout());
  expect(state.getState().notifications.list).toEqual([]);
});
