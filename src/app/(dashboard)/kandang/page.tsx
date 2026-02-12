"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useKandangs, Kandang } from "@/hooks/useApi";

export default function KandangPage() {
    const { data: session, status } = useSession();
    const { data: apiData, loading, error } = useKandangs();

    if (status === "loading" || loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
        );
    }

    const kandangs = apiData?.items || [];
    const canCreate = session?.user?.role === "admin" || session?.user?.role === "pemilik";

    const getStatus = (kandang: Kandang) => {
        if (!kandang.is_active) return "Inactive";
        if (!kandang.latest_sensor) return "Normal";
        return kandang.latest_sensor.status;
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Kandang</h1>
                    <p className="text-gray-500 mt-1">
                        Kelola dan monitoring semua kandang peternakan
                    </p>
                </div>
                {canCreate && (
                    <Link href="/kandang/create">
                        <Button>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Tambah Kandang
                        </Button>
                    </Link>
                )}
            </div>

            {/* Error State */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm">❌ Gagal mengambil data: {error}</p>
                </div>
            )}

            {/* Empty State */}
            {!error && kandangs.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada kandang</h3>
                        <p className="text-gray-500 mb-4">Mulai dengan menambahkan kandang pertama Anda</p>
                        {canCreate && (
                            <Link href="/kandang/create">
                                <Button>Tambah Kandang</Button>
                            </Link>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Stats Summary */}
            {kandangs.length > 0 && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="p-4">
                                <div className="text-sm text-gray-500">Total Kandang</div>
                                <div className="text-2xl font-bold text-gray-900 mt-1">{kandangs.length}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="text-sm text-gray-500">Aktif</div>
                                <div className="text-2xl font-bold text-green-600 mt-1">
                                    {kandangs.filter(k => k.is_active).length}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="text-sm text-gray-500">Warning</div>
                                <div className="text-2xl font-bold text-yellow-600 mt-1">
                                    {kandangs.filter(k => getStatus(k) === "Warning").length}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="text-sm text-gray-500">Danger</div>
                                <div className="text-2xl font-bold text-red-600 mt-1">
                                    {kandangs.filter(k => getStatus(k) === "Danger").length}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Kandang Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {kandangs.map((kandang) => {
                            const status = getStatus(kandang);
                            return (
                                <Link key={kandang.id} href={`/kandang/${kandang.id}`}>
                                    <Card hover className="h-full">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <CardTitle className="text-lg truncate">{kandang.nama}</CardTitle>
                                                    <p className="text-sm text-gray-500">{kandang.kode}</p>
                                                </div>
                                                <Badge
                                                    variant={
                                                        status === "Normal"
                                                            ? "success"
                                                            : status === "Warning"
                                                                ? "warning"
                                                                : status === "Danger"
                                                                    ? "danger"
                                                                    : "default"
                                                    }
                                                    className="flex-shrink-0"
                                                >
                                                    {status}
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    {kandang.lokasi || "Tidak ada lokasi"}
                                                </div>

                                                {kandang.is_active && kandang.latest_sensor && (
                                                    <>
                                                        <div className="flex items-center justify-between py-2 border-t border-gray-100">
                                                            <span className="text-sm text-gray-500">Populasi</span>
                                                            <span className="text-sm font-medium text-gray-900">
                                                                {kandang.latest_sensor.populasi?.toLocaleString()} / {kandang.kapasitas?.toLocaleString()}
                                                            </span>
                                                        </div>

                                                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                                                            <div className="text-center">
                                                                <div className={`text-lg font-bold ${kandang.latest_sensor.suhu > 30 ? "text-red-600" : "text-gray-900"}`}>
                                                                    {kandang.latest_sensor.suhu}°
                                                                </div>
                                                                <div className="text-xs text-gray-400">Suhu</div>
                                                            </div>
                                                            <div className="text-center">
                                                                <div className="text-lg font-bold text-gray-900">{kandang.latest_sensor.kelembaban}%</div>
                                                                <div className="text-xs text-gray-400">Humid</div>
                                                            </div>
                                                            <div className="text-center">
                                                                <div className={`text-lg font-bold ${kandang.latest_sensor.amoniak > 10 ? "text-red-600" : "text-gray-900"}`}>
                                                                    {kandang.latest_sensor.amoniak}
                                                                </div>
                                                                <div className="text-xs text-gray-400">NH₃</div>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}

                                                {!kandang.is_active && (
                                                    <div className="py-4 text-center text-gray-400">
                                                        Kandang tidak aktif
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
