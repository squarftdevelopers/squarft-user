import { beforeEach, expect, jest, test } from '@jest/globals';
import { authApi } from '../services/authApi';
import reducer, { startLoginThunk, registerThunk, setBranch, setFullName } from '../store/slices/authSlice';
import { configureStore } from '@reduxjs/toolkit';

jest.mock('../services/config', () => ({ BASE_URL: 'https://example.test' }));
jest.mock('../utils/authStorage', () => ({ saveAuthSession: jest.fn(), clearAuthSession: jest.fn(), loadAuthSession: jest.fn() }));

const response = (status, data) => global.fetch.mockResolvedValueOnce({ ok: status < 400, status, json: async () => data });
const makeStore = () => configureStore({ reducer: { auth: reducer } });

beforeEach(() => { global.fetch = jest.fn(); });

test('existing phone receives login OTP', async () => {
    response(200, { otp_token: 'login-otp' });
    const store = makeStore();
    await store.dispatch(startLoginThunk({ phone: '+919876543210' }));
    expect(store.getState().auth).toMatchObject({ otpFlow: 'login', otpToken: 'login-otp', loading: false });
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({ phone: '+919876543210', purpose: 'login' });
});

test('unknown phone enters registration without sending a registration OTP yet', async () => {
    response(400, { message: 'No account found with this phone number' });
    const store = makeStore();
    store.dispatch(setBranch({ id: 'old-branch', name: 'Old' }));
    store.dispatch(setFullName('Old Name'));
    const result = await store.dispatch(startLoginThunk({ phone: '+919876543210' }));
    expect(result.payload.needsRegistration).toBe(true);
    expect(store.getState().auth).toMatchObject({ otpFlow: 'register', otpToken: null, branchId: null, fullName: '', mobile: '+919876543210' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
});

test.each([403, 429, 500])('HTTP %i never routes to registration', async (status) => {
    response(status, { message: 'Request blocked' });
    await expect(authApi.startLogin('+919876543210')).rejects.toThrow('Request blocked');
});

test('network failures never route to registration', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network request failed'));
    await expect(authApi.startLogin('+919876543210')).rejects.toThrow('Cannot connect');
});

test('registration passes selected branch to the backend and saves the returned user', async () => {
    response(201, { token: 'session', user: { id: 'user', branch_id: 'selected-branch' } });
    const store = makeStore();
    await store.dispatch(registerThunk({ verified_token: 'verified', first_name: 'Manas', last_name: '', branch_id: 'selected-branch' }));
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({ verified_token: 'verified', first_name: 'Manas', last_name: '', branch_id: 'selected-branch' });
    expect(store.getState().auth.user.branch_id).toBe('selected-branch');
    expect(store.getState().auth.isLoggedIn).toBe(true);
});

test('loads the shared public branch list', async () => {
    response(200, { data: [{ id: 'branch', name: 'Central', city: 'Indore' }] });
    expect(await authApi.getBranches()).toEqual([{ id: 'branch', name: 'Central', city: 'Indore' }]);
    expect(global.fetch.mock.calls[0][0]).toBe('https://example.test/api/v1/branches');
});
