import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authApi } from '../../services/authApi';
import { profileApi } from '../../services/profileApi';
import { clearAuthSession, loadAuthSession, saveAuthSession } from '../../utils/authStorage';

export const loginThunk = createAsyncThunk('auth/login', async ({ verified_token }, { rejectWithValue }) => {
    try {
        const response = await authApi.login(verified_token);
        await saveAuthSession({ token: response.token, user: response.user });
        return response;
    } catch (e) {
        return rejectWithValue(e.message);
    }
});

// Rehydrate a previously saved session on app start
export const hydrateAuthThunk = createAsyncThunk('auth/hydrate', async () => {
    return await loadAuthSession();
});

// Log out and clear the persisted session
export const logoutThunk = createAsyncThunk('auth/logout', async (_, { dispatch }) => {
    await clearAuthSession();
    dispatch(logout());
});


export const registerThunk = createAsyncThunk('auth/register', async ({ verified_token, first_name, last_name, branch_id }, { rejectWithValue }) => {
    try {
        const response = await authApi.register(verified_token, first_name, last_name, branch_id);
        await saveAuthSession({ token: response.token, user: response.user });
        return response;
    } catch (e) {
        return rejectWithValue(e.message);
    }
});

export const sendOtpThunk = createAsyncThunk('auth/sendOtp', async ({ phone, purpose }, { rejectWithValue }) => {
    try {
        return await authApi.sendOtp(phone, purpose);
    } catch (e) {
        return rejectWithValue(e.message);
    }
});

export const startLoginThunk = createAsyncThunk('auth/startLogin', async ({ phone }, { rejectWithValue }) => {
    try {
        return await authApi.startLogin(phone);
    } catch (e) {
        return rejectWithValue(e.message);
    }
});

// Verify OTP
export const verifyOtpThunk = createAsyncThunk('auth/verifyOtp', async ({ otp_token, otp }, { rejectWithValue }) => {
    try {
        return await authApi.verifyOtp(otp_token, otp);
    } catch (e) {
        return rejectWithValue(e.message);
    }
});

// Fetch user profile
export const fetchProfileThunk = createAsyncThunk('auth/fetchProfile', async (_, { getState, rejectWithValue }) => {
    try {
        const { token } = getState().auth;
        if (!token) {
            throw new Error('No authentication token');
        }
        return await profileApi.getUserProfile(token);
    } catch (e) {
        return rejectWithValue(e.message);
    }
});

export const updateProfilePictureThunk = createAsyncThunk('auth/updateProfilePicture', async (picture, { getState, rejectWithValue }) => {
    try {
        const { token } = getState().auth;
        if (!token) {
            throw new Error('No authentication token');
        }
        return await profileApi.updateProfilePicture(token, picture);
    } catch (e) {
        return rejectWithValue(e.message);
    }
});

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        name: '',
        fullName: '',
        branchId: null,
        branchName: '',
        email: '',
        mobile: '',
        password: '',
        newPassword: '',
        confirmPassword: '',
        otp: ['', '', '', '', '', ''],
        otpFlow: 'register',
        otpToken: null,
        verifiedToken: null,
        rememberMe: false,
        isLoggedIn: false,
        authChecked: false,
        token: null,
        user: null,
        profile: null,
        profileLoading: false,
        profileError: null,
        profileRequestId: null,
        profilePictureLoading: false,
        loading: false,
        error: null,
    },
    reducers: {
        setBranch: (state, action) => {
            state.branchId = action.payload?.id || null;
            state.branchName = action.payload?.name || '';
        },
        setName: (state, action) => { state.name = action.payload; },
        setFullName: (state, action) => { state.fullName = action.payload; },
        setEmail: (state, action) => { state.email = action.payload; },
        setMobile: (state, action) => { state.mobile = action.payload; },
        setPassword: (state, action) => { state.password = action.payload; },
        setNewPassword: (state, action) => { state.newPassword = action.payload; },
        setConfirmPassword: (state, action) => { state.confirmPassword = action.payload; },
        setOtpDigit: (state, action) => {
            const { index, value } = action.payload;
            state.otp[index] = value;
        },
        clearOtp: (state) => { state.otp = ['', '', '', '', '', '']; },
        setOtpFlow: (state, action) => { state.otpFlow = action.payload; },
        setOtpToken: (state, action) => { state.otpToken = action.payload; },
        setVerifiedToken: (state, action) => { state.verifiedToken = action.payload; },
        toggleRememberMe: (state) => { state.rememberMe = !state.rememberMe; },
        setLoggedIn: (state, action) => { state.isLoggedIn = action.payload; },
        clearError: (state) => { state.error = null; },
        clearAuthInputs: (state) => {
            state.password = '';
            state.newPassword = '';
            state.confirmPassword = '';
            state.otp = ['', '', '', '', '', ''];
            state.error = null;
        },
        logout: (state) => {
            state.mobile = '';
            state.fullName = '';
            state.branchId = null;
            state.branchName = '';
            state.email = '';
            state.password = '';
            state.token = null;
            state.user = null;
            state.profile = null;
            state.profileLoading = false;
            state.profileError = null;
            state.profileRequestId = null;
            state.profilePictureLoading = false;
            state.isLoggedIn = false;
            state.error = null;
            state.otpToken = null;
            state.verifiedToken = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Hydrate persisted session
            .addCase(hydrateAuthThunk.fulfilled, (state, action) => {
                state.authChecked = true;
                if (action.payload?.token) {
                    state.token = action.payload.token;
                    state.user = action.payload.user || null;
                    state.isLoggedIn = true;
                }
            })
            .addCase(hydrateAuthThunk.rejected, (state) => {
                state.authChecked = true;
            })
            // Login
            .addCase(loginThunk.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(loginThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.token = action.payload.token;
                state.user = action.payload.user || state.user;
                state.isLoggedIn = true;
            })
            .addCase(loginThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Register
            .addCase(registerThunk.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(registerThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.token = action.payload.token;
                state.user = action.payload.user || state.user;
                state.isLoggedIn = true;
            })
            .addCase(registerThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(startLoginThunk.pending, (state, action) => {
                state.loading = true;
                state.error = null;
                state.mobile = action.meta.arg.phone;
                state.fullName = '';
                state.branchId = null;
                state.branchName = '';
                state.otpToken = null;
                state.verifiedToken = null;
                state.otp = ['', '', '', '', '', ''];
            })
            .addCase(startLoginThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.otpFlow = action.payload.needsRegistration ? 'register' : 'login';
                state.otpToken = action.payload.otp_token || null;
            })
            .addCase(startLoginThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Send OTP
            .addCase(sendOtpThunk.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(sendOtpThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.otpToken = action.payload.otp_token;
            })
            .addCase(sendOtpThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Verify OTP
            .addCase(verifyOtpThunk.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(verifyOtpThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.verifiedToken = action.payload.verified_token;
            })
            .addCase(verifyOtpThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Fetch Profile
            .addCase(fetchProfileThunk.pending, (state, action) => { state.profileLoading = true; state.profileError = null; state.profileRequestId = action.meta.requestId; })
            .addCase(fetchProfileThunk.fulfilled, (state, action) => {
                if (state.profileRequestId !== action.meta.requestId) return;
                state.profileLoading = false;
                state.profile = action.payload;
                state.user = action.payload?.user ? { ...state.user, ...action.payload.user } : state.user;
            })
            .addCase(fetchProfileThunk.rejected, (state, action) => {
                if (state.profileRequestId !== action.meta.requestId) return;
                state.profileLoading = false;
                state.profileError = action.payload;
            })
            // Update Profile Picture
            .addCase(updateProfilePictureThunk.pending, (state) => {
                state.profilePictureLoading = true;
                state.error = null;
            })
            .addCase(updateProfilePictureThunk.fulfilled, (state, action) => {
                state.profilePictureLoading = false;
                const pictureUrl = action.payload?.profilePictureUrl || action.payload?.avatar_url || null;

                if (state.profile?.user && pictureUrl) {
                    state.profile.user.profilePictureUrl = pictureUrl;
                    state.profile.user.avatar_url = action.payload?.avatar_url || pictureUrl;
                }

                if (state.user && pictureUrl) {
                    state.user.profilePictureUrl = pictureUrl;
                    state.user.avatar_url = action.payload?.avatar_url || pictureUrl;
                }
            })
            .addCase(updateProfilePictureThunk.rejected, (state, action) => {
                state.profilePictureLoading = false;
                state.error = action.payload;
            });
    },
});

export const {
    setBranch, setName, setFullName, setEmail, setMobile, setPassword, setNewPassword, setConfirmPassword,
    setOtpDigit, clearOtp, setOtpFlow, setOtpToken, setVerifiedToken, toggleRememberMe,
    setLoggedIn, clearError, clearAuthInputs, logout,
} = authSlice.actions;
export default authSlice.reducer;
