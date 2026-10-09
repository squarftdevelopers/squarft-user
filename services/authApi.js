import { BASE_URL } from './config';

const ROLE = 'user';

async function request(path, options = {}) {
    try {
        const res = await fetch(`${BASE_URL}${path}`, {
            headers: { 'Content-Type': 'application/json', ...options.headers },
            ...options,
        });
        const data = await res.json();
        if (!res.ok) {
            const error = new Error(data.message || 'Request failed');
            error.status = res.status;
            throw error;
        }
        return data;
    } catch (error) {
    
        if (error.message === 'Network request failed') {
            throw new Error('Cannot connect to server. Make sure your phone and computer are on the same Wi-Fi network.');
        }
        throw error;
    }
}

export const authApi = {
    getBranches: async () => {
        const response = await request('/api/v1/branches');
        return response.data || [];
    },

    startLogin: async (phone) => authApi.sendOtp(phone, 'login'),

    login: (verified_token) =>
        request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ verified_token, role: ROLE }),
        }),

    register: (verified_token, first_name, last_name, branch_id) =>
        request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ verified_token, first_name, last_name, branch_id, role: ROLE }),
        }),

    sendOtp: (phone, purpose) =>
        request('/auth/send-otp', {
            method: 'POST',
            body: JSON.stringify({ phone, purpose, role: ROLE }),
        }),

    verifyOtp: (otp_token, otp) =>
        request('/auth/verify-otp', {
            method: 'POST',
            body: JSON.stringify({ otp_token, otp }),
        }),

    googleLogin: (idToken) =>
        request('/auth/google', {
            method: 'POST',
            body: JSON.stringify({ idToken }),
        }),
};
