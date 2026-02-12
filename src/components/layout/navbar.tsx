"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { notificationsApi } from "@/lib/api";
import { useRealtimeNotifications } from "@/components/notification-provider";
import Link from "next/link";

export function Navbar() {
    const { data: session } = useSession();
    const [unreadCount, setUnreadCount] = useState(0);
    const { connected, newNotificationCount, resetNewCount } = useRealtimeNotifications();

    // Fetch initial unread count from REST API
    useEffect(() => {
        const fetchUnreadCount = async () => {
            if (session?.accessToken) {
                try {
                    const res = await notificationsApi.getUnreadCount(session.accessToken);
                    if (res.success && res.data) {
                        setUnreadCount((res.data as { unread_count: number }).unread_count);
                    }
                } catch (error) {
                    console.error("Failed to fetch unread count:", error);
                }
            }
        };

        fetchUnreadCount();

        // Fallback polling every 60s (in case WS disconnects)
        const interval = setInterval(fetchUnreadCount, 60000);
        return () => clearInterval(interval);
    }, [session?.accessToken]);

    // When new WS notifications arrive, increment the count
    const totalUnread = unreadCount + newNotificationCount;

    const handleNotifClick = () => {
        // Reset the new count when user clicks to view notifications
        resetNewCount();
    };

    return (
        <header className="fixed top-0 right-0 left-64 z-30 bg-white border-b border-gray-200">
            <div className="flex items-center justify-between px-8 py-4">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                        Selamat datang, {session?.user?.name?.split(" ")[0] || "User"}! 👋
                    </h2>
                    <p className="text-sm text-gray-500">
                        {new Date().toLocaleDateString("id-ID", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                        })}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* WebSocket Status Indicator */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-gray-50 border border-gray-100">
                        <div
                            className={`w-2 h-2 rounded-full ${connected
                                    ? "bg-green-500 animate-pulse"
                                    : "bg-gray-300"
                                }`}
                        />
                        <span className="text-xs text-gray-500">
                            {connected ? "Live" : "Offline"}
                        </span>
                    </div>

                    {/* Notifications */}
                    <Link
                        href="/notifications"
                        onClick={handleNotifClick}
                        className="relative p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        {totalUnread > 0 && (
                            <span className={`absolute -top-0.5 -right-0.5 w-5 h-5 text-white text-xs font-medium rounded-full flex items-center justify-center ${newNotificationCount > 0 ? "bg-red-500 animate-bounce" : "bg-red-500"
                                }`}>
                                {totalUnread > 9 ? "9+" : totalUnread}
                            </span>
                        )}
                    </Link>

                    {/* Settings */}
                    <Link
                        href="/settings"
                        className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </Link>
                </div>
            </div>
        </header>
    );
}
