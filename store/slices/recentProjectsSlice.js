import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { projectApi } from '../../services/projectApi';

// AsyncStorage key for recent projects tracking
const RECENT_STORAGE_KEY = '@squarft_recent_projects';

// 3 days in milliseconds
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Add or update a project in the recent list
 * - If project exists, updates lastViewedAt timestamp (rolling window)
 * - If project is new, adds it to the list
 * - Saves updated list to AsyncStorage
 */
export const addToRecentProjects = createAsyncThunk(
    'recentProjects/add',
    async (projectId, { rejectWithValue }) => {
        try {
            if (!projectId || typeof projectId !== 'string') {
                throw new Error('Invalid project ID');
            }

            // Read current state from AsyncStorage
            const stored = await AsyncStorage.getItem(RECENT_STORAGE_KEY);
            let trackers = [];

            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    trackers = Array.isArray(parsed) ? parsed : [];
                } catch (parseError) {
                    console.warn('Failed to parse recent projects, resetting:', parseError);
                    trackers = [];
                }
            }

            // Current timestamp
            const now = Date.now();

            // Find existing project
            const existingIndex = trackers.findIndex(t => t.id === projectId);

            if (existingIndex !== -1) {
                // Update existing project's timestamp (rolling window)
                trackers[existingIndex].lastViewedAt = now;
            } else {
                // Add new project
                trackers.push({
                    id: projectId,
                    lastViewedAt: now,
                });
            }

            // Save updated list to AsyncStorage
            await AsyncStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(trackers));

            return trackers;
        } catch (error) {
            console.error('Failed to add to recent projects:', error);
            return rejectWithValue(error.message);
        }
    }
);

/**
 * Hydrate and clean recent trackers on app boot
 * - Reads from AsyncStorage
 * - Removes projects older than 3 days
 * - Saves cleaned list back to AsyncStorage
 */
export const hydrateAndCleanRecentTrackers = createAsyncThunk(
    'recentProjects/hydrateAndClean',
    async (_, { rejectWithValue }) => {
        try {
            // Read from AsyncStorage
            const stored = await AsyncStorage.getItem(RECENT_STORAGE_KEY);

            if (!stored) {
                // No data yet, return empty array
                return [];
            }

            let trackers = [];
            try {
                const parsed = JSON.parse(stored);
                trackers = Array.isArray(parsed) ? parsed : [];
            } catch (parseError) {
                console.warn('Failed to parse recent projects during hydration, resetting:', parseError);
                await AsyncStorage.removeItem(RECENT_STORAGE_KEY);
                return [];
            }

            // Current timestamp
            const now = Date.now();

            // Filter out expired projects (older than 3 days)
            const cleanedTrackers = trackers.filter(tracker => {
                if (!tracker || typeof tracker.lastViewedAt !== 'number') {
                    return false; // Remove invalid entries
                }
                const age = now - tracker.lastViewedAt;
                return age < THREE_DAYS_MS;
            });

            // Save cleaned list back to AsyncStorage
            await AsyncStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(cleanedTrackers));

            console.log(`🔄 Recent projects cleaned: ${trackers.length} → ${cleanedTrackers.length}`);

            return cleanedTrackers;
        } catch (error) {
            console.error('Failed to hydrate and clean recent trackers:', error);
            return rejectWithValue(error.message);
        }
    }
);

export const fetchRecentProjects = createAsyncThunk(
    'recentProjects/fetchRecent',
    async (_, { getState, rejectWithValue }) => {
        try {
            const { token } = getState().auth;
            if (!token) return [];
            const response = await projectApi.getRecentProjectViews(token);
            return Array.isArray(response?.data) ? response.data : [];
        } catch (error) {
            return rejectWithValue(error.message);
        }
    },
);

/**
 * Clear all recent projects (utility for testing/reset)
 */
export const clearAllRecentProjects = createAsyncThunk(
    'recentProjects/clearAll',
    async (_, { rejectWithValue }) => {
        try {
            await AsyncStorage.removeItem(RECENT_STORAGE_KEY);
            return [];
        } catch (error) {
            console.error('Failed to clear recent projects:', error);
            return rejectWithValue(error.message);
        }
    }
);

// Redux Slice
const recentProjectsSlice = createSlice({
    name: 'recentProjects',
    initialState: {
        recentTrackers: [],
        loading: false,
        error: null,
    },
    reducers: {
        // Synchronous action to clear error
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Add to recent projects
            .addCase(addToRecentProjects.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(addToRecentProjects.fulfilled, (state, action) => {
                state.loading = false;
                state.recentTrackers = action.payload;
            })
            .addCase(addToRecentProjects.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // Hydrate and clean
            .addCase(hydrateAndCleanRecentTrackers.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(hydrateAndCleanRecentTrackers.fulfilled, (state, action) => {
                state.loading = false;
                state.recentTrackers = action.payload;
            })
            .addCase(hydrateAndCleanRecentTrackers.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(fetchRecentProjects.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchRecentProjects.fulfilled, (state, action) => {
                state.loading = false;
                state.recentTrackers = action.payload;
            })
            .addCase(fetchRecentProjects.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // Clear all
            .addCase(clearAllRecentProjects.fulfilled, (state, action) => {
                state.loading = false;
                state.recentTrackers = action.payload;
            });
    },
});

// Selectors

/**
 * Get all recent projects sorted by most recent first
 */
export const selectRecentProjects = (state) => {
    const trackers = state.recentProjects?.recentTrackers || [];
    // Sort by lastViewedAt descending (most recent first)
    return [...trackers].sort((a, b) => b.lastViewedAt - a.lastViewedAt);
};

/**
 * Get recent project IDs only (for checking if a project is recent)
 */
export const selectRecentProjectIds = (state) => {
    const trackers = state.recentProjects?.recentTrackers || [];
    return trackers.map(t => t.id);
};

/**
 * Check if a specific project is in recent list
 */
export const selectIsProjectRecent = (projectId) => (state) => {
    const trackers = state.recentProjects?.recentTrackers || [];
    return trackers.some(t => t.id === projectId);
};

/**
 * Get recent projects count
 */
export const selectRecentProjectsCount = (state) => {
    return state.recentProjects?.recentTrackers?.length || 0;
};

/**
 * Get loading state
 */
export const selectRecentProjectsLoading = (state) => {
    return state.recentProjects?.loading || false;
};

export const { clearError } = recentProjectsSlice.actions;
export default recentProjectsSlice.reducer;
