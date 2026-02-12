"use client";

import { useState, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSensorData, useKandangs, useCreateSensorData, useUpdateSensorData } from "@/hooks/useApi";
import { useLiveSensorData, LiveSensorReading } from "@/hooks/useLiveSensorData";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, AreaChart, Area, BarChart, Bar,
} from "recharts";

export default function SensorDataPage() {
    const { data: session, status } = useSession();
    const { data: kandangData, loading: loadingKandang } = useKandangs();

    // Auto-select first kandang (single-kandang mode)
    const kandang = kandangData?.items?.[0];
    const kandangId = kandang?.id;

    const { data: sensorData, loading, error, refetch } = useSensorData(
        kandangId ? { kandang_id: kandangId } : undefined
    );
    const { mutate: createSensorData, loading: creating } = useCreateSensorData();
    const { mutate: updateSensorData, loading: updating } = useUpdateSensorData();

    // WebSocket real-time data
    const { connected, liveReadings, lastReceived } = useLiveSensorData();

    const [showForm, setShowForm] = useState(false);
    const [activeTab, setActiveTab] = useState<"charts" | "table">("charts");
    const [formData, setFormData] = useState({
        hari_ke: "",
        tanggal: new Date().toISOString().split("T")[0],
        jam: new Date().toTimeString().slice(0, 5),
        suhu: "",
        kelembaban: "",
        amoniak: "",
        pakan: "",
        minum: "",
        populasi: "",
        bobot: "",
    });
    const [formError, setFormError] = useState("");
    const [formSuccess, setFormSuccess] = useState("");

    // Edit modal
    const [editingRow, setEditingRow] = useState<any>(null);
    const [editData, setEditData] = useState({
        pakan: "", minum: "", bobot: "", populasi: "", death: "",
    });
    const [editError, setEditError] = useState("");
    const [editSuccess, setEditSuccess] = useState("");

    if (status === "loading" || loadingKandang) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
        );
    }

    if (!kandang) {
        return (
            <div className="flex justify-center py-12">
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-gray-500">Belum ada kandang. Hubungi admin untuk setup kandang.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Merge live WS readings with initial API data
    // liveReadings are newest-first, rawApiData are also newest-first
    const rawApiData = sensorData?.items || [];
    const rawData = useMemo(() => {
        if (liveReadings.length === 0) return rawApiData;
        // Deduplicate: live readings may overlap with API data
        const apiIds = new Set(rawApiData.map((r: any) => r.id));
        const uniqueLive = liveReadings.filter(lr => !apiIds.has(lr.id));
        return [...uniqueLive, ...rawApiData];
    }, [liveReadings, rawApiData]);
    const canInput = session?.user?.role === "admin" || session?.user?.role === "pemilik" || session?.user?.role === "peternak";

    // Prepare chart data (reverse to chronological order, oldest first)
    const chartData = [...rawData].reverse().map((row: any) => ({
        time: new Date(row.timestamp).toLocaleString("id-ID", {
            hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short"
        }),
        suhu: row.suhu,
        kelembaban: row.kelembaban,
        amoniak: row.amoniak,
        populasi: row.populasi,
        death: row.death ?? 0,
        pakan: row.pakan ?? 0,
        minum: row.minum ?? 0,
        hari_ke: row.hari_ke,
    }));

    // Summary stats
    const latestRow = rawData[0];
    const stats = rawData.length > 0 ? {
        avgSuhu: (rawData.reduce((a: number, b: any) => a + (b.suhu || 0), 0) / rawData.length).toFixed(1),
        avgHum: (rawData.reduce((a: number, b: any) => a + (b.kelembaban || 0), 0) / rawData.length).toFixed(1),
        avgAmmo: (rawData.reduce((a: number, b: any) => a + (b.amoniak || 0), 0) / rawData.length).toFixed(1),
        totalDeath: rawData.reduce((a: number, b: any) => a + (b.death || 0), 0),
        maxSuhu: Math.max(...rawData.map((r: any) => r.suhu || 0)).toFixed(1),
        minSuhu: Math.min(...rawData.map((r: any) => r.suhu || 0)).toFixed(1),
    } : null;

    // Handlers
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setFormError("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");
        setFormSuccess("");
        const timestamp = `${formData.tanggal}T${formData.jam}:00`;
        const payload: any = {
            kandang_id: kandangId,
            timestamp,
            hari_ke: parseInt(formData.hari_ke) || 1,
            suhu: parseFloat(formData.suhu) || 0,
            kelembaban: parseFloat(formData.kelembaban) || 0,
            amoniak: parseFloat(formData.amoniak) || 0,
            pakan: parseFloat(formData.pakan) || undefined,
            minum: parseFloat(formData.minum) || undefined,
            populasi: parseInt(formData.populasi) || undefined,
            bobot: parseFloat(formData.bobot) || undefined,
        };
        const result = await createSensorData(payload);
        if (result.success) {
            setFormSuccess("Data sensor berhasil disimpan! Prediksi ML otomatis berjalan.");
            setShowForm(false);
            setFormData({
                hari_ke: "", tanggal: new Date().toISOString().split("T")[0],
                jam: new Date().toTimeString().slice(0, 5),
                suhu: "", kelembaban: "", amoniak: "", pakan: "", minum: "", populasi: "", bobot: "",
            });
            refetch();
        } else {
            setFormError(result.error || "Gagal menyimpan data");
        }
    };

    const openEditModal = (row: any) => {
        setEditingRow(row);
        setEditData({
            pakan: row.pakan?.toString() || "",
            minum: row.minum?.toString() || "",
            bobot: row.bobot?.toString() || "",
            populasi: row.populasi?.toString() || "",
            death: row.death?.toString() || "",
        });
        setEditError("");
        setEditSuccess("");
    };

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditData({ ...editData, [e.target.name]: e.target.value });
        setEditError("");
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setEditError("");
        const payload: any = {};
        if (editData.pakan !== "") payload.pakan = parseFloat(editData.pakan);
        if (editData.minum !== "") payload.minum = parseFloat(editData.minum);
        if (editData.bobot !== "") payload.bobot = parseFloat(editData.bobot);
        if (editData.populasi !== "") payload.populasi = parseInt(editData.populasi);
        if (editData.death !== "") payload.death = parseInt(editData.death);
        const result = await updateSensorData(editingRow.id, payload);
        if (result.success) {
            setEditSuccess("Data berhasil diupdate!");
            setTimeout(() => { setEditingRow(null); setEditSuccess(""); refetch(); }, 1500);
        } else {
            setEditError(result.error || "Gagal mengupdate data");
        }
    };

    const getStatusBadge = (suhu: number, amoniak: number) => {
        if (amoniak > 10 || suhu > 32) return <Badge variant="danger">Danger</Badge>;
        if (amoniak > 5 || suhu > 30) return <Badge variant="warning">Warning</Badge>;
        return <Badge variant="success">Normal</Badge>;
    };

    const formatTimestamp = (ts: string) => {
        try { return new Date(ts).toLocaleString("id-ID"); } catch { return ts; }
    };

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
                    <h1 className="text-2xl font-bold text-gray-900">Data Sensor</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-gray-500">{kandang.nama}</p>
                        <span className="text-gray-300">·</span>
                        <span className={`flex items-center gap-1.5 text-xs ${connected ? "text-green-600" : "text-gray-400"}`}>
                            <span className="relative flex h-2 w-2">
                                {connected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${connected ? "bg-green-500" : "bg-gray-400"}`}></span>
                            </span>
                            {connected ? "Live" : "Connecting..."}
                        </span>
                        {lastReceived && (
                            <span className="text-xs text-gray-400">
                                Data terakhir: {lastReceived.toLocaleTimeString("id-ID")}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Tabs */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setActiveTab("charts")}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === "charts"
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            📊 Grafik
                        </button>
                        <button
                            onClick={() => setActiveTab("table")}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === "table"
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            📋 Tabel
                        </button>
                    </div>
                    {canInput && (
                        <Button onClick={() => setShowForm(!showForm)}>
                            {showForm ? "✕ Tutup" : "+ Input Manual"}
                        </Button>
                    )}
                </div>
            </div>

            {/* Summary stat cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-100">
                        <p className="text-xs text-yellow-600 font-medium">Avg Suhu</p>
                        <p className="text-xl font-bold text-gray-900">{stats.avgSuhu}°C</p>
                        <p className="text-xs text-gray-400 mt-1">{stats.minSuhu}—{stats.maxSuhu}°C</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
                        <p className="text-xs text-blue-600 font-medium">Avg Kelembaban</p>
                        <p className="text-xl font-bold text-gray-900">{stats.avgHum}%</p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border border-orange-100">
                        <p className="text-xs text-orange-600 font-medium">Avg Amoniak</p>
                        <p className="text-xl font-bold text-gray-900">{stats.avgAmmo} ppm</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                        <p className="text-xs text-green-600 font-medium">Populasi</p>
                        <p className="text-xl font-bold text-gray-900">{latestRow?.populasi?.toLocaleString() || "-"}</p>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-4 border border-red-100">
                        <p className="text-xs text-red-600 font-medium">Total Kematian</p>
                        <p className="text-xl font-bold text-red-600">{stats.totalDeath}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
                        <p className="text-xs text-purple-600 font-medium">Total Data</p>
                        <p className="text-xl font-bold text-gray-900">{rawData.length}</p>
                    </div>
                </div>
            )}

            {/* Success Message */}
            {formSuccess && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-700 text-sm">✅ {formSuccess}</p>
                </div>
            )}

            {/* Input Form */}
            {showForm && (
                <Card>
                    <CardHeader><CardTitle>Input Data Sensor Manual</CardTitle></CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {formError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-red-700 text-sm">{formError}</p>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Hari Ke-</label>
                                    <Input type="number" name="hari_ke" value={formData.hari_ke} onChange={handleInputChange} placeholder="1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                                    <Input type="date" name="tanggal" value={formData.tanggal} onChange={handleInputChange} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Jam</label>
                                    <Input type="time" name="jam" value={formData.jam} onChange={handleInputChange} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Suhu (°C)</label>
                                    <Input type="number" step="0.1" name="suhu" value={formData.suhu} onChange={handleInputChange} placeholder="28.5" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Kelembaban (%)</label>
                                    <Input type="number" step="0.1" name="kelembaban" value={formData.kelembaban} onChange={handleInputChange} placeholder="72" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Amoniak (ppm)</label>
                                    <Input type="number" step="0.1" name="amoniak" value={formData.amoniak} onChange={handleInputChange} placeholder="3.2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Bobot (kg)</label>
                                    <Input type="number" step="0.01" name="bobot" value={formData.bobot} onChange={handleInputChange} placeholder="1.2" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Pakan (kg)</label>
                                    <Input type="number" step="0.1" name="pakan" value={formData.pakan} onChange={handleInputChange} placeholder="150" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Minum (L)</label>
                                    <Input type="number" step="0.1" name="minum" value={formData.minum} onChange={handleInputChange} placeholder="200" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Populasi</label>
                                    <Input type="number" name="populasi" value={formData.populasi} onChange={handleInputChange} placeholder="4850" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Batal</Button>
                                <Button type="submit" disabled={creating}>
                                    {creating ? "Menyimpan..." : "Simpan Data"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
            )}

            {/* Error */}
            {error && !loading && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm">❌ {error}</p>
                </div>
            )}

            {/* Empty */}
            {!loading && !error && rawData.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada data sensor</h3>
                        <p className="text-gray-500 mb-4">Data akan masuk otomatis dari IoT device</p>
                        {canInput && <Button onClick={() => setShowForm(true)}>Input Data Manual</Button>}
                    </CardContent>
                </Card>
            )}

            {/* ============ CHARTS VIEW ============ */}
            {activeTab === "charts" && chartData.length > 0 && (
                <div className="space-y-6">
                    {/* Suhu & Kelembaban */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Suhu & Kelembaban</CardTitle>
                                <div className="flex items-center gap-4 text-xs">
                                    <span className="flex items-center gap-1"><span className="w-3 h-1 rounded bg-orange-500"></span> Suhu (°C)</span>
                                    <span className="flex items-center gap-1"><span className="w-3 h-1 rounded bg-blue-500"></span> Kelembaban (%)</span>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={320}>
                                <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="gradSuhu" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="gradHum" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                    <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                                    <YAxis yAxisId="suhu" domain={['auto', 'auto']} tick={{ fontSize: 11 }} stroke="#f97316" />
                                    <YAxis yAxisId="hum" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#3b82f6" />
                                    <Tooltip contentStyle={customTooltipStyle} />
                                    <Area yAxisId="suhu" type="monotone" dataKey="suhu" stroke="#f97316" strokeWidth={2} fill="url(#gradSuhu)" name="Suhu (°C)" />
                                    <Area yAxisId="hum" type="monotone" dataKey="kelembaban" stroke="#3b82f6" strokeWidth={2} fill="url(#gradHum)" name="Kelembaban (%)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Amoniak */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Level Amoniak (NH₃)</CardTitle>
                                <Badge variant="warning">Batas aman: &lt; 10 ppm</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={260}>
                                <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="gradAmmo" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                    <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                                    <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                                    <Tooltip contentStyle={customTooltipStyle} />
                                    {/* Danger threshold line */}
                                    <Area type="monotone" dataKey="amoniak" stroke="#ef4444" strokeWidth={2} fill="url(#gradAmmo)" name="Amoniak (ppm)" dot={{ r: 3, fill: "#ef4444" }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Kematian & Populasi */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Kematian Harian</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={240}>
                                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                        <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                                        <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" allowDecimals={false} />
                                        <Tooltip contentStyle={customTooltipStyle} />
                                        <Bar dataKey="death" fill="#ef4444" name="Kematian" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Populasi</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={240}>
                                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                        <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                                        <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" domain={['auto', 'auto']} />
                                        <Tooltip contentStyle={customTooltipStyle} />
                                        <Line type="monotone" dataKey="populasi" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Populasi" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Pakan & Minum */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Konsumsi Pakan & Minum</CardTitle>
                                <div className="flex items-center gap-4 text-xs">
                                    <span className="flex items-center gap-1"><span className="w-3 h-1 rounded bg-amber-500"></span> Pakan (kg)</span>
                                    <span className="flex items-center gap-1"><span className="w-3 h-1 rounded bg-cyan-500"></span> Minum (L)</span>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={240}>
                                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                    <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                                    <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                                    <Tooltip contentStyle={customTooltipStyle} />
                                    <Line type="monotone" dataKey="pakan" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Pakan (kg)" />
                                    <Line type="monotone" dataKey="minum" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} name="Minum (L)" />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ============ TABLE VIEW ============ */}
            {activeTab === "table" && rawData.length > 0 && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Riwayat Data Sensor</CardTitle>
                            <span className="text-sm text-gray-500">{rawData.length} data</span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-4 px-4 text-xs font-medium text-gray-500">Hari</th>
                                        <th className="text-left py-4 px-4 text-xs font-medium text-gray-500">Waktu</th>
                                        <th className="text-left py-4 px-4 text-xs font-medium text-gray-500">Suhu</th>
                                        <th className="text-left py-4 px-4 text-xs font-medium text-gray-500">Hum</th>
                                        <th className="text-left py-4 px-4 text-xs font-medium text-gray-500">NH₃</th>
                                        <th className="text-left py-4 px-4 text-xs font-medium text-gray-500">Pop</th>
                                        <th className="text-left py-4 px-4 text-xs font-medium text-gray-500">Death</th>
                                        <th className="text-left py-4 px-4 text-xs font-medium text-gray-500">Status</th>
                                        {canInput && <th className="text-left py-4 px-4 text-xs font-medium text-gray-500">Aksi</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rawData.map((row: any) => (
                                        <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50">
                                            <td className="py-3 px-4 text-sm text-gray-600">H{row.hari_ke}</td>
                                            <td className="py-3 px-4 text-sm text-gray-600">{formatTimestamp(row.timestamp)}</td>
                                            <td className="py-3 px-4">
                                                <span className={row.suhu > 32 ? "text-red-600 font-medium" : "text-gray-900"}>
                                                    {row.suhu}°C
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-900">{row.kelembaban}%</td>
                                            <td className="py-3 px-4">
                                                <span className={row.amoniak > 10 ? "text-red-600 font-medium" : "text-gray-900"}>
                                                    {row.amoniak} ppm
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-900">{row.populasi?.toLocaleString() || "-"}</td>
                                            <td className="py-3 px-4">
                                                <span className={row.death > 0 ? "text-red-600 font-medium" : "text-gray-900"}>
                                                    {row.death ?? 0}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">{getStatusBadge(row.suhu, row.amoniak)}</td>
                                            {canInput && (
                                                <td className="py-3 px-4">
                                                    <button
                                                        onClick={() => openEditModal(row)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                                    >
                                                        Edit
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Edit Modal */}
            {editingRow && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Edit Data Manual</h3>
                            <button onClick={() => setEditingRow(null)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">Hari {editingRow.hari_ke} · {formatTimestamp(editingRow.timestamp)}</p>
                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            {editError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-red-700 text-sm">{editError}</p></div>}
                            {editSuccess && <div className="p-3 bg-green-50 border border-green-200 rounded-lg"><p className="text-green-700 text-sm">✅ {editSuccess}</p></div>}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Pakan (kg)</label>
                                    <Input type="number" step="0.1" name="pakan" value={editData.pakan} onChange={handleEditChange} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Minum (L)</label>
                                    <Input type="number" step="0.1" name="minum" value={editData.minum} onChange={handleEditChange} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Bobot (kg)</label>
                                    <Input type="number" step="0.01" name="bobot" value={editData.bobot} onChange={handleEditChange} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Populasi</label>
                                    <Input type="number" name="populasi" value={editData.populasi} onChange={handleEditChange} />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Kematian</label>
                                    <Input type="number" name="death" value={editData.death} onChange={handleEditChange} />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="secondary" onClick={() => setEditingRow(null)}>Batal</Button>
                                <Button type="submit" disabled={updating}>{updating ? "Menyimpan..." : "Simpan"}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
