"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useKandangs, useModelInfo, useReloadModels } from "@/hooks/useApi";
import { predictionsApi } from "@/lib/api";

interface PredictionHistoryItem {
    id: string;
    type: string;
    result: string;
    confidence?: number;
    predicted_deaths?: number;
    has_risk?: boolean;
    timestamp: string;
    input_data?: any;
}

export default function PredictionsPage() {
    const { data: session, status } = useSession();
    const { data: kandangData, loading: loadingKandang } = useKandangs();
    const { data: modelInfo, loading: loadingModels } = useModelInfo();
    const { mutate: reloadModels, loading: reloading } = useReloadModels();

    const [predictions, setPredictions] = useState<PredictionHistoryItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [reloadSuccess, setReloadSuccess] = useState(false);
    const [error, setError] = useState("");

    const isAdmin = session?.user?.role === "admin";
    const kandang = kandangData?.items?.[0];
    const kandangId = kandang?.id;

    // Auto-load prediction history from API
    const loadPredictionHistory = useCallback(async () => {
        if (!session?.accessToken || !kandangId) return;
        setLoadingHistory(true);
        try {
            const res: any = await predictionsApi.getHistory(kandangId, session.accessToken);
            if (res && Array.isArray(res)) {
                setPredictions(res);
            } else if (res?.items) {
                setPredictions(res.items);
            } else if (res?.data && Array.isArray(res.data)) {
                setPredictions(res.data);
            } else if (res?.data?.items) {
                setPredictions(res.data.items);
            }
        } catch (err) {
            // Prediction history endpoint may not exist yet — that's ok
            console.log("Prediction history not available:", err);
        } finally {
            setLoadingHistory(false);
        }
    }, [session?.accessToken, kandangId]);

    useEffect(() => {
        loadPredictionHistory();
    }, [loadPredictionHistory]);

    const handleReloadModels = async () => {
        setReloadSuccess(false);
        const result = await reloadModels();
        if (result.success) {
            setReloadSuccess(true);
            setTimeout(() => setReloadSuccess(false), 3000);
        } else {
            setError(result.error || "Gagal reload models");
        }
    };

    if (status === "loading" || loadingKandang) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
        );
    }

    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleString("id-ID");
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Prediksi ML</h1>
                <p className="text-gray-500 mt-1">
                    Klasifikasi kondisi kandang dan forecasting mortalitas — berjalan otomatis setiap data sensor masuk
                </p>
            </div>

            {/* Auto-prediction badge */}
            <Card>
                <CardContent className="flex items-center gap-3 py-3">
                    <div className="p-2 rounded-lg bg-green-50 text-green-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-900">Mode Auto-Prediction Aktif</p>
                        <p className="text-xs text-gray-500">
                            Setiap data sensor baru dari IoT akan otomatis dianalisis. Notifikasi dikirim jika kondisi abnormal atau ada risiko kematian terdeteksi.
                        </p>
                    </div>
                    <Badge variant="success" className="ml-auto">Active</Badge>
                </CardContent>
            </Card>

            {/* Model Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <div>
                                <CardTitle>Classification Model</CardTitle>
                                <p className="text-sm text-gray-500">
                                    {modelInfo?.classification_model?.type || "Loading..."}
                                </p>
                            </div>
                            {modelInfo?.classification_model?.status && (
                                <Badge variant="success" className="ml-auto">
                                    {modelInfo.classification_model.status}
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                                <p className="text-sm text-gray-500">Output</p>
                                <p className="text-lg font-bold text-gray-900">
                                    {modelInfo?.classification_model?.output_classes?.join(" / ") || "Normal / Abnormal"}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Input Features</p>
                                <p className="text-sm text-gray-700">
                                    {modelInfo?.classification_model?.input_features?.join(", ") || "Loading..."}
                                </p>
                            </div>
                            {modelInfo?.classification_model?.metrics && (
                                <>
                                    <div>
                                        <p className="text-sm text-gray-500">Accuracy</p>
                                        <p className="text-lg font-bold text-green-600">
                                            {modelInfo.classification_model.metrics.accuracy || "-"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">F1 Score</p>
                                        <p className="text-lg font-bold text-blue-600">
                                            {modelInfo.classification_model.metrics.f1_score || "-"}
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                                </svg>
                            </div>
                            <div>
                                <CardTitle>Forecasting Model</CardTitle>
                                <p className="text-sm text-gray-500">
                                    {modelInfo?.forecasting_model?.type || "Loading..."}
                                </p>
                            </div>
                            {modelInfo?.forecasting_model?.status && (
                                <Badge variant="success" className="ml-auto">
                                    {modelInfo.forecasting_model.status}
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                                <p className="text-sm text-gray-500">Output</p>
                                <p className="text-lg font-bold text-gray-900">
                                    {modelInfo?.forecasting_model?.output || "Death Forecast"}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Window Size</p>
                                <p className="text-sm text-gray-700">
                                    {modelInfo?.forecasting_model?.window_size || "Loading..."}
                                </p>
                            </div>
                            {modelInfo?.forecasting_model?.metrics && (
                                <>
                                    <div>
                                        <p className="text-sm text-gray-500">RMSE</p>
                                        <p className="text-lg font-bold text-green-600">
                                            {modelInfo.forecasting_model.metrics.rmse || "-"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Pearson</p>
                                        <p className="text-lg font-bold text-blue-600">
                                            {modelInfo.forecasting_model.metrics.pearson || "-"}
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Admin: Reload Models */}
            {isAdmin && (
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-700">Admin: Manage ML Models</p>
                                <p className="text-xs text-gray-500">Reload model setelah update file model</p>
                            </div>
                            <div className="flex items-center gap-3">
                                {reloadSuccess && (
                                    <span className="text-sm text-green-600">✅ Models berhasil di-reload!</span>
                                )}
                                <Button
                                    variant="secondary"
                                    onClick={handleReloadModels}
                                    disabled={reloading}
                                >
                                    {reloading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                                            Reloading...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            Reload Models
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Info Box */}
            <Card>
                <CardContent className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-yellow-50">
                        <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-gray-900 font-medium">Cara Kerja Auto-Prediction</p>
                        <ul className="text-gray-500 text-sm mt-1 space-y-1 list-disc list-inside">
                            <li><strong>Classification:</strong> Setiap data sensor baru otomatis diklasifikasikan sebagai Normal atau Abnormal</li>
                            <li><strong>Forecasting:</strong> Setelah 4+ data sensor terkumpul, sistem memprediksi potensi kematian ke depan</li>
                            <li><strong>Notifikasi:</strong> Jika kondisi abnormal atau ada risiko kematian, notifikasi dikirim secara real-time</li>
                            <li>Hasil prediksi tersimpan otomatis dan dapat dilihat di halaman Notifikasi</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
