"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { useKandangs, Kandang, useModelInfo, useReloadModels } from "@/hooks/useApi";
import { predictionsApi } from "@/lib/api";

interface PredictionResult {
    kandang_id: string;
    kandang_nama: string;
    classification?: string;
    confidence?: number;
    predicted_deaths?: number;
    forecast?: number[];
    timestamp: string;
}

export default function PredictionsPage() {
    const { data: session, status } = useSession();
    const { data: kandangData, loading: loadingKandang } = useKandangs();
    const { data: modelInfo, loading: loadingModels } = useModelInfo();
    const { mutate: reloadModels, loading: reloading } = useReloadModels();

    const [selectedKandang, setSelectedKandang] = useState("");
    const [predictions, setPredictions] = useState<PredictionResult[]>([]);
    const [loadingClassify, setLoadingClassify] = useState(false);
    const [loadingForecast, setLoadingForecast] = useState(false);
    const [error, setError] = useState("");
    const [reloadSuccess, setReloadSuccess] = useState(false);

    const isAdmin = session?.user?.role === "admin";

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

    const kandangs = kandangData?.items || [];

    const runClassification = async () => {
        if (!selectedKandang) {
            setError("Pilih kandang terlebih dahulu");
            return;
        }

        const kandang = kandangs.find(k => k.id === selectedKandang);
        if (!kandang?.latest_sensor) {
            setError("Kandang tidak memiliki data sensor terbaru");
            return;
        }

        setLoadingClassify(true);
        setError("");

        try {
            const response = await predictionsApi.classify({
                kandang_id: selectedKandang,
                suhu: kandang.latest_sensor.suhu,
                kelembaban: kandang.latest_sensor.kelembaban,
                amoniak: kandang.latest_sensor.amoniak,
                hari_ke: 1, // Default, should be from sensor data
            }, session?.accessToken as string);

            const result: PredictionResult = {
                kandang_id: selectedKandang,
                kandang_nama: kandang.nama,
                classification: (response as any).classification || (response as any).result?.classification,
                confidence: (response as any).confidence || (response as any).result?.confidence,
                timestamp: new Date().toISOString(),
            };

            setPredictions(prev => [result, ...prev]);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal menjalankan klasifikasi");
        } finally {
            setLoadingClassify(false);
        }
    };

    const runForecast = async () => {
        if (!selectedKandang) {
            setError("Pilih kandang terlebih dahulu");
            return;
        }

        const kandang = kandangs.find(k => k.id === selectedKandang);

        setLoadingForecast(true);
        setError("");

        try {
            const response = await predictionsApi.forecast({
                kandang_id: selectedKandang,
            }, session?.accessToken as string);

            const result: PredictionResult = {
                kandang_id: selectedKandang,
                kandang_nama: kandang?.nama || "Unknown",
                predicted_deaths: (response as any).predicted_deaths || (response as any).result?.predicted_deaths,
                forecast: (response as any).forecast || (response as any).result?.forecast,
                timestamp: new Date().toISOString(),
            };

            setPredictions(prev => [result, ...prev]);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal menjalankan forecasting");
        } finally {
            setLoadingForecast(false);
        }
    };

    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleString("id-ID");
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Prediksi ML</h1>
                <p className="text-gray-500 mt-1">
                    Klasifikasi kondisi dan forecasting mortalitas
                </p>
            </div>

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

            {/* Run Prediction */}
            <Card>
                <CardHeader>
                    <CardTitle>Jalankan Prediksi</CardTitle>
                </CardHeader>
                <CardContent>
                    {error && (
                        <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-700 text-sm">{error}</p>
                        </div>
                    )}

                    {kandangs.length === 0 ? (
                        <div className="py-8 text-center text-gray-500">
                            Tidak ada kandang tersedia. Tambahkan kandang terlebih dahulu.
                        </div>
                    ) : (
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Kandang</label>
                                <Select
                                    value={selectedKandang}
                                    onChange={(e) => setSelectedKandang(e.target.value)}
                                >
                                    <option value="">-- Pilih Kandang --</option>
                                    {kandangs.map((k: Kandang) => (
                                        <option key={k.id} value={k.id}>
                                            {k.nama} {k.latest_sensor ? `(${k.latest_sensor.suhu}°C)` : "(No sensor data)"}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                            <div className="flex items-end gap-2">
                                <Button
                                    onClick={runClassification}
                                    disabled={loadingClassify || !selectedKandang}
                                >
                                    {loadingClassify ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                            </svg>
                                            Run Classification
                                        </>
                                    )}
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={runForecast}
                                    disabled={loadingForecast || !selectedKandang}
                                >
                                    {loadingForecast ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700 mr-2"></div>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                                            </svg>
                                            Run Forecast
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Results */}
            {predictions.length > 0 && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Hasil Prediksi</CardTitle>
                            <Button
                                variant="ghost"
                                onClick={() => setPredictions([])}
                            >
                                Clear All
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Kandang</th>
                                        <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Type</th>
                                        <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Result</th>
                                        <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Confidence / Deaths</th>
                                        <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {predictions.map((pred, idx) => (
                                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="py-4 px-6">
                                                <span className="text-sm font-medium text-gray-900">{pred.kandang_nama}</span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <Badge variant={pred.classification ? "info" : "default"}>
                                                    {pred.classification ? "Classification" : "Forecast"}
                                                </Badge>
                                            </td>
                                            <td className="py-4 px-6">
                                                {pred.classification ? (
                                                    <Badge
                                                        variant={
                                                            pred.classification === "Normal" ? "success" : "danger"
                                                        }
                                                    >
                                                        {pred.classification}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-sm text-gray-700">
                                                        Predicted Deaths: <strong className="text-red-600">{pred.predicted_deaths ?? "N/A"}</strong>
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 px-6">
                                                {pred.confidence !== undefined && (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-green-500 rounded-full"
                                                                style={{ width: `${pred.confidence * 100}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-sm text-gray-600">{(pred.confidence * 100).toFixed(1)}%</span>
                                                    </div>
                                                )}
                                                {pred.predicted_deaths !== undefined && !pred.classification && (
                                                    <span className={`text-lg font-bold ${pred.predicted_deaths > 0 ? "text-red-600" : "text-green-600"}`}>
                                                        {pred.predicted_deaths}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="text-sm text-gray-500">{formatTime(pred.timestamp)}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Empty State for Results */}
            {predictions.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada hasil prediksi</h3>
                        <p className="text-gray-500">Pilih kandang dan jalankan prediksi untuk melihat hasil</p>
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
                        <p className="text-gray-900 font-medium">Catatan Model</p>
                        <p className="text-gray-500 text-sm mt-1">
                            Model prediksi dilatih menggunakan data historis kandang. Hasil prediksi bersifat estimasi dan perlu dikombinasikan dengan pengamatan langsung di lapangan.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
