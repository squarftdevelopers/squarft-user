import { BASE_URL } from "./config";

async function request(path, token, options = {}) {
    console.log("[NotificationApi] Request started", {
        path,
        method: options.method || "GET",
        hasAuthToken: Boolean(token),
        baseUrl: BASE_URL,
    });

    const response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    console.log("[NotificationApi] Response received", {
        path,
        method: options.method || "GET",
        status: response.status,
        ok: response.ok,
        message: data.message || null,
    });

    if (!response.ok) {
        console.warn("[NotificationApi] Request failed", {
            path,
            method: options.method || "GET",
            status: response.status,
            message: data.message || "Notification request failed",
        });
        throw new Error(data.message || "Notification request failed");
    }

    return data;
}

export const notificationApi = {
    list: (token, page = 1) => request(`/api/v1/notifications?page=${page}&limit=20`, token),
    markRead: (token, id) => request(`/api/v1/notifications/${encodeURIComponent(id)}/read`, token, { method: 'PATCH' }),
    markAllRead: (token) => request('/api/v1/notifications/read-all', token, { method: 'PATCH' }),
    registerPushToken: (token, payload) =>
        request("/api/v1/push-tokens/register", token, {
            method: "POST",
            body: JSON.stringify(payload),
        }),

    unregisterPushToken: (token, payload) =>
        request("/api/v1/push-tokens/register", token, {
            method: "DELETE",
            body: JSON.stringify(payload),
        }),
};
