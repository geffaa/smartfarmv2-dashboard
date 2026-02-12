"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNotifications, useMarkNotificationAsRead, useMarkAllNotificationsAsRead, Notification } from "@/hooks/useApi";

export default function NotificationsPage() {
    const { status } = useSession();
    const { data: notifData, loading, error, refetch } = useNotifications();
    const { mutate: markAsRead } = useMarkNotificationAsRead();
    const { mutate: markAllAsRead, loading: markingAll } = useMarkAllNotificationsAsRead();

    const [localReadIds, setLocalReadIds] = useState<Set<string>>(new Set());
    const [filter, setFilter] = useState<"all" | "unread">("all");

    if (status === "loading" || loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
        );
    }

    const notifications = notifData?.items || [];
    const unreadCount = notifications.filter(n => !n.is_read && !localReadIds.has(n.id)).length;

    const filteredNotifications = filter === "unread"
        ? notifications.filter(n => !n.is_read && !localReadIds.has(n.id))
        : notifications;

    const handleMarkAsRead = async (id: string) => {
        setLocalReadIds(prev => new Set([...prev, id]));
        await markAsRead(id);
    };

    const handleMarkAllAsRead = async () => {
        const result = await markAllAsRead();
        if (result.success) {
            const allIds = new Set(notifications.map(n => n.id));
            setLocalReadIds(allIds);
            refetch();
        }
    };

    const formatTimeAgo = (dateString: string) => {
        const now = new Date();
        const date = new Date(dateString);
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 60) return `${diffMins} menit lalu`;
        if (diffHours < 24) return `${diffHours} jam lalu`;
        return `${diffDays} hari lalu`;
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "alert":
            case "abnormal_classification":
                return (
                    <div className="p-2 rounded-full bg-yellow-50">
                        <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                );
            case "danger":
            case "death_forecast":
                return (
                    <div className="p-2 rounded-full bg-red-50">
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                );
            case "prediction":
                return (
                    <div className="p-2 rounded-full bg-purple-50">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                    </div>
                );
            case "success":
                return (
                    <div className="p-2 rounded-full bg-green-50">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                );
            default:
                return (
                    <div className="p-2 rounded-full bg-blue-50">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </div>
                );
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Notifikasi</h1>
                    <p className="text-gray-500 mt-1">
                        {unreadCount > 0 ? `${unreadCount} notifikasi belum dibaca` : "Semua notifikasi sudah dibaca"}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <Button variant="secondary" onClick={handleMarkAllAsRead} disabled={markingAll}>
                        {markingAll ? "Memproses..." : "Tandai Semua Dibaca"}
                    </Button>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm">❌ Gagal mengambil notifikasi: {error}</p>
                </div>
            )}

            {/* Filters */}
            {notifications.length > 0 && (
                <div className="flex gap-2">
                    <Button
                        variant={filter === "all" ? "primary" : "secondary"}
                        onClick={() => setFilter("all")}
                        className="!px-4 !py-2"
                    >
                        Semua ({notifications.length})
                    </Button>
                    <Button
                        variant={filter === "unread" ? "primary" : "secondary"}
                        onClick={() => setFilter("unread")}
                        className="!px-4 !py-2"
                    >
                        Belum Dibaca ({unreadCount})
                    </Button>
                </div>
            )}

            {/* Empty State */}
            {!error && notifications.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada notifikasi</h3>
                        <p className="text-gray-500">Notifikasi dari sistem akan muncul di sini</p>
                    </CardContent>
                </Card>
            )}

            {/* Notifications List */}
            {filteredNotifications.length > 0 && (
                <Card>
                    <CardContent className="p-0 divide-y divide-gray-100">
                        {filteredNotifications.map((notification: Notification) => {
                            const isRead = notification.is_read || localReadIds.has(notification.id);
                            return (
                                <div
                                    key={notification.id}
                                    className={`p-4 flex gap-4 ${isRead ? "bg-white" : "bg-green-50/50"}`}
                                >
                                    {getTypeIcon(notification.type)}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className={`text-sm ${isRead ? "text-gray-700" : "font-medium text-gray-900"}`}>
                                                    {notification.title}
                                                </p>
                                                <p className="text-sm text-gray-500 mt-1">{notification.message}</p>
                                                {notification.kandang && (
                                                    <Badge variant="default" className="mt-2">
                                                        {notification.kandang.nama}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <span className="text-xs text-gray-400 whitespace-nowrap">
                                                    {formatTimeAgo(notification.created_at)}
                                                </span>
                                                {!isRead && (
                                                    <button
                                                        onClick={() => handleMarkAsRead(notification.id)}
                                                        className="text-xs text-green-600 hover:text-green-700"
                                                    >
                                                        Tandai dibaca
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}

            {/* No results for filter */}
            {filter === "unread" && filteredNotifications.length === 0 && notifications.length > 0 && (
                <Card>
                    <CardContent className="py-8 text-center">
                        <p className="text-gray-500">Tidak ada notifikasi yang belum dibaca</p>
                        <Button variant="secondary" className="mt-4" onClick={() => setFilter("all")}>
                            Lihat Semua Notifikasi
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
