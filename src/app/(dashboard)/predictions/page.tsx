"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useKandangs, useModelInfo, useReloadModels } from "@/hooks/useApi";
import { activityLogsApi } from "@/lib/api";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";

interface PredictionLog {
    id: string;
    action: string; // "classify" | "forecast"
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
    const [activeTab, setActiveTab] = useState<"overview" | "history">("overview");

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

    // Parse classification & forecast logs
    const classifyLogs = predictionLogs.filter(l => l.action === "classify");
    const forecastLogs = predictionLogs.filter(l => l.action === "forecast");

    // Stats
    const totalPredictions = predictionLogs.length;
    const normalCount = classifyLogs.filter(l => l.details?.prediction === "Normal").length;
    const abnormalCount = classifyLogs.filter(l => l.details?.prediction === "Abnormal").length;
    const deathRiskCount = forecastLogs.filter(l => (l.details?.predicted_death ?? 0) > 0).length;

    // Charts data
    const classifyChartData = [...classifyLogs].reverse().map(l => ({
        time: new Date(l.created_at).toLocaleString("id-ID", {
            hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short",
        }),
        confidence: l.details?.confidence ? +(l.details.confidence * 100).toFixed(1) : 0,
        isAbnormal: l.details?.prediction === "Abnormal" ? 1 : 0,
    }));

    const forecastChartData = [...forecastLogs].reverse().map(l => ({
        time: new Date(l.created_at).toLocaleString("id-ID", {
            hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short",
        }),
        predicted_death: l.details?.predicted_death ?? 0,
    }));

    const pieData = [
        { name: "Normal", value: normalCount, color: "#10b981" },
        { name: "Abnormal", value: abnormalCount, color: "#ef4444" },
    ].filter(d => d.value > 0);

    // Model info parsing
    const classModel = (modelInfo as any)?.data?.classification_model || (modelInfo as any)?.classification_model;
    const forecastModel = (modelInfo as any)?.data?.forecasting_model || (modelInfo as any)?.forecasting_model;

    const customTooltipStyle = {
        backgroundColor: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "12px 16px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
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
                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setActiveTab("overview")}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === "overview"
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            📊 Overview
                        </button>
                        <button
                            onClick={() => setActiveTab("history")}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === "history"
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            📋 Riwayat
                        </button>
                    </div>
                    <Button variant="secondary" onClick={loadHistory} disabled={loadingHistory}>
                        {loadingHistory ? "Memuat..." : "🔄 Refresh"}
                    </Button>
                </div>
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
                            Setiap kali IoT mengirim data sensor baru, prediksi ML otomatis berjalan.
                            Klasifikasi kondisi dan forecasting kematian dilakukan secara real-time.
                        </p>
                    </div>
                </div>
            </div>

            {/* ============ OVERVIEW TAB ============ */}
            {activeTab === "overview" && (
                <div className="space-y-6">
                    {/* Stats cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                            <p className="text-xs text-blue-600 font-medium">Total Prediksi</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{totalPredictions}</p>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                            <p className="text-xs text-green-600 font-medium">Kondisi Normal</p>
                            <p className="text-2xl font-bold text-green-600 mt-1">{normalCount}</p>
                        </div>
                        <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-4 border border-red-100">
                            <p className="text-xs text-red-600 font-medium">Kondisi Abnormal</p>
                            <p className="text-2xl font-bold text-red-600 mt-1">{abnormalCount}</p>
                        </div>
                        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-100">
                            <p className="text-xs text-orange-600 font-medium">Risiko Kematian</p>
                            <p className="text-2xl font-bold text-orange-600 mt-1">{deathRiskCount}</p>
                        </div>
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Classification Distribution Pie */}
                        {pieData.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Distribusi Klasifikasi</CardTitle>
                                </CardHeader>
                                <CardContent className="flex justify-center">
                                    <ResponsiveContainer width="100%" height={260}>
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={5}
                                                dataKey="value"
                                                label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        )}

                        {/* Forecast Death Chart */}
                        {forecastChartData.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Prediksi Kematian</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={260}>
                                        <BarChart data={forecastChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                            <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                                            <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" allowDecimals={false} />
                                            <Tooltip contentStyle={customTooltipStyle} />
                                            <Bar dataKey="predicted_death" fill="#ef4444" name="Prediksi Kematian" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Confidence Over Time */}
                    {classifyChartData.length > 0 && (
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>Confidence Klasifikasi</CardTitle>
                                    <div className="flex items-center gap-4 text-xs">
                                        <span className="flex items-center gap-1"><span className="w-3 h-1 rounded bg-purple-500"></span> Confidence (%)</span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={260}>
                                    <LineChart data={classifyChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                        <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#9ca3af" />
                                        <Tooltip contentStyle={customTooltipStyle} />
                                        <Line type="monotone" dataKey="confidence" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} name="Confidence (%)" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    )}

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
                                        {reloadSuccess && (
                                            <span className="text-sm text-green-600">✅ Berhasil</span>
                                        )}
                                        <Button variant="secondary" onClick={handleReload} disabled={reloading}>
                                            {reloading ? "Loading..." : "🔄 Reload Models"}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Empty state */}
                    {totalPredictions === 0 && !loadingHistory && (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-50 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada riwayat prediksi</h3>
                                <p className="text-gray-500">Prediksi akan muncul otomatis saat IoT simulator mengirim data sensor</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* ============ HISTORY TAB ============ */}
            {activeTab === "history" && (
                <div className="space-y-4">
                    {loadingHistory && (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                        </div>
                    )}

                    {!loadingHistory && predictionLogs.length === 0 && (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada riwayat prediksi</h3>
                                <p className="text-gray-500">Riwayat prediksi ML akan tampil di sini</p>
                            </CardContent>
                        </Card>
                    )}

                    {!loadingHistory && predictionLogs.length > 0 && (
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>Riwayat Prediksi</CardTitle>
                                    <span className="text-sm text-gray-500">{predictionLogs.length} hasil</span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-gray-100">
                                    {predictionLogs.map((log) => {
                                        const isClassify = log.action === "classify";
                                        const isAbnormal = log.details?.prediction === "Abnormal";
                                        const hasRisk = (log.details?.predicted_death ?? 0) > 0;

                                        return (
                                            <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
                                                <div className="flex items-start gap-4">
                                                    {/* Icon */}
                                                    <div className={`p-2.5 rounded-xl ${isClassify
                                                        ? (isAbnormal ? "bg-red-50" : "bg-green-50")
                                                        : (hasRisk ? "bg-orange-50" : "bg-blue-50")
                                                        }`}>
                                                        {isClassify ? (
                                                            <svg className={`w-5 h-5 ${isAbnormal ? "text-red-600" : "text-green-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        ) : (
                                                            <svg className={`w-5 h-5 ${hasRisk ? "text-orange-600" : "text-blue-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                                            </svg>
                                                        )}
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Badge variant={isClassify ? "info" : "default"}>
                                                                {isClassify ? "Klasifikasi" : "Forecasting"}
                                                            </Badge>
                                                            {isClassify ? (
                                                                <Badge variant={isAbnormal ? "danger" : "success"}>
                                                                    {log.details?.prediction || "?"}
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant={hasRisk ? "warning" : "success"}>
                                                                    {hasRisk ? `${log.details?.predicted_death} kematian` : "Aman (0)"}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-gray-600">
                                                            {isClassify
                                                                ? `Confidence: ${log.details?.confidence ? (log.details.confidence * 100).toFixed(1) + "%" : "N/A"}`
                                                                : `Data points: ${log.details?.input_count ?? "N/A"}`
                                                            }
                                                        </p>
                                                        {isClassify && log.details?.input && (
                                                            <p className="text-xs text-gray-400 mt-1">
                                                                Suhu: {log.details.input.suhu}°C · Hum: {log.details.input.kelembaban}% · NH₃: {log.details.input.amoniak}ppm
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Time */}
                                                    <div className="text-xs text-gray-400 whitespace-nowrap">
                                                        {new Date(log.created_at).toLocaleString("id-ID", {
                                                            hour: "2-digit", minute: "2-digit",
                                                            day: "2-digit", month: "short",
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
