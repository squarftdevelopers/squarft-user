import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { notificationApi } from '../../services/notificationApi';
import { EVENT_CATEGORY_MAP } from '../../constants/notificationTypes';

export const fetchNotificationsThunk = createAsyncThunk('notifications/fetch', async (page = 1, { getState, rejectWithValue }) => {
  try {
    const token = getState().auth.token;
    if (!token) throw new Error('Please login to view notifications');
    return { ...await notificationApi.list(token, page), page };
  } catch (error) { return rejectWithValue(error.message); }
});

export const normalizeNotification = (item) => ({
  id: item.id,
  title: item.title,
  description: item.body || '',
  watched: Boolean(item.is_read),
  createdAt: item.sent_at,
  time: item.sent_at ? new Date(item.sent_at).toLocaleString() : '',
  eventKey: item.metadata?.eventKey || item.type,
  category: item.metadata?.category || EVENT_CATEGORY_MAP[item.type] || 'info',
  deepLink: item.metadata?.deepLink,
  data: item.metadata || {},
});

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    list: [],
    loading: false,
    error: null,
    page: 0,
    hasMore: false,
    requestId: null,
    unreadCount: 0,
  },
  reducers: {
    markAsWatched: (state, action) => {
      const notification = state.list.find(n => n.id === action.payload);
      if (notification && !notification.watched) {
        notification.watched = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllAsWatched: (state) => {
      state.list.forEach(n => {
        n.watched = true;
      });
      state.unreadCount = 0;
    },
    addNotification: (state, action) => {
      const notification = {
        id: action.payload.id || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: action.payload.title || '',
        description: action.payload.description || action.payload.body || '',
        time: action.payload.time || 'Just now',
        watched: false,
        eventKey: action.payload.eventKey || null,
        category: action.payload.category || EVENT_CATEGORY_MAP[action.payload.eventKey] || 'info',
        deepLink: action.payload.deepLink || null,
        data: action.payload.data || {},
        createdAt: action.payload.createdAt || new Date().toISOString(),
      };
      
      state.list.unshift(notification);
      state.unreadCount += 1;
    },
    setNotifications: (state, action) => {
      state.list = action.payload;
      state.unreadCount = action.payload.filter(n => !n.watched).length;
    },
    clearNotifications: (state) => {
      state.list = [];
      state.unreadCount = 0;
    },
  },
  extraReducers: builder => {
    builder.addCase(fetchNotificationsThunk.pending, (state, action) => {
      state.loading = true;
      state.error = null;
      state.requestId = action.meta.requestId;
    }).addCase(fetchNotificationsThunk.fulfilled, (state, action) => {
      if (state.requestId !== action.meta.requestId) return;
      const items = (action.payload.data || []).map(normalizeNotification);
      state.list = action.payload.page === 1 ? items : [...state.list, ...items.filter(item => !state.list.some(existing => existing.id === item.id))];
      state.unreadCount = action.payload.unread_count;
      state.page = action.payload.page;
      state.hasMore = items.length === 20;
      state.loading = false;
    }).addCase(fetchNotificationsThunk.rejected, (state, action) => {
      if (state.requestId !== action.meta.requestId) return;
      state.loading = false;
      state.error = action.payload;
    }).addCase('auth/logout', () => ({ list: [], unreadCount: 0, loading: false, error: null, page: 0, hasMore: false, requestId: null }));
  },
});

export const { 
  markAsWatched, 
  markAllAsWatched, 
  addNotification, 
  setNotifications,
  clearNotifications 
} = notificationSlice.actions;

export default notificationSlice.reducer;
