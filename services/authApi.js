import { BASE_URL } from './config';

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

    startLogin: async (phone) => {
        try {
            return { ...await authApi.sendOtp(phone, 'login'), needsRegistration: false };
        } catch (error) {
            if (error.status === 400 && error.message === 'No account found with this phone number') {
                return { needsRegistration: true };
            }
            throw error;
        }
    },

    login: (verified_token) =>
        request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ verified_token }),
        }),

    register: (verified_token, first_name, last_name, branch_id) =>
        request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ verified_token, first_name, last_name, branch_id }),
        }),

    sendOtp: (phone, purpose) =>
        request('/auth/send-otp', {
            method: 'POST',
            body: JSON.stringify({ phone, purpose }),
        }),

    verifyOtp: (otp_token, otp) =>
        request('/auth/verify-otp', {
            method: 'POST',
            body: JSON.stringify({ otp_token, otp }),
        }),

    resetPassword: (verified_token, new_password) =>
        request('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ verified_token, new_password }),
        }),

    googleLogin: (idToken) =>
        request('/auth/google', {
            method: 'POST',
            body: JSON.stringify({ idToken }),
        }),
};
