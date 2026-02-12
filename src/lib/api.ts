import { ApiResponse, PaginatedResponse } from "@/types";
import { getSession } from "next-auth/react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface FetchOptions extends RequestInit {
    token?: string;
}

async function fetchWithAuth<T>(
    endpoint: string,
    options: FetchOptions = {}
): Promise<ApiResponse<T>> {
    const { token, ...fetchOptions } = options;

    let authToken = token;

    // Get token from session if not provided
    if (!authToken && typeof window !== "undefined") {
        const session = await getSession();
        authToken = session?.accessToken;
    }

    const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
        ...fetchOptions.headers,
    };

    const res = await fetch(`${API_URL}${endpoint}`, {
        ...fetchOptions,
        headers,
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.message || "API request failed");
    }

    return data;
}

// Auth API
export const authApi = {
    login: async (username: string, password: string) => {
        return fetchWithAuth<{
            user: {
                id: string;
                email: string;
                username: string;
                full_name: string;
                role: string;
                pemilik_id?: string;
            };
            access_token: string;
            refresh_token: string;
            expires_in: number;
        }>("/api/v1/auth/login", {
            method: "POST",
            body: JSON.stringify({ username, password }),
        });
    },

    me: async (token?: string) => {
        return fetchWithAuth<{
            id: string;
            email: string;
            username: string;
            full_name: string;
            role: string;
        }>("/api/v1/auth/me", { token });
    },

    changePassword: async (
        oldPassword: string,
        newPassword: string,
        confirmPassword: string,
        token?: string
    ) => {
        return fetchWithAuth("/api/v1/auth/change-password", {
            method: "POST",
            body: JSON.stringify({
                old_password: oldPassword,
                new_password: newPassword,
                confirm_password: confirmPassword,
            }),
            token,
        });
    },

    logout: async (token?: string) => {
        return fetchWithAuth("/api/v1/auth/logout", {
            method: "POST",
            token,
        });
    },
};

// Users API
export const usersApi = {
    list: async (params?: {
        page?: number;
        per_page?: number;
        role?: string;
        pemilik_id?: string;
        is_active?: boolean;
        search?: string;
    }, token?: string) => {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.set("page", params.page.toString());
        if (params?.per_page) searchParams.set("per_page", params.per_page.toString());
        if (params?.role) searchParams.set("role", params.role);
        if (params?.pemilik_id) searchParams.set("pemilik_id", params.pemilik_id);
        if (params?.is_active !== undefined) searchParams.set("is_active", params.is_active.toString());
        if (params?.search) searchParams.set("search", params.search);

        const query = searchParams.toString();
        return fetchWithAuth(`/api/v1/users${query ? `?${query}` : ""}`, { token });
    },

    get: async (id: string, token?: string) => {
        return fetchWithAuth(`/api/v1/users/${id}`, { token });
    },

    create: async (userData: {
        email: string;
        username: string;
        full_name: string;
        phone?: string;
        password: string;
        role: string;
        pemilik_id?: string;
    }, token?: string) => {
        return fetchWithAuth("/api/v1/users", {
            method: "POST",
            body: JSON.stringify(userData),
            token,
        });
    },

    createPeternak: async (peternakData: {
        email: string;
        username: string;
        full_name: string;
        phone?: string;
        password: string;
    }, token?: string) => {
        return fetchWithAuth("/api/v1/users/me/peternaks", {
            method: "POST",
            body: JSON.stringify(peternakData),
            token,
        });
    },

    update: async (id: string, userData: {
        email?: string;
        username?: string;
        full_name?: string;
        phone?: string;
        is_active?: boolean;
        pemilik_id?: string;
    }, token?: string) => {
        return fetchWithAuth(`/api/v1/users/${id}`, {
            method: "PUT",
            body: JSON.stringify(userData),
            token,
        });
    },

    delete: async (id: string, token?: string) => {
        return fetchWithAuth(`/api/v1/users/${id}`, {
            method: "DELETE",
            token,
        });
    },

    getPeternaksByPemilik: async (pemilikId: string, token?: string) => {
        return fetchWithAuth(`/api/v1/users/pemilik/${pemilikId}/peternaks`, { token });
    },
};

// Kandang API
export const kandangApi = {
    list: async (params?: {
        page?: number;
        per_page?: number;
        pemilik_id?: string;
        is_active?: boolean;
    }, token?: string) => {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.set("page", params.page.toString());
        if (params?.per_page) searchParams.set("per_page", params.per_page.toString());
        if (params?.pemilik_id) searchParams.set("pemilik_id", params.pemilik_id);
        if (params?.is_active !== undefined) searchParams.set("is_active", params.is_active.toString());

        const query = searchParams.toString();
        return fetchWithAuth(`/api/v1/kandangs${query ? `?${query}` : ""}`, { token });
    },

    get: async (id: string, token?: string) => {
        return fetchWithAuth(`/api/v1/kandangs/${id}`, { token });
    },

    create: async (kandangData: {
        nama: string;
        kode: string;
        lokasi?: string;
        kapasitas?: number;
        deskripsi?: string;
        pemilik_id: string;
    }, token?: string) => {
        return fetchWithAuth("/api/v1/kandangs", {
            method: "POST",
            body: JSON.stringify(kandangData),
            token,
        });
    },

    update: async (id: string, kandangData: {
        nama?: string;
        lokasi?: string;
        kapasitas?: number;
        deskripsi?: string;
        is_active?: boolean;
    }, token?: string) => {
        return fetchWithAuth(`/api/v1/kandangs/${id}`, {
            method: "PUT",
            body: JSON.stringify(kandangData),
            token,
        });
    },

    delete: async (id: string, token?: string) => {
        return fetchWithAuth(`/api/v1/kandangs/${id}`, {
            method: "DELETE",
            token,
        });
    },
};

// Sensor Data API
export const sensorDataApi = {
    list: async (params?: {
        kandang_id?: string;
        page?: number;
        page_size?: number;
        start_date?: string;
        end_date?: string;
    }, token?: string) => {
        if (!params?.kandang_id) {
            // No kandang_id means we can't fetch — return empty result
            return { success: true, data: { items: [], total: 0, page: 1, page_size: 50 } };
        }

        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.set("page", params.page.toString());
        if (params?.page_size) searchParams.set("page_size", params.page_size.toString());
        if (params?.start_date) searchParams.set("start_time", params.start_date);
        if (params?.end_date) searchParams.set("end_time", params.end_date);

        const query = searchParams.toString();
        return fetchWithAuth(`/api/v1/sensor-data/kandang/${params.kandang_id}${query ? `?${query}` : ""}`, { token });
    },

    get: async (id: string, token?: string) => {
        return fetchWithAuth(`/api/v1/sensor-data/${id}`, { token });
    },

    create: async (sensorData: {
        kandang_id: string;
        timestamp: string;
        hari_ke: number;
        suhu: number;
        kelembaban: number;
        amoniak: number;
        pakan?: number;
        minum?: number;
        bobot?: number;
        populasi?: number;
        death?: number;
    }, token?: string) => {
        return fetchWithAuth("/api/v1/sensor-data", {
            method: "POST",
            body: JSON.stringify(sensorData),
            token,
        });
    },

    updateManual: async (id: string, data: {
        pakan?: number;
        minum?: number;
        bobot?: number;
        populasi?: number;
        death?: number;
    }, token?: string) => {
        return fetchWithAuth(`/api/v1/sensor-data/${id}/manual`, {
            method: "PUT",
            body: JSON.stringify(data),
            token,
        });
    },

    getLatest: async (kandangId: string, limit?: number, token?: string) => {
        const searchParams = new URLSearchParams();
        if (limit) searchParams.set("limit", limit.toString());
        const query = searchParams.toString();
        return fetchWithAuth(`/api/v1/sensor-data/kandang/${kandangId}/latest${query ? `?${query}` : ""}`, { token });
    },

    getStats: async (kandangId: string, hours?: number, token?: string) => {
        const searchParams = new URLSearchParams();
        if (hours) searchParams.set("hours", hours.toString());
        const query = searchParams.toString();
        return fetchWithAuth(`/api/v1/sensor-data/kandang/${kandangId}/stats${query ? `?${query}` : ""}`, { token });
    },
};

// Predictions API
export const predictionsApi = {
    classify: async (data: {
        kandang_id: string;
        suhu: number;
        kelembaban: number;
        amoniak: number;
        hari_ke: number;
    }, token?: string) => {
        return fetchWithAuth("/api/v1/predictions/classify", {
            method: "POST",
            body: JSON.stringify(data),
            token,
        });
    },

    forecast: async (data: {
        kandang_id: string;
    }, token?: string) => {
        return fetchWithAuth("/api/v1/predictions/forecast", {
            method: "POST",
            body: JSON.stringify(data),
            token,
        });
    },

    getModels: async (token?: string) => {
        return fetchWithAuth("/api/v1/predictions/models", { token });
    },

    reloadModels: async (token?: string) => {
        return fetchWithAuth("/api/v1/predictions/load-models", {
            method: "POST",
            token,
        });
    },
};

// Notifications API
export const notificationsApi = {
    list: async (params?: {
        unread_only?: boolean;
        limit?: number;
    }, token?: string) => {
        const searchParams = new URLSearchParams();
        if (params?.unread_only) searchParams.set("unread_only", "true");
        if (params?.limit) searchParams.set("limit", params.limit.toString());

        const query = searchParams.toString();
        return fetchWithAuth(`/api/v1/notifications${query ? `?${query}` : ""}`, { token });
    },

    getUnreadCount: async (token?: string) => {
        return fetchWithAuth("/api/v1/notifications/unread-count", { token });
    },

    markAsRead: async (id: string, token?: string) => {
        return fetchWithAuth(`/api/v1/notifications/${id}/read`, {
            method: "PUT",
            token,
        });
    },

    markAllAsRead: async (token?: string) => {
        return fetchWithAuth("/api/v1/notifications/read-all", {
            method: "PUT",
            token,
        });
    },
};

// Activity Logs API
export const activityLogsApi = {
    list: async (params?: {
        page?: number;
        per_page?: number;
        user_id?: string;
        action?: string;
        resource?: string;
        platform?: string;
        start_date?: string;
        end_date?: string;
    }, token?: string) => {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.set("page", params.page.toString());
        if (params?.per_page) searchParams.set("per_page", params.per_page.toString());
        if (params?.user_id) searchParams.set("user_id", params.user_id);
        if (params?.action) searchParams.set("action", params.action);
        if (params?.resource) searchParams.set("resource", params.resource);
        if (params?.platform) searchParams.set("platform", params.platform);
        if (params?.start_date) searchParams.set("start_date", params.start_date);
        if (params?.end_date) searchParams.set("end_date", params.end_date);

        const query = searchParams.toString();
        return fetchWithAuth(`/api/v1/activity-logs${query ? `?${query}` : ""}`, { token });
    },

    getMyLogs: async (params?: {
        page?: number;
        per_page?: number;
    }, token?: string) => {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.set("page", params.page.toString());
        if (params?.per_page) searchParams.set("per_page", params.per_page.toString());

        const query = searchParams.toString();
        return fetchWithAuth(`/api/v1/activity-logs/me${query ? `?${query}` : ""}`, { token });
    },
};

// WebSocket URL helper
export const getNotificationWsUrl = (token: string) => {
    const wsBase = API_URL.replace(/^http/, "ws");
    return `${wsBase}/api/v1/notifications/ws?token=${token}`;
};
