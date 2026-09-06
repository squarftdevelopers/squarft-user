import { combineReducers, configureStore } from '@reduxjs/toolkit';
import appSlice from './slices/appSlice';
import authSlice from './slices/authSlice';
import propertiesSlice from './slices/propertiesSlice';
import filterSlice from './slices/filterSlice';
import searchSlice from './slices/searchSlice';
import projectSlice from './slices/projectSlice';
import dealsSlice from './slices/dealsSlice';
import notificationSlice from './slices/notificationSlice';
import visitSlice from './slices/visitSlice';
import builderSlice from './slices/builderSlice';
import projectViewTrackingSlice from './slices/projectViewTrackingSlice';
import recentProjectsSlice from './slices/recentProjectsSlice';
import locationSlice from './slices/locationSlice';


const appReducer = combineReducers({
                app: appSlice,
                auth: authSlice,
                properties: propertiesSlice,
                filter: filterSlice,
                search: searchSlice,
                project: projectSlice,
                deals: dealsSlice,
                notifications: notificationSlice,
                visit: visitSlice,
                builder: builderSlice,
                projectViewTracking: projectViewTrackingSlice,
                recentProjects: recentProjectsSlice,
                location: locationSlice,

});

export const store = configureStore({
        reducer: (state, action) => {
                if (action.type === 'auth/logout') {
                        const clean = appReducer(undefined, { type: '@@INIT' });
                        clean.auth = authSlice(state?.auth, action);
                        return clean;
                }
                return appReducer(state, action);
        },
});
