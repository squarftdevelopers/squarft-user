import { BASE_URL } from './config';

async function request(path, token = null, options = {}) {
    try {
        const url = `${BASE_URL}${path}`;
        
        
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        const res = await fetch(url, {
            method: options.method || 'GET',
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined,
        });
        
        
        
        const text = await res.text();
        
        
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
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

function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
}

export const projectApi = {
    // Get all projects (for search suggestions)
    listProjects: async (token) => {
        const res = await request('/api/v1/projects/list', token);
        
        return res;
    },

    // Get project details. Prefer the UUID endpoint because /overview/:slug currently has a backend SQL issue.
    getProjectDetails: async (projectRef,token) => {
        const path = isUuid(projectRef)
            ? `/api/v1/projects/${encodeURIComponent(projectRef)}`
            : `/api/v1/overview/${encodeURIComponent(projectRef)}`;
        const res = await request(path, token);
        
        return res;
    },

    // Get project floor plans by slug
    getProjectFloorPlans: async (slug, token) => {
        const res = await request(`/api/v1/overview/${slug}/floor-plans`, token);
        
        return res;
    },

    
    // Get resale properties in a project
    getProjectResale: (slug, token) =>
        request(`/api/v1/overview/${slug}/resale`, token),

    // Get project landmarks
    getProjectLandmarks: (slug, token) =>
        request(`/api/v1/highlights/${slug}/landmarks`, token),

    // Get project amenities
    getProjectAmenities: (slug, token) =>
        request(`/api/v1/highlights/${slug}/amenities`, token),

    // Get similar properties
    getSimilarProperties: (slug, token) =>
        request(`/api/v1/overview/${slug}/similar`, token),

    // Get featured projects
    getFeaturedProjects: (params = {}, token) => {
        const query = new URLSearchParams(params).toString();
        return request(`/api/v1/projects/featured${query ? `?${query}` : ''}`, token);
    },

    // Get projects close to the user's current coordinates
    getNearbyProjects: ({ latitude, longitude }, token) =>
        request(`/api/v1/projects/nearby?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}`, token),

    recordProjectView: (projectId, token) =>
        request(`/api/v1/projects/${encodeURIComponent(projectId)}/view`, token, { method: 'POST' }),

    getRecentProjectViews: (token) =>
        request('/api/v1/projects/activity/recent', token),

    getSeenProjectViews: (token) =>
        request('/api/v1/projects/activity/seen', token),
};
