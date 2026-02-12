"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { kandangApi, usersApi, sensorDataApi, notificationsApi, activityLogsApi, predictionsApi, getNotificationWsUrl } from "@/lib/api";

// Types
export interface Kandang {
    id: string;
    nama: string;
    kode: string;
    lokasi?: string;
    kapasitas?: number;
    deskripsi?: string;
    is_active: boolean;
    pemilik_id: string;
    pemilik?: {
        id: string;
        full_name: string;
    };
    created_at: string;
    updated_at: string;
    latest_sensor?: {
        suhu: number;
        kelembaban: number;
        amoniak: number;
        populasi: number;
        pakan?: number;
        minum?: number;
        bobot?: number;
        status: string;
    };
}

export interface User {
    id: string;
    username: string;
    email: string;
    full_name: string;
    phone?: string;
    role: string;
    is_active: boolean;
    pemilik_id?: string;
    pemilik?: {
        id: string;
        full_name: string;
    };
    created_at: string;
    updated_at: string;
    last_login?: string;
}

export interface SensorData {
    id: string;
    kandang_id: string;
    kandang?: {
        id: string;
        nama: string;
    };
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
}

export interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    kandang_id?: string;
    kandang?: {
        id: string;
        nama: string;
    };
    is_read: boolean;
    created_at: string;
}

export interface ActivityLog {
    id: string;
    user_id: string;
    user_username?: string;
    user_full_name?: string;
    action: string;
    resource: string;
    resource_id?: string;
    details?: string;
    platform?: string;
    ip_address?: string;
    created_at: string;
}

export interface SensorDataStats {
    avg_suhu: number;
    avg_kelembaban: number;
    avg_amoniak: number;
    total_pakan: number;
    total_minum: number;
    avg_bobot: number;
    total_populasi: number;
    total_death: number;
    data_count: number;
}

export interface ModelInfo {
    classification_model: {
        name: string;
        type: string;
        version: string;
        status: string;
        description: string;
        input_features: string[];
        output_classes: string[];
        metrics: Record<string, string>;
    };
    forecasting_model: {
        name: string;
        type: string;
        version: string;
        status: string;
        description: string;
        input_features: string[];
        window_size: string;
        output: string;
        metrics: Record<string, string>;
    };
}

// Kandang hooks
export function useKandangs() {
    const { data: session, status } = useSession();
    const [data, setData] = useState<{ items: Kandang[]; total: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const hasFetched = useRef(false);

    const refetch = useCallback(async () => {
        if (status === "loading") return;
        if (!session?.accessToken) {
            setLoading(false);
            setError("No access token");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await kandangApi.list({}, session.accessToken);
            if (response && typeof response === "object") {
                // Handle different response formats
                if ("items" in response) {
                    const items = (response as any).items as Kandang[];
                    const total = (response as any).total || items.length;
                    setData({ items, total });
                } else if (Array.isArray(response)) {
                    setData({ items: response as Kandang[], total: response.length });
                } else if ("data" in response && response.data) {
                    const respData = response.data as any;
                    if (Array.isArray(respData)) {
                        setData({ items: respData, total: respData.length });
                    } else {
                        setData({ items: respData.items || [], total: respData.total || 0 });
                    }
                }
            }
        } catch (err) {
            console.error("Kandang fetch error:", err);
            setError(err instanceof Error ? err.message : "Failed to fetch");
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken, status]);

    useEffect(() => {
        if (status === "loading") return;
        if (status === "authenticated" && session?.accessToken && !hasFetched.current) {
            hasFetched.current = true;
            refetch();
        } else if (status === "unauthenticated") {
            setLoading(false);
        }
    }, [status, session?.accessToken, refetch]);

    return { data, loading, error, refetch };
}

export function useKandang(id: string) {
    const { data: session, status } = useSession();
    const [data, setData] = useState<Kandang | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const hasFetched = useRef(false);

    const refetch = useCallback(async () => {
        if (status === "loading" || !id) return;
        if (!session?.accessToken) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await kandangApi.get(id, session.accessToken);
            if (response && typeof response === "object") {
                if ("data" in response && response.data) {
                    setData(response.data as Kandang);
                } else if ("id" in response) {
                    setData(response as unknown as Kandang);
                }
            }
        } catch (err) {
            console.error("Kandang detail fetch error:", err);
            setError(err instanceof Error ? err.message : "Failed to fetch");
        } finally {
            setLoading(false);
        }
    }, [id, session?.accessToken, status]);

    useEffect(() => {
        if (status === "loading") return;
        if (status === "authenticated" && session?.accessToken && !hasFetched.current) {
            hasFetched.current = true;
            refetch();
        } else if (status === "unauthenticated") {
            setLoading(false);
        }
    }, [status, session?.accessToken, refetch]);

    return { data, loading, error, refetch };
}

// Users hooks
export function useUsers(params?: { role?: string; pemilik_id?: string }) {
    const { data: session, status } = useSession();
    const [data, setData] = useState<{ items: User[]; total: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const hasFetched = useRef(false);

    const refetch = useCallback(async () => {
        if (status === "loading") return;
        if (!session?.accessToken) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await usersApi.list(params, session.accessToken);
            if (response && typeof response === "object") {
                if ("items" in response) {
                    const items = (response as any).items as User[];
                    const total = (response as any).total || items.length;
                    setData({ items, total });
                } else if (Array.isArray(response)) {
                    setData({ items: response as User[], total: response.length });
                } else if ("data" in response && response.data) {
                    const respData = response.data as any;
                    if (Array.isArray(respData)) {
                        setData({ items: respData, total: respData.length });
                    } else {
                        setData({ items: respData.items || [], total: respData.total || 0 });
                    }
                }
            }
        } catch (err) {
            console.error("Users fetch error:", err);
            setError(err instanceof Error ? err.message : "Failed to fetch");
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken, status, params?.role, params?.pemilik_id]);

    useEffect(() => {
        if (status === "loading") return;
        if (status === "authenticated" && session?.accessToken && !hasFetched.current) {
            hasFetched.current = true;
            refetch();
        } else if (status === "unauthenticated") {
            setLoading(false);
        }
    }, [status, session?.accessToken, refetch]);

    return { data, loading, error, refetch };
}

export function useUser(id: string) {
    const { data: session, status } = useSession();
    const [data, setData] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const hasFetched = useRef(false);

    const refetch = useCallback(async () => {
        if (status === "loading" || !id) return;
        if (!session?.accessToken) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await usersApi.get(id, session.accessToken);
            if (response && typeof response === "object") {
                if ("data" in response && response.data) {
                    setData(response.data as User);
                } else if ("id" in response) {
                    setData(response as unknown as User);
                }
            }
        } catch (err) {
            console.error("User detail fetch error:", err);
            setError(err instanceof Error ? err.message : "Failed to fetch");
        } finally {
            setLoading(false);
        }
    }, [id, session?.accessToken, status]);

    useEffect(() => {
        if (status === "loading") return;
        if (status === "authenticated" && session?.accessToken && !hasFetched.current) {
            hasFetched.current = true;
            refetch();
        } else if (status === "unauthenticated") {
            setLoading(false);
        }
    }, [status, session?.accessToken, refetch]);

    return { data, loading, error, refetch };
}

// Sensor Data hooks
export function useSensorData(params?: { kandang_id?: string; page?: number }) {
    const { data: session, status } = useSession();
    const [data, setData] = useState<{ items: SensorData[]; total: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const hasFetched = useRef(false);
    const prevKandangId = useRef(params?.kandang_id);

    // Reset hasFetched when kandang_id changes
    useEffect(() => {
        if (prevKandangId.current !== params?.kandang_id) {
            prevKandangId.current = params?.kandang_id;
            hasFetched.current = false;
        }
    }, [params?.kandang_id]);

    const refetch = useCallback(async () => {
        if (status === "loading") return;
        if (!session?.accessToken) {
            setLoading(false);
            return;
        }

        // If no kandang_id, return empty data without making API call
        if (!params?.kandang_id) {
            setData({ items: [], total: 0 });
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await sensorDataApi.list(params, session.accessToken);
            if (response && typeof response === "object") {
                if ("items" in response) {
                    const items = (response as any).items as SensorData[];
                    const total = (response as any).total || items.length;
                    setData({ items, total });
                } else if (Array.isArray(response)) {
                    setData({ items: response as SensorData[], total: response.length });
                } else if ("data" in response && response.data) {
                    const respData = response.data as any;
                    if (Array.isArray(respData)) {
                        setData({ items: respData, total: respData.length });
                    } else {
                        setData({ items: respData.items || [], total: respData.total || 0 });
                    }
                }
            }
        } catch (err) {
            console.error("Sensor data fetch error:", err);
            setError(err instanceof Error ? err.message : "Failed to fetch");
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken, status, params?.kandang_id, params?.page]);

    useEffect(() => {
        if (status === "loading") return;
        if (status === "authenticated" && session?.accessToken && !hasFetched.current) {
            hasFetched.current = true;
            refetch();
        } else if (status === "unauthenticated") {
            setLoading(false);
        }
    }, [status, session?.accessToken, refetch]);

    return { data, loading, error, refetch };
}

// Notifications hooks
export function useNotifications() {
    const { data: session, status } = useSession();
    const [data, setData] = useState<{ items: Notification[]; unread_count: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const hasFetched = useRef(false);

    const refetch = useCallback(async () => {
        if (status === "loading") return;
        if (!session?.accessToken) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await notificationsApi.list({}, session.accessToken);
            if (response && typeof response === "object") {
                if (Array.isArray(response)) {
                    setData({ items: response as Notification[], unread_count: (response as Notification[]).filter(n => !n.is_read).length });
                } else if ("data" in response && Array.isArray(response.data)) {
                    const items = response.data as Notification[];
                    setData({ items, unread_count: items.filter(n => !n.is_read).length });
                } else if ("items" in response && Array.isArray(response.items)) {
                    const items = (response as { items: Notification[] }).items;
                    setData({ items, unread_count: items.filter(n => !n.is_read).length });
                } else if ("notifications" in response && Array.isArray((response as any).notifications)) {
                    const items = (response as any).notifications as Notification[];
                    setData({ items, unread_count: (response as any).unread_count || items.filter(n => !n.is_read).length });
                }
            }
        } catch (err) {
            console.error("Notifications fetch error:", err);
            setError(err instanceof Error ? err.message : "Failed to fetch");
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken, status]);

    useEffect(() => {
        if (status === "loading") return;
        if (status === "authenticated" && session?.accessToken && !hasFetched.current) {
            hasFetched.current = true;
            refetch();
        } else if (status === "unauthenticated") {
            setLoading(false);
        }
    }, [status, session?.accessToken, refetch]);

    return { data, loading, error, refetch };
}

// Mutation hooks
export function useDeleteKandang() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(
        async (id: string): Promise<{ success: boolean }> => {
            if (!session?.accessToken) {
                return { success: false };
            }

            setLoading(true);
            setError(null);

            try {
                await kandangApi.delete(id, session.accessToken);
                return { success: true };
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to delete");
                return { success: false };
            } finally {
                setLoading(false);
            }
        },
        [session?.accessToken]
    );

    return { mutate, loading, error };
}

export function useCreateKandang() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(
        async (data: any): Promise<{ success: boolean; data?: Kandang; error?: string }> => {
            if (!session?.accessToken) {
                return { success: false, error: "No access token" };
            }

            setLoading(true);
            setError(null);

            try {
                const response = await kandangApi.create(data, session.accessToken);
                return { success: true, data: response as unknown as Kandang };
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : "Failed to create";
                setError(errorMsg);
                return { success: false, error: errorMsg };
            } finally {
                setLoading(false);
            }
        },
        [session?.accessToken]
    );

    return { mutate, loading, error };
}

export function useUpdateKandang() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(
        async (id: string, data: any): Promise<{ success: boolean; error?: string }> => {
            if (!session?.accessToken) {
                return { success: false, error: "No access token" };
            }

            setLoading(true);
            setError(null);

            try {
                await kandangApi.update(id, data, session.accessToken);
                return { success: true };
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : "Failed to update";
                setError(errorMsg);
                return { success: false, error: errorMsg };
            } finally {
                setLoading(false);
            }
        },
        [session?.accessToken]
    );

    return { mutate, loading, error };
}

export function useDeleteUser() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(
        async (id: string): Promise<{ success: boolean }> => {
            if (!session?.accessToken) {
                return { success: false };
            }

            setLoading(true);
            setError(null);

            try {
                await usersApi.delete(id, session.accessToken);
                return { success: true };
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to delete");
                return { success: false };
            } finally {
                setLoading(false);
            }
        },
        [session?.accessToken]
    );

    return { mutate, loading, error };
}

export function useCreateUser() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(
        async (data: any): Promise<{ success: boolean; data?: User; error?: string }> => {
            if (!session?.accessToken) {
                return { success: false, error: "No access token" };
            }

            setLoading(true);
            setError(null);

            try {
                const response = await usersApi.create(data, session.accessToken);
                return { success: true, data: response as unknown as User };
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : "Failed to create";
                setError(errorMsg);
                return { success: false, error: errorMsg };
            } finally {
                setLoading(false);
            }
        },
        [session?.accessToken]
    );

    return { mutate, loading, error };
}

export function useCreatePeternak() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(
        async (data: Parameters<typeof usersApi.createPeternak>[0]): Promise<{ success: boolean; data?: User }> => {
            if (!session?.accessToken) {
                return { success: false };
            }

            setLoading(true);
            setError(null);

            try {
                const response = await usersApi.createPeternak(data, session.accessToken);
                return { success: true, data: response as unknown as User };
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to create");
                return { success: false };
            } finally {
                setLoading(false);
            }
        },
        [session?.accessToken]
    );

    return { mutate, loading, error };
}

export function useUpdateUser() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(
        async (id: string, data: Parameters<typeof usersApi.update>[1]): Promise<{ success: boolean; error?: string }> => {
            if (!session?.accessToken) {
                return { success: false, error: "No access token" };
            }

            setLoading(true);
            setError(null);

            try {
                await usersApi.update(id, data, session.accessToken);
                return { success: true };
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : "Failed to update";
                setError(errorMsg);
                return { success: false, error: errorMsg };
            } finally {
                setLoading(false);
            }
        },
        [session?.accessToken]
    );

    return { mutate, loading, error };
}

export function useCreateSensorData() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(
        async (data: any): Promise<{ success: boolean; data?: SensorData; error?: string }> => {
            if (!session?.accessToken) {
                return { success: false, error: "No access token" };
            }

            setLoading(true);
            setError(null);

            try {
                const response = await sensorDataApi.create(data, session.accessToken);
                return { success: true, data: response as unknown as SensorData };
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : "Failed to create sensor data";
                setError(errorMsg);
                return { success: false, error: errorMsg };
            } finally {
                setLoading(false);
            }
        },
        [session?.accessToken]
    );

    return { mutate, loading, error };
}

export function useMarkNotificationAsRead() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(
        async (id: string): Promise<{ success: boolean }> => {
            if (!session?.accessToken) {
                return { success: false };
            }

            setLoading(true);
            setError(null);

            try {
                await notificationsApi.markAsRead(id, session.accessToken);
                return { success: true };
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to mark as read");
                return { success: false };
            } finally {
                setLoading(false);
            }
        },
        [session?.accessToken]
    );

    return { mutate, loading, error };
}

export function useMarkAllNotificationsAsRead() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(
        async (): Promise<{ success: boolean }> => {
            if (!session?.accessToken) {
                return { success: false };
            }

            setLoading(true);
            setError(null);

            try {
                await notificationsApi.markAllAsRead(session.accessToken);
                return { success: true };
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to mark all as read");
                return { success: false };
            } finally {
                setLoading(false);
            }
        },
        [session?.accessToken]
    );

    return { mutate, loading, error };
}

// Activity Logs hooks
export function useActivityLogs(params?: { page?: number; per_page?: number; action?: string; resource?: string }) {
    const { data: session, status } = useSession();
    const [data, setData] = useState<{ items: ActivityLog[]; total: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const hasFetched = useRef(false);

    const refetch = useCallback(async () => {
        if (status === "loading") return;
        if (!session?.accessToken) {
            setLoading(false);
            setError("No access token");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await activityLogsApi.list(params, session.accessToken);
            if (response && typeof response === "object") {
                if ("items" in response) {
                    const items = (response as any).items as ActivityLog[];
                    const total = (response as any).total || items.length;
                    setData({ items, total });
                } else if (Array.isArray(response)) {
                    setData({ items: response as ActivityLog[], total: response.length });
                } else if ("data" in response && response.data) {
                    const respData = response.data as any;
                    if (Array.isArray(respData)) {
                        setData({ items: respData, total: respData.length });
                    } else {
                        setData({ items: respData.items || [], total: respData.total || 0 });
                    }
                }
            }
        } catch (err) {
            console.error("Activity logs fetch error:", err);
            setError(err instanceof Error ? err.message : "Failed to fetch");
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken, status, params?.page, params?.per_page, params?.action, params?.resource]);

    useEffect(() => {
        if (status === "loading") return;
        if (status === "authenticated" && session?.accessToken && !hasFetched.current) {
            hasFetched.current = true;
            refetch();
        } else if (status === "unauthenticated") {
            setLoading(false);
        }
    }, [status, session?.accessToken, refetch]);

    return { data, loading, error, refetch };
}

export function useMyActivityLogs(params?: { page?: number; per_page?: number }) {
    const { data: session, status } = useSession();
    const [data, setData] = useState<{ items: ActivityLog[]; total: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const hasFetched = useRef(false);

    const refetch = useCallback(async () => {
        if (status === "loading") return;
        if (!session?.accessToken) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await activityLogsApi.getMyLogs(params, session.accessToken);
            if (response && typeof response === "object") {
                if ("items" in response) {
                    const items = (response as any).items as ActivityLog[];
                    const total = (response as any).total || items.length;
                    setData({ items, total });
                } else if (Array.isArray(response)) {
                    setData({ items: response as ActivityLog[], total: response.length });
                } else if ("data" in response && response.data) {
                    const respData = response.data as any;
                    if (Array.isArray(respData)) {
                        setData({ items: respData, total: respData.length });
                    } else {
                        setData({ items: respData.items || [], total: respData.total || 0 });
                    }
                }
            }
        } catch (err) {
            console.error("My activity logs fetch error:", err);
            setError(err instanceof Error ? err.message : "Failed to fetch");
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken, status, params?.page, params?.per_page]);

    useEffect(() => {
        if (status === "loading") return;
        if (status === "authenticated" && session?.accessToken && !hasFetched.current) {
            hasFetched.current = true;
            refetch();
        } else if (status === "unauthenticated") {
            setLoading(false);
        }
    }, [status, session?.accessToken, refetch]);

    return { data, loading, error, refetch };
}

// Sensor Data additional hooks
export function useUpdateSensorData() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(
        async (id: string, data: {
            pakan?: number;
            minum?: number;
            bobot?: number;
            populasi?: number;
            death?: number;
        }): Promise<{ success: boolean; error?: string }> => {
            if (!session?.accessToken) {
                return { success: false, error: "No access token" };
            }

            setLoading(true);
            setError(null);

            try {
                await sensorDataApi.updateManual(id, data, session.accessToken);
                return { success: true };
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : "Failed to update sensor data";
                setError(errorMsg);
                return { success: false, error: errorMsg };
            } finally {
                setLoading(false);
            }
        },
        [session?.accessToken]
    );

    return { mutate, loading, error };
}

export function useSensorDataStats(kandangId?: string, hours?: number) {
    const { data: session, status } = useSession();
    const [data, setData] = useState<SensorDataStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const hasFetched = useRef(false);

    const refetch = useCallback(async () => {
        if (status === "loading" || !kandangId) return;
        if (!session?.accessToken) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await sensorDataApi.getStats(kandangId, hours, session.accessToken);
            if (response && typeof response === "object") {
                if ("data" in response && response.data) {
                    setData(response.data as SensorDataStats);
                } else {
                    setData(response as unknown as SensorDataStats);
                }
            }
        } catch (err) {
            console.error("Sensor stats fetch error:", err);
            setError(err instanceof Error ? err.message : "Failed to fetch stats");
        } finally {
            setLoading(false);
        }
    }, [kandangId, hours, session?.accessToken, status]);

    useEffect(() => {
        if (status === "loading" || !kandangId) return;
        if (status === "authenticated" && session?.accessToken && !hasFetched.current) {
            hasFetched.current = true;
            refetch();
        } else if (status === "unauthenticated") {
            setLoading(false);
        }
    }, [status, session?.accessToken, refetch, kandangId]);

    return { data, loading, error, refetch };
}

// Model Info hooks
export function useModelInfo() {
    const { data: session, status } = useSession();
    const [data, setData] = useState<ModelInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const hasFetched = useRef(false);

    const refetch = useCallback(async () => {
        if (status === "loading") return;
        if (!session?.accessToken) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await predictionsApi.getModels(session.accessToken);
            if (response && typeof response === "object") {
                if ("data" in response && response.data) {
                    setData(response.data as ModelInfo);
                } else {
                    setData(response as unknown as ModelInfo);
                }
            }
        } catch (err) {
            console.error("Model info fetch error:", err);
            setError(err instanceof Error ? err.message : "Failed to fetch model info");
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken, status]);

    useEffect(() => {
        if (status === "loading") return;
        if (status === "authenticated" && session?.accessToken && !hasFetched.current) {
            hasFetched.current = true;
            refetch();
        } else if (status === "unauthenticated") {
            setLoading(false);
        }
    }, [status, session?.accessToken, refetch]);

    return { data, loading, error, refetch };
}

export function useReloadModels() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(
        async (): Promise<{ success: boolean; error?: string }> => {
            if (!session?.accessToken) {
                return { success: false, error: "No access token" };
            }

            setLoading(true);
            setError(null);

            try {
                await predictionsApi.reloadModels(session.accessToken);
                return { success: true };
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : "Failed to reload models";
                setError(errorMsg);
                return { success: false, error: errorMsg };
            } finally {
                setLoading(false);
            }
        },
        [session?.accessToken]
    );

    return { mutate, loading, error };
}

// WebSocket Notification hook
export function useNotificationWebSocket(
    onNotification?: (notification: any) => void
) {
    const { data: session, status } = useSession();
    const wsRef = useRef<WebSocket | null>(null);
    const [connected, setConnected] = useState(false);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const onNotificationRef = useRef(onNotification);

    // Keep callback ref up to date without re-triggering connect
    useEffect(() => {
        onNotificationRef.current = onNotification;
    }, [onNotification]);

    const connect = useCallback(() => {
        if (status !== "authenticated" || !session?.accessToken) return;

        // Close existing connection
        if (wsRef.current) {
            wsRef.current.close();
        }

        try {
            const wsUrl = getNotificationWsUrl(session.accessToken);
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log("🔔 Notification WebSocket connected");
                setConnected(true);

                // Start ping keep-alive every 30 seconds
                pingIntervalRef.current = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send("ping");
                    }
                }, 30000);
            };

            ws.onmessage = (event) => {
                try {
                    // Ignore pong responses
                    if (event.data === "pong") return;

                    const message = JSON.parse(event.data);

                    // Backend sends: { type: "notification", data: { ... } }
                    if (onNotificationRef.current) {
                        if (message.type === "notification" && message.data) {
                            onNotificationRef.current(message.data);
                        } else {
                            // Direct notification object
                            onNotificationRef.current(message);
                        }
                    }
                } catch (e) {
                    console.error("WS message parse error:", e);
                }
            };

            ws.onclose = (event) => {
                console.log("🔔 Notification WebSocket disconnected", event.code);
                setConnected(false);

                // Clear ping interval
                if (pingIntervalRef.current) {
                    clearInterval(pingIntervalRef.current);
                }

                // Auto-reconnect after 5 seconds (unless intentionally closed)
                if (event.code !== 1000 && event.code !== 4001) {
                    reconnectTimeoutRef.current = setTimeout(() => {
                        connect();
                    }, 5000);
                }
            };

            ws.onerror = (err) => {
                console.error("WS error:", err);
            };

            wsRef.current = ws;
        } catch (err) {
            console.error("Failed to create WebSocket:", err);
        }
    }, [status, session?.accessToken]);

    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close(1000);
                wsRef.current = null;
            }
        };
    }, [connect]);

    return { connected };
}
