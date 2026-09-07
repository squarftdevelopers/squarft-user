import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { projectApi } from '../../services/projectApi';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = '@project_view_trackers';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const QUALIFICATION_THRESHOLD = 5;

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Safely read trackers from AsyncStorage
 * @returns {Promise<Array>} Array of tracker objects
 */
const readTrackersFromStorage = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const parsed = JSON.parse(data);
    
    // Validate structure
    if (!Array.isArray(parsed)) {
      console.warn('[ViewTracking] Invalid data structure in storage, resetting');
      return [];
    }
    
    return parsed;
  } catch (error) {
    console.error('[ViewTracking] Failed to read from storage:', error);
    return [];
  }
};

/**
 * Safely write trackers to AsyncStorage
 * @param {Array} trackers - Array of tracker objects
 */
const writeTrackersToStorage = async (trackers) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trackers));
  } catch (error) {
    console.error('[ViewTracking] Failed to write to storage:', error);
    throw error;
  }
};

/**
 * Check if a tracker has expired (7 days since qualification)
 * @param {Object} tracker - Tracker object
 * @returns {boolean}
 */
const isExpired = (tracker) => {
  if (!tracker.firstQualifiedAt) return false;
  const elapsed = Date.now() - tracker.firstQualifiedAt;
  return elapsed >= SEVEN_DAYS_MS;
};

// ─────────────────────────────────────────────────────────────────────────────
// Async Thunks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Increment view count for a project
 * - If count transitions from 4 to 5, lock the firstQualifiedAt timestamp
 * - Never reset or update firstQualifiedAt after it's set
 * - Prevent duplicate entries for the same projectId
 */
export const incrementProjectView = createAsyncThunk(
  'projectViewTracking/incrementView',
  async (projectId, { getState, rejectWithValue }) => {
    try {
      if (!projectId) {
        throw new Error('Project ID is required');
      }

      const { token } = getState().auth;
      if (token) {
        await projectApi.recordProjectView(projectId, token);
      }

      // Keep a local copy for an offline-friendly immediate update. The
      // server remains the source of truth when the activity screen refreshes.
      const trackers = await readTrackersFromStorage();
      
      // Find existing tracker or create new one
      const existingIndex = trackers.findIndex(t => t.id === projectId);
      
      let updatedTrackers;
      
      if (existingIndex !== -1) {
        // Update existing tracker
        updatedTrackers = trackers.map((tracker, index) => {
          if (index !== existingIndex) return tracker;
          
          // Don't increment beyond 5
          if (tracker.count >= QUALIFICATION_THRESHOLD) {
            return tracker;
          }
          
          const newCount = tracker.count + 1;
          
          // Check if we're hitting the threshold (transitioning from 4 to 5)
          const shouldQualify = newCount === QUALIFICATION_THRESHOLD && !tracker.firstQualifiedAt;
          
          return {
            ...tracker,
            count: newCount,
            // Lock the timestamp only when first hitting threshold
            firstQualifiedAt: shouldQualify ? Date.now() : tracker.firstQualifiedAt,
          };
        });
      } else {
        // Create new tracker
        updatedTrackers = [
          ...trackers,
          {
            id: projectId,
            count: 1,
            firstQualifiedAt: null,
          },
        ];
      }
      
      // Save to storage
      await writeTrackersToStorage(updatedTrackers);
      
      console.log(`[ViewTracking] Incremented view for project ${projectId}`);
      
      return updatedTrackers;
    } catch (error) {
      console.error('[ViewTracking] incrementProjectView error:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const fetchSeenProjects = createAsyncThunk(
  'projectViewTracking/fetchSeen',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return [];
      const response = await projectApi.getSeenProjectViews(token);
      return Array.isArray(response?.data) ? response.data : [];
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

/**
 * Hydrate trackers from storage and clean expired ones
 * - Run on app boot
 * - Remove projects where Date.now() - firstQualifiedAt >= 7 days
 * - Save cleaned list back to storage
 */
export const hydrateAndCleanTrackers = createAsyncThunk(
  'projectViewTracking/hydrateAndClean',
  async (_, { rejectWithValue }) => {
    try {
      // Read trackers from storage
      const trackers = await readTrackersFromStorage();
      
      if (trackers.length === 0) {
        console.log('[ViewTracking] No trackers found in storage');
        return [];
      }
      
      // Filter out expired trackers
      const cleanedTrackers = trackers.filter(tracker => !isExpired(tracker));
      
      const removedCount = trackers.length - cleanedTrackers.length;
      if (removedCount > 0) {
        console.log(`[ViewTracking] Cleaned ${removedCount} expired tracker(s)`);
        
        // Save cleaned list back to storage
        await writeTrackersToStorage(cleanedTrackers);
      } else {
        console.log('[ViewTracking] No expired trackers found');
      }
      
      return cleanedTrackers;
    } catch (error) {
      console.error('[ViewTracking] hydrateAndCleanTrackers error:', error);
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Clear all trackers (utility for testing/reset)
 */
export const clearAllTrackers = createAsyncThunk(
  'projectViewTracking/clearAll',
  async (_, { rejectWithValue }) => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      console.log('[ViewTracking] Cleared all trackers');
      return [];
    } catch (error) {
      console.error('[ViewTracking] clearAllTrackers error:', error);
      return rejectWithValue(error.message);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Slice
// ─────────────────────────────────────────────────────────────────────────────

const initialState = {
  viewTrackers: [], // Array of { id, count, firstQualifiedAt }
  loading: false,
  error: null,
  hydrated: false, // Flag to track if we've loaded from storage
};

const projectViewTrackingSlice = createSlice({
  name: 'projectViewTracking',
  initialState,
  reducers: {
    // Synchronous reducer for resetting state if needed
    resetTracking: (state) => {
      state.viewTrackers = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // ── incrementProjectView ──────────────────────────────────────────────
    builder
      .addCase(incrementProjectView.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(incrementProjectView.fulfilled, (state, action) => {
        state.loading = false;
        state.viewTrackers = action.payload;
      })
      .addCase(incrementProjectView.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchSeenProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSeenProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.viewTrackers = action.payload;
      })
      .addCase(fetchSeenProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ── hydrateAndCleanTrackers ───────────────────────────────────────────
    builder
      .addCase(hydrateAndCleanTrackers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(hydrateAndCleanTrackers.fulfilled, (state, action) => {
        state.loading = false;
        state.viewTrackers = action.payload;
        state.hydrated = true;
      })
      .addCase(hydrateAndCleanTrackers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.hydrated = true; // Mark as hydrated even on error to prevent retry loops
      });

    // ── clearAllTrackers ──────────────────────────────────────────────────
    builder
      .addCase(clearAllTrackers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(clearAllTrackers.fulfilled, (state, action) => {
        state.loading = false;
        state.viewTrackers = action.payload;
      })
      .addCase(clearAllTrackers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Selectors
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Select all view trackers
 */
export const selectAllViewTrackers = (state) => state.projectViewTracking.viewTrackers;

/**
 * Select only qualified projects (count >= 5) for "Seen" tab
 * These are projects that have been viewed 5+ times and are within 7 days
 * Memoized to prevent unnecessary re-renders
 */
export const selectSeenProjects = createSelector(
  [selectAllViewTrackers],
  (viewTrackers) => viewTrackers.filter(
    tracker => tracker.count >= QUALIFICATION_THRESHOLD
  )
);

/**
 * Get view count for a specific project
 */
export const selectProjectViewCount = (projectId) => (state) => {
  const tracker = state.projectViewTracking.viewTrackers.find(t => t.id === projectId);
  return tracker ? tracker.count : 0;
};

/**
 * Check if a project is qualified for "Seen" tab
 */
export const selectIsProjectSeen = (projectId) => (state) => {
  const tracker = state.projectViewTracking.viewTrackers.find(t => t.id === projectId);
  return tracker ? tracker.count >= QUALIFICATION_THRESHOLD : false;
};

/**
 * Select loading state
 */
export const selectViewTrackingLoading = (state) => state.projectViewTracking.loading;

/**
 * Select hydration state
 */
export const selectViewTrackingHydrated = (state) => state.projectViewTracking.hydrated;

// ─────────────────────────────────────────────────────────────────────────────
// Actions & Reducer Export
// ─────────────────────────────────────────────────────────────────────────────

export const { resetTracking } = projectViewTrackingSlice.actions;
export default projectViewTrackingSlice.reducer;
