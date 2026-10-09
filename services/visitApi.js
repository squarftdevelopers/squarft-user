import { BASE_URL } from './config';

async function request(path, token, options = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
        method: options.method ?? 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        },
        ...(options.body && { body: options.body }),
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
}

const query = (params) =>
    Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');

export const visitApi = {
    // Get list of visits by status
    getVisitList: (token, status) =>
        request(`/api/v1/visits/list?${query({ status })}`, token),

    // Get branches by city
    getBranchList: (token, city) =>
        request(`/api/v1/visits/branches?${query({ city })}`, token),

    // Get available time slots
    getAvailableSlots: (token, property_id, date, branch_id, property_count = 1) =>
        request(`/api/v1/visits/slots?${query({ property_id, date, branch_id, property_count })}`, token),

    // Get available sales officers for a selected slot
    getAvailableOfficers: (token, property_id, slot_start, branch_id, property_count = 1) =>
        request(`/api/v1/visits/available-officers?${query({ property_id, slot_start, branch_id, property_count })}`, token),

    // Create site visit
    createSiteVisit: (token, visitData) =>
        request('/api/v1/visits', token, {
            method: 'POST',
            body: JSON.stringify(visitData),
        }),

    // Update site visit
    updateSiteVisit: (token, visitId, updateData) =>
        request(`/api/v1/visits/${visitId}`, token, {
            method: 'PUT',
            body: JSON.stringify(updateData),
        }),

    submitReview: (token, visitId, reviewData) =>
        request(`/api/v1/visits/${visitId}/review`, token, {
            method: 'POST',
            body: JSON.stringify(reviewData),
        }),
};
