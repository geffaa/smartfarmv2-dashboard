"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useKandangs, useNotifications } from "@/hooks/useApi";

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const { data: kandangData, loading: loadingKandang } = useKandangs();
    const { data: notifData, loading: loadingNotif } = useNotifications();

    if (status === "loading") {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
        );
    }

    const kandangs = kandangData?.items || [];
    const notifications = notifData?.items || [];
    const recentAlerts = notifications.filter(n => !n.is_read).slice(0, 5);

    // Calculate statistics from API data
    const totalKandang = kandangs.length;
    const totalPopulasi = kandangs.reduce((sum, k) => sum + (k.latest_sensor?.populasi || 0), 0);
    const avgSuhu = kandangs.length > 0
        ? (kandangs.reduce((sum, k) => sum + (k.latest_sensor?.suhu || 0), 0) / kandangs.filter(k => k.latest_sensor).length).toFixed(1)
        : "-";

    const kandangDanger = kandangs.filter(k => {
        if (!k.latest_sensor) return false;
        return k.latest_sensor.amoniak > 10 || k.latest_sensor.suhu > 32;
    }).length;

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

    return (
        <div className="space-y-6">
            {/* Welcome */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    Selamat Datang, {session?.user?.name || "User"}!
                </h1>
                <p className="text-gray-500 mt-1">
                    Dashboard monitoring peternakan ayam Anda
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-green-50 text-green-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Kandang</p>
                                {loadingKandang ? (
                                    <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
                                ) : (
                                    <p className="text-2xl font-bold text-gray-900">{totalKandang}</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Populasi</p>
                                {loadingKandang ? (
                                    <div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
                                ) : (
                                    <p className="text-2xl font-bold text-gray-900">{totalPopulasi.toLocaleString()}</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-yellow-50 text-yellow-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Avg. Temperature</p>
                                {loadingKandang ? (
                                    <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
                                ) : (
                                    <p className="text-2xl font-bold text-gray-900">{avgSuhu}°C</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-red-50 text-red-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Kandang Danger</p>
                                {loadingKandang ? (
                                    <div className="h-8 w-12 bg-gray-200 animate-pulse rounded"></div>
                                ) : (
                                    <p className="text-2xl font-bold text-red-600">{kandangDanger}</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Alerts */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Notifikasi Terbaru</CardTitle>
                                <Link href="/notifications">
                                    <button className="text-sm text-green-600 hover:text-green-700">Lihat Semua</button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loadingNotif ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg"></div>
                                    ))}
                                </div>
                            ) : recentAlerts.length === 0 ? (
                                <div className="py-8 text-center text-gray-500">
                                    Tidak ada notifikasi baru
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {recentAlerts.map((alert) => (
                                        <div key={alert.id} className="flex items-start gap-4 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                                            <div className={`p-2 rounded-full ${alert.type === "danger" || alert.type === "death_forecast"
                                                    ? "bg-red-100 text-red-600"
                                                    : alert.type === "alert" || alert.type === "abnormal_classification"
                                                        ? "bg-yellow-100 text-yellow-600"
                                                        : "bg-blue-100 text-blue-600"
                                                }`}>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                                                <p className="text-xs text-gray-500 truncate">{alert.message}</p>
                                            </div>
                                            <span className="text-xs text-gray-400 whitespace-nowrap">
                                                {formatTimeAgo(alert.created_at)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions */}
                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Link href="/sensor-data" className="block">
                                <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors text-left">
                                    <div className="p-2 rounded-lg bg-green-100 text-green-600">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Input Data Sensor</p>
                                        <p className="text-xs text-gray-500">Tambah data sensor baru</p>
                                    </div>
                                </button>
                            </Link>

                            <Link href="/predictions" className="block">
                                <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors text-left">
                                    <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Lihat Prediksi ML</p>
                                        <p className="text-xs text-gray-500">Analisis & forecasting</p>
                                    </div>
                                </button>
                            </Link>

                            <Link href="/kandang" className="block">
                                <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors text-left">
                                    <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Kelola Kandang</p>
                                        <p className="text-xs text-gray-500">Lihat semua kandang</p>
                                    </div>
                                </button>
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Kandang Summary */}
                    {!loadingKandang && kandangs.length > 0 && (
                        <Card className="mt-6">
                            <CardHeader>
                                <CardTitle>Status Kandang</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {kandangs.slice(0, 5).map((kandang) => {
                                    const status = !kandang.is_active
                                        ? "Inactive"
                                        : !kandang.latest_sensor
                                            ? "Normal"
                                            : kandang.latest_sensor.amoniak > 10 || kandang.latest_sensor.suhu > 32
                                                ? "Danger"
                                                : kandang.latest_sensor.amoniak > 5 || kandang.latest_sensor.suhu > 30
                                                    ? "Warning"
                                                    : "Normal";

                                    return (
                                        <Link key={kandang.id} href={`/kandang/${kandang.id}`}>
                                            <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                                <span className="text-sm text-gray-900">{kandang.nama}</span>
                                                <Badge
                                                    variant={
                                                        status === "Normal" ? "success" :
                                                            status === "Warning" ? "warning" :
                                                                status === "Danger" ? "danger" : "default"
                                                    }
                                                >
                                                    {status}
                                                </Badge>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
