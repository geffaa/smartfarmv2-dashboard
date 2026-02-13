"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useKandangs, useModelInfo, useReloadModels } from "@/hooks/useApi";
import { activityLogsApi } from "@/lib/api";

interface PredictionLog {
    id: string;
    action: string;
    details: {
        input?: any;
        prediction?: string;
        confidence?: number;
        input_count?: number;
        predicted_death?: number;
    };
    created_at: string;
}

export default function PredictionsPage() {
    const { data: session, status } = useSession();
    const { data: kandangData, loading: loadingKandang } = useKandangs();
    const { data: modelInfo, loading: loadingModels } = useModelInfo();
    const { mutate: reloadModels, loading: reloading } = useReloadModels();

    const [predictionLogs, setPredictionLogs] = useState<PredictionLog[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [reloadSuccess, setReloadSuccess] = useState(false);

    const isAdmin = session?.user?.role === "admin";
    const kandang = kandangData?.items?.[0];

    // Load prediction history from activity logs
    const loadHistory = useCallback(async () => {
        if (!session?.accessToken) return;
        setLoadingHistory(true);
        try {
            const res: any = await activityLogsApi.list(
                { resource: "prediction", per_page: 50 },
                session.accessToken
            );
            let items: PredictionLog[] = [];
            if (res?.data?.items && Array.isArray(res.data.items)) {
                items = res.data.items;
            } else if (res?.items && Array.isArray(res.items)) {
                items = res.items;
            } else if (Array.isArray(res?.data)) {
                items = res.data;
            }
            setPredictionLogs(items);
        } catch (err) {
            console.log("Prediction history not available:", err);
        } finally {
            setLoadingHistory(false);
        }
    }, [session?.accessToken]);

    useEffect(() => {
        if (status === "authenticated" && session?.accessToken) {
            loadHistory();
        }
    }, [status, session?.accessToken, loadHistory]);

    const handleReload = async () => {
        const result = await reloadModels();
        if (result.success) {
            setReloadSuccess(true);
            setTimeout(() => setReloadSuccess(false), 3000);
        }
    };

    if (status === "loading" || loadingKandang || loadingModels) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
        );
    }

    // Parse logs
    const classifyLogs = predictionLogs.filter(l => l.action === "classify");
    const forecastLogs = predictionLogs.filter(l => l.action === "forecast");
    const totalPredictions = predictionLogs.length;
    const normalCount = classifyLogs.filter(l => l.details?.prediction === "Normal").length;
    const abnormalCount = classifyLogs.filter(l => l.details?.prediction === "Abnormal").length;
    const deathRiskCount = forecastLogs.filter(l => (l.details?.predicted_death ?? 0) > 0).length;

    // Model info
    const classModel = (modelInfo as any)?.data?.classification_model || (modelInfo as any)?.classification_model;
    const forecastModel = (modelInfo as any)?.data?.forecasting_model || (modelInfo as any)?.forecasting_model;

    const formatTime = (ts: string) => {
        try {
            return new Date(ts).toLocaleString("id-ID", {
                hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short",
            });
        } catch { return ts; }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Prediksi ML</h1>
                    <p className="text-gray-500 mt-1">
                        Monitoring prediksi otomatis berbasis Machine Learning
                    </p>
                </div>
                <Button variant="secondary" onClick={loadHistory} disabled={loadingHistory}>
                    {loadingHistory ? "Memuat..." : "🔄 Refresh"}
                </Button>
            </div>

            {/* Auto-prediction banner */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <div>
                        <p className="font-medium text-indigo-900">Auto-Prediction Aktif</p>
                        <p className="text-sm text-indigo-700 mt-0.5">
                            Setiap data sensor baru masuk, klasifikasi kondisi dan forecasting kematian berjalan otomatis.
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                    <p className="text-xs text-blue-600 font-medium">Total Prediksi</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{totalPredictions}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                    <p className="text-xs text-green-600 font-medium">Normal</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">{normalCount}</p>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-4 border border-red-100">
                    <p className="text-xs text-red-600 font-medium">Abnormal</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">{abnormalCount}</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-100">
                    <p className="text-xs text-orange-600 font-medium">Risiko Kematian</p>
                    <p className="text-2xl font-bold text-orange-600 mt-1">{deathRiskCount}</p>
                </div>
            </div>

            {/* Model Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>🧠 Model Klasifikasi</CardTitle>
                            <Badge variant="success">Active</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Tipe</span>
                            <span className="font-medium">{classModel?.type || "RandomForestClassifier"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Output</span>
                            <span className="font-medium">Normal / Abnormal</span>
                        </div>
                        {classModel?.metrics && (
                            <>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Accuracy</span>
                                    <span className="font-medium text-green-600">{classModel.metrics.accuracy}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">F1 Score</span>
                                    <span className="font-medium text-green-600">{classModel.metrics.f1_score}</span>
                                </div>
                            </>
                        )}
                        <div className="pt-2 border-t">
                            <p className="text-xs text-gray-400">Input: Suhu, Kelembaban, Amoniak, Pakan, Minum, Bobot, Populasi, Luas Kandang, Hari, Jam</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>📈 Model Forecasting</CardTitle>
                            <Badge variant="success">Active</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Tipe</span>
                            <span className="font-medium">{forecastModel?.type || "XGBRegressor"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Output</span>
                            <span className="font-medium">Jumlah Kematian Prediksi</span>
                        </div>
                        {forecastModel?.metrics && (
                            <>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">RMSE</span>
                                    <span className="font-medium text-green-600">{forecastModel.metrics.rmse}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Pearson</span>
                                    <span className="font-medium text-green-600">{forecastModel.metrics.pearson}</span>
                                </div>
                            </>
                        )}
                        <div className="pt-2 border-t">
                            <p className="text-xs text-gray-400">Input: 4 data berurutan (temp, hum, ammo, Death) · Window: 2 jam</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Admin Reload */}
            {isAdmin && (
                <Card>
                    <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-900">Admin: Reload ML Models</p>
                                <p className="text-sm text-gray-500">Reload model dari disk setelah update file model</p>
                            </div>
                            <div className="flex items-center gap-3">
                                {reloadSuccess && <span className="text-sm text-green-600">✅ Berhasil</span>}
                                <Button variant="secondary" onClick={handleReload} disabled={reloading}>
                                    {reloading ? "Loading..." : "🔄 Reload Models"}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Prediction History */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Riwayat Prediksi</CardTitle>
                        <span className="mx-2 text-md text-gray-500">{predictionLogs.length} hasil</span>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loadingHistory && (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                        </div>
                    )}

                    {!loadingHistory && predictionLogs.length === 0 && (
                        <div className="py-12 text-center">
                            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-purple-50 flex items-center justify-center">
                                <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                            </div>
                            <h3 className="text-base font-medium text-gray-900 mb-1">Belum ada riwayat prediksi</h3>
                            <p className="text-sm text-gray-500">Prediksi muncul otomatis saat IoT mengirim data</p>
                        </div>
                    )}

                    {!loadingHistory && predictionLogs.length > 0 && (
                        <div className="divide-y divide-gray-100">
                            {predictionLogs.map((log) => {
                                const isClassify = log.action === "classify";
                                const isAbnormal = log.details?.prediction === "Abnormal";
                                const hasRisk = (log.details?.predicted_death ?? 0) > 0;

                                return (
                                    <div key={log.id} className="px-6 py-3.5 hover:bg-gray-50 transition-colors flex items-center gap-4">
                                        {/* Icon */}
                                        <div className={`p-2 rounded-lg flex-shrink-0 ${isClassify
                                            ? (isAbnormal ? "bg-red-50" : "bg-green-50")
                                            : (hasRisk ? "bg-orange-50" : "bg-blue-50")
                                            }`}>
                                            {isClassify ? (
                                                <svg className={`w-4 h-4 ${isAbnormal ? "text-red-500" : "text-green-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isAbnormal ? "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} />
                                                </svg>
                                            ) : (
                                                <svg className={`w-4 h-4 ${hasRisk ? "text-orange-500" : "text-blue-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                                </svg>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-gray-900">
                                                    {isClassify ? "Klasifikasi" : "Forecasting"}
                                                </span>
                                                {isClassify ? (
                                                    <Badge variant={isAbnormal ? "danger" : "success"}>
                                                        {log.details?.prediction || "?"}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant={hasRisk ? "warning" : "success"}>
                                                        {hasRisk ? `${log.details?.predicted_death} kematian` : "Aman"}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {isClassify
                                                    ? `Confidence: ${log.details?.confidence ? (log.details.confidence * 100).toFixed(1) + "%" : "N/A"}`
                                                    : `${log.details?.input_count ?? 4} data points`
                                                }
                                                {isClassify && log.details?.input && (
                                                    <> · Suhu {log.details.input.suhu}°C · NH₃ {log.details.input.amoniak}ppm</>
                                                )}
                                            </p>
                                        </div>

                                        {/* Time */}
                                        <span className="text-xs text-gray-400 flex-shrink-0">
                                            {formatTime(log.created_at)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
