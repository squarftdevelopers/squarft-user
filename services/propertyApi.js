import { BASE_URL } from './config';

async function request(path, options = {}) {
    try {
        const url = `${BASE_URL}${path}`;
        const { headers: optHeaders, ...restOptions } = options;
        
        const res = await fetch(url, {
            ...restOptions,
            headers: { 
                'Content-Type': 'application/json',
                ...optHeaders,
            },
        });
        
        console.log('📡 Property API Response Status:', res.status);
        const text = await res.text();
        
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.log('❌ Failed to parse JSON:', text.substring(0, 200));
            if (!res.ok) {
                throw new Error(`Request failed with status ${res.status}`);
            }
            throw new Error(`Invalid JSON response: ${e.message}`);
        }
        
        if (!res.ok) throw new Error(data.message || 'Request failed');
        return data;
    } catch (error) {
        if (error.message === 'Network request failed') {
            throw new Error('Cannot connect to server.');
        }
        throw error;
    }
}

export const propertyApi = {
    // Get public property/unit list
    getPropertyList: (token, params = {}) => {
        const query = new URLSearchParams(params).toString();
        return request(`/api/v1/properties/list${query ? `?${query}` : ''}`, {
            method: 'GET',
            headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        });
    },

    // Get saved properties - backend route is /api/v1/saved
    getSavedProperties: (token) =>
        request('/api/v1/saved', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` },
        }),

    // ✅ FIXED: Matches backend route which is registered at /api/v1/save/:type/:id
    saveItem: (token, itemType, itemId) =>
        request(`/api/v1/save/${itemType}/${itemId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
        }),

    // ✅ FIXED: Matches backend route which is registered at /api/v1/save/:type/:id
    unsaveItem: (token, itemType, itemId) =>
        request(`/api/v1/save/${itemType}/${itemId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
        }),

    // Get recommended properties
    getRecommendedProperties: (token, params = {}) => {
        const query = new URLSearchParams(params).toString();
        return request(`/api/v1/properties/recommended${query ? `?${query}` : ''}`, {
            method: 'GET',
            headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        });
    },

    // Get contacted properties
    getContactedProperties: (token) =>
        request('/api/v1/properties/contacted', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` },
        }),

    // Get high growth localities/projects
    getHighGrowthProjects: (token, params = {}) => {
        const query = new URLSearchParams(params).toString();
        return request(`/api/v1/high-growth-projects${query ? `?${query}` : ''}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` },
        });
    },

    // Get property tour price trajectory for a project
    getPriceTrajectory: (token, projectId, params = {}) => {
        const query = new URLSearchParams(params).toString();
        return request(`/api/v1/projects/${encodeURIComponent(projectId)}/price-trajectory${query ? `?${query}` : ''}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` },
        });
    },

    // Get recommended properties based on price appreciation
    getRecommendedProjectsByAppreciation: (token, params = {}) => {
        const query = new URLSearchParams(params).toString();
        return request(`/api/v1/property-tour/recommended${query ? `?${query}` : ''}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` },
        });
    },
};
