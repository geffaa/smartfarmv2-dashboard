"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { useSensorData, useKandangs, useCreateSensorData, useUpdateSensorData, Kandang } from "@/hooks/useApi";

export default function SensorDataPage() {
    const { data: session, status } = useSession();
    const { data: sensorData, loading, error, refetch } = useSensorData();
    const { data: kandangData } = useKandangs();
    const { mutate: createSensorData, loading: creating } = useCreateSensorData();
    const { mutate: updateSensorData, loading: updating } = useUpdateSensorData();

    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        kandang_id: "",
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
        luas_kandang: "",
    });
    const [formError, setFormError] = useState("");
    const [formSuccess, setFormSuccess] = useState("");

    // Edit modal state
    const [editingRow, setEditingRow] = useState<any>(null);
    const [editData, setEditData] = useState({
        pakan: "",
        minum: "",
        bobot: "",
        populasi: "",
        death: "",
    });
    const [editError, setEditError] = useState("");
    const [editSuccess, setEditSuccess] = useState("");

    if (status === "loading") {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
        );
    }

    const data = sensorData?.items || [];
    const kandangs = kandangData?.items || [];
    const canInput = session?.user?.role === "admin" || session?.user?.role === "pemilik" || session?.user?.role === "peternak";

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setFormError("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");
        setFormSuccess("");

        if (!formData.kandang_id) {
            setFormError("Pilih kandang terlebih dahulu");
            return;
        }

        // Create timestamp from tanggal and jam
        const timestamp = `${formData.tanggal}T${formData.jam}:00`;

        const payload: any = {
            kandang_id: formData.kandang_id,
            timestamp: timestamp,
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
            setFormSuccess("Data sensor berhasil disimpan!");
            setShowForm(false);
            setFormData({
                kandang_id: "",
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
                luas_kandang: "",
            });
            refetch();
        } else {
            setFormError(result.error || "Gagal menyimpan data");
        }
    };

    // Edit handlers
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
        setEditSuccess("");

        const payload: any = {};
        if (editData.pakan !== "") payload.pakan = parseFloat(editData.pakan);
        if (editData.minum !== "") payload.minum = parseFloat(editData.minum);
        if (editData.bobot !== "") payload.bobot = parseFloat(editData.bobot);
        if (editData.populasi !== "") payload.populasi = parseInt(editData.populasi);
        if (editData.death !== "") payload.death = parseInt(editData.death);

        const result = await updateSensorData(editingRow.id, payload);

        if (result.success) {
            setEditSuccess("Data berhasil diupdate!");
            setTimeout(() => {
                setEditingRow(null);
                setEditSuccess("");
                refetch();
            }, 1500);
        } else {
            setEditError(result.error || "Gagal mengupdate data");
        }
    };

    const getStatusBadge = (suhu: number, amoniak: number) => {
        if (amoniak > 10 || suhu > 32) return <Badge variant="danger">Danger</Badge>;
        if (amoniak > 5 || suhu > 30) return <Badge variant="warning">Warning</Badge>;
        return <Badge variant="success">Normal</Badge>;
    };

    const formatTimestamp = (timestamp: string) => {
        try {
            const date = new Date(timestamp);
            return date.toLocaleString("id-ID");
        } catch {
            return timestamp;
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Data Sensor</h1>
                    <p className="text-gray-500 mt-1">
                        Monitoring dan input data sensor IoT
                    </p>
                </div>
                {canInput && (
                    <Button onClick={() => setShowForm(!showForm)}>
                        {showForm ? (
                            <>
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Tutup Form
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Input Data
                            </>
                        )}
                    </Button>
                )}
            </div>

            {/* Success Message */}
            {formSuccess && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-700 text-sm">✅ {formSuccess}</p>
                </div>
            )}

            {/* Input Form */}
            {showForm && (
                <Card>
                    <CardHeader>
                        <CardTitle>Input Data Sensor Manual</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {formError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-red-700 text-sm">{formError}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Kandang *</label>
                                    <Select name="kandang_id" value={formData.kandang_id} onChange={handleInputChange} required>
                                        <option value="">Pilih Kandang</option>
                                        {kandangs.map((k: Kandang) => (
                                            <option key={k.id} value={k.id}>{k.nama}</option>
                                        ))}
                                    </Select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Hari Ke-</label>
                                    <Input type="number" name="hari_ke" value={formData.hari_ke} onChange={handleInputChange} placeholder="1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                                    <Input type="date" name="tanggal" value={formData.tanggal} onChange={handleInputChange} />
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Jam</label>
                                    <Input type="time" name="jam" value={formData.jam} onChange={handleInputChange} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Bobot (kg)</label>
                                    <Input type="number" step="0.01" name="bobot" value={formData.bobot} onChange={handleInputChange} placeholder="1.2" />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                                    Batal
                                </Button>
                                <Button type="submit" disabled={creating}>
                                    {creating ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Menyimpan...
                                        </>
                                    ) : (
                                        "Simpan Data"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Edit Modal */}
            {editingRow && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900">Edit Data Manual</h3>
                                <button
                                    onClick={() => setEditingRow(null)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <p className="text-sm text-gray-500 mb-4">
                                Kandang: <span className="font-medium text-gray-700">{editingRow.kandang?.nama || "N/A"}</span>
                                {" · "}Hari {editingRow.hari_ke} · {formatTimestamp(editingRow.timestamp)}
                            </p>

                            <form onSubmit={handleEditSubmit} className="space-y-4">
                                {editError && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <p className="text-red-700 text-sm">{editError}</p>
                                    </div>
                                )}
                                {editSuccess && (
                                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                        <p className="text-green-700 text-sm">✅ {editSuccess}</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Pakan (kg)</label>
                                        <Input
                                            type="number"
                                            step="0.1"
                                            name="pakan"
                                            value={editData.pakan}
                                            onChange={handleEditChange}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Minum (L)</label>
                                        <Input
                                            type="number"
                                            step="0.1"
                                            name="minum"
                                            value={editData.minum}
                                            onChange={handleEditChange}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Bobot (kg)</label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            name="bobot"
                                            value={editData.bobot}
                                            onChange={handleEditChange}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Populasi</label>
                                        <Input
                                            type="number"
                                            name="populasi"
                                            value={editData.populasi}
                                            onChange={handleEditChange}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Kematian (Death)</label>
                                        <Input
                                            type="number"
                                            name="death"
                                            value={editData.death}
                                            onChange={handleEditChange}
                                            placeholder="0"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-2">
                                    <Button type="button" variant="secondary" onClick={() => setEditingRow(null)}>
                                        Batal
                                    </Button>
                                    <Button type="submit" disabled={updating}>
                                        {updating ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Menyimpan...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                Simpan Perubahan
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
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
                    <p className="text-red-700 text-sm">❌ Gagal mengambil data: {error}</p>
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && data.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada data sensor</h3>
                        <p className="text-gray-500 mb-4">Mulai dengan menginput data sensor pertama</p>
                        {canInput && (
                            <Button onClick={() => setShowForm(true)}>Input Data Sensor</Button>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Data Table */}
            {!loading && data.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Riwayat Data Sensor</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Kandang</th>
                                        <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Hari</th>
                                        <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Waktu</th>
                                        <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Suhu</th>
                                        <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Kelembaban</th>
                                        <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Amoniak</th>
                                        <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Populasi</th>
                                        <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Status</th>
                                        {canInput && (
                                            <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Aksi</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((row: any) => (
                                        <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="py-4 px-6">
                                                <span className="font-medium text-gray-900">{row.kandang?.nama || "N/A"}</span>
                                            </td>
                                            <td className="py-4 px-6 text-gray-600">Hari {row.hari_ke}</td>
                                            <td className="py-4 px-6 text-gray-600">{formatTimestamp(row.timestamp)}</td>
                                            <td className="py-4 px-6">
                                                <span className={row.suhu > 30 ? "text-red-600 font-medium" : "text-gray-900"}>
                                                    {row.suhu}°C
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-gray-900">{row.kelembaban}%</td>
                                            <td className="py-4 px-6">
                                                <span className={row.amoniak > 10 ? "text-red-600 font-medium" : "text-gray-900"}>
                                                    {row.amoniak} ppm
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-gray-900">{row.populasi?.toLocaleString() || "-"}</td>
                                            <td className="py-4 px-6">{getStatusBadge(row.suhu, row.amoniak)}</td>
                                            {canInput && (
                                                <td className="py-4 px-6">
                                                    <button
                                                        onClick={() => openEditModal(row)}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
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
        </div>
    );
}
