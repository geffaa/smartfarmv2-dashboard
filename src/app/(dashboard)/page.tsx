"use client";

import { useCallback } from "react";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useKandangs, useNotifications, useSensorData } from "@/hooks/useApi";
import { useLiveSensorData } from "@/hooks/useLiveSensorData";

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const { data: kandangData, loading: loadingKandang } = useKandangs();
    const { data: notifData, loading: loadingNotif } = useNotifications();

    // Auto-select first kandang (single-kandang mode)
    const kandang = kandangData?.items?.[0];
    const kandangId = kandang?.id;

    const { data: sensorData, loading: loadingSensor, refetch: refetchSensor } = useSensorData(
        kandangId ? { kandang_id: kandangId } : undefined
    );

    // Real-time: refetch when new sensor data arrives via WebSocket
    const onNewData = useCallback(() => {
        refetchSensor();
    }, [refetchSensor]);
    useLiveSensorData(onNewData);

    if (status === "loading") {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
        );
    }

    const notifications = notifData?.items || [];
    const recentAlerts = notifications.filter(n => !n.is_read).slice(0, 5);
    const latestSensor = kandang?.latest_sensor;
    const sensorItems = sensorData?.items || [];
    const recentSensors = sensorItems.slice(0, 5);

    // Status from latest sensor
    const getKandangStatus = () => {
        if (!latestSensor) return { label: "No Data", variant: "default" as const };
        if (latestSensor.amoniak > 10 || latestSensor.suhu > 34) return { label: "Danger", variant: "danger" as const };
        if (latestSensor.amoniak > 5 || latestSensor.suhu > 32) return { label: "Warning", variant: "warning" as const };
        return { label: "Normal", variant: "success" as const };
    };

    const kandangStatus = getKandangStatus();

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
            {/* Welcome + Kandang Status */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Dashboard Monitoring
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {kandang ? `${kandang.nama} — ${kandang.lokasi || "Kandang Utama"}` : "Memuat data kandang..."}
                    </p>
                </div>
                {kandang && (
                    <Badge variant={kandangStatus.variant} className="text-sm px-3 py-1">
                        {kandangStatus.label}
                    </Badge>
                )}
            </div>

            {/* Live Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-yellow-50 text-yellow-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Suhu</p>
                                {loadingKandang ? (
                                    <div className="h-7 w-14 bg-gray-200 animate-pulse rounded"></div>
                                ) : (
                                    <p className={`text-xl font-bold ${latestSensor && latestSensor.suhu > 32 ? "text-red-600" : "text-gray-900"}`}>
                                        {latestSensor?.suhu?.toFixed(1) || "-"}°C
                                    </p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Kelembaban</p>
                                {loadingKandang ? (
                                    <div className="h-7 w-14 bg-gray-200 animate-pulse rounded"></div>
                                ) : (
                                    <p className="text-xl font-bold text-gray-900">
                                        {latestSensor?.kelembaban?.toFixed(1) || "-"}%
                                    </p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Amoniak</p>
                                {loadingKandang ? (
                                    <div className="h-7 w-14 bg-gray-200 animate-pulse rounded"></div>
                                ) : (
                                    <p className={`text-xl font-bold ${latestSensor && latestSensor.amoniak > 10 ? "text-red-600" : "text-gray-900"}`}>
                                        {latestSensor?.amoniak?.toFixed(1) || "-"} ppm
                                    </p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-green-50 text-green-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Populasi</p>
                                {loadingKandang ? (
                                    <div className="h-7 w-14 bg-gray-200 animate-pulse rounded"></div>
                                ) : (
                                    <p className="text-xl font-bold text-gray-900">
                                        {latestSensor?.populasi?.toLocaleString() || "-"}
                                    </p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-red-50 text-red-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Kematian</p>
                                {loadingKandang ? (
                                    <div className="h-7 w-14 bg-gray-200 animate-pulse rounded"></div>
                                ) : (
                                    <p className={`text-xl font-bold ${latestSensor && (latestSensor.death ?? 0) > 0 ? "text-red-600" : "text-gray-900"}`}>
                                        {latestSensor?.death ?? "-"}
                                    </p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Sensor Data */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Data Sensor Terbaru</CardTitle>
                                <Link href="/sensor-data">
                                    <button className="text-sm text-green-600 hover:text-green-700">Lihat Semua</button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loadingSensor ? (
                                <div className="p-6 space-y-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-lg"></div>
                                    ))}
                                </div>
                            ) : recentSensors.length === 0 ? (
                                <div className="py-8 text-center text-gray-500">
                                    Belum ada data sensor. IoT device belum mengirim data.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-gray-200">
                                                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Waktu</th>
                                                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Suhu</th>
                                                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Hum</th>
                                                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">NH₃</th>
                                                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Pop</th>
                                                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Death</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentSensors.map((row: any) => (
                                                <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50">
                                                    <td className="py-2.5 px-4 text-xs text-gray-600">
                                                        {new Date(row.timestamp).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                                                    </td>
                                                    <td className={`py-2.5 px-4 text-sm font-medium ${row.suhu > 32 ? "text-red-600" : "text-gray-900"}`}>
                                                        {row.suhu}°C
                                                    </td>
                                                    <td className="py-2.5 px-4 text-sm text-gray-900">{row.kelembaban}%</td>
                                                    <td className={`py-2.5 px-4 text-sm font-medium ${row.amoniak > 10 ? "text-red-600" : "text-gray-900"}`}>
                                                        {row.amoniak}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-sm text-gray-900">{row.populasi?.toLocaleString() || "-"}</td>
                                                    <td className={`py-2.5 px-4 text-sm font-medium ${row.death > 0 ? "text-red-600" : "text-gray-900"}`}>
                                                        {row.death}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Alerts + Quick Links */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Notifikasi</CardTitle>
                                <Link href="/notifications">
                                    <button className="text-sm text-green-600 hover:text-green-700">Semua</button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loadingNotif ? (
                                <div className="space-y-3">
                                    {[1, 2].map(i => (
                                        <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-lg"></div>
                                    ))}
                                </div>
                            ) : recentAlerts.length === 0 ? (
                                <div className="py-6 text-center text-gray-500 text-sm">
                                    Tidak ada notifikasi baru
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {recentAlerts.map((alert) => (
                                        <div key={alert.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-gray-50">
                                            <div className={`p-1.5 rounded-full ${alert.type === "danger" || alert.type === "death_forecast"
                                                ? "bg-red-100 text-red-600"
                                                : alert.type === "alert" || alert.type === "abnormal_classification"
                                                    ? "bg-yellow-100 text-yellow-600"
                                                    : "bg-blue-100 text-blue-600"
                                                }`}>
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-gray-900 truncate">{alert.title}</p>
                                                <p className="text-xs text-gray-400">{formatTimeAgo(alert.created_at)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Link href="/sensor-data" className="block">
                                <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors text-left">
                                    <div className="p-1.5 rounded-lg bg-green-100 text-green-600">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Data Sensor</p>
                                        <p className="text-xs text-gray-500">Lihat riwayat sensor IoT</p>
                                    </div>
                                </button>
                            </Link>
                            <Link href="/predictions" className="block">
                                <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors text-left">
                                    <div className="p-1.5 rounded-lg bg-purple-100 text-purple-600">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Prediksi ML</p>
                                        <p className="text-xs text-gray-500">Hasil prediksi otomatis</p>
                                    </div>
                                </button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
