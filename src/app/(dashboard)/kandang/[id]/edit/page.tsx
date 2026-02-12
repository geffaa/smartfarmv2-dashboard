"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import Link from "next/link";
import { useKandang, useUpdateKandang } from "@/hooks/useApi";

export default function EditKandangPage() {
    const { id } = useParams();
    const router = useRouter();
    const { status } = useSession();
    const { data: kandang, loading: fetching, error: fetchError } = useKandang(id as string);
    const { mutate: updateKandang, loading: updating } = useUpdateKandang();

    const [formData, setFormData] = useState({
        nama: "",
        kode: "",
        lokasi: "",
        kapasitas: "",
        is_active: true,
    });
    const [error, setError] = useState("");

    // Populate form when data loads
    useEffect(() => {
        if (kandang) {
            setFormData({
                nama: kandang.nama || "",
                kode: kandang.kode || "",
                lokasi: kandang.lokasi || "",
                kapasitas: kandang.kapasitas?.toString() || "",
                is_active: kandang.is_active ?? true,
            });
        }
    }, [kandang]);

    if (status === "loading" || fetching) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
        );
    }

    if (fetchError && !kandang) {
        return (
            <div className="space-y-6">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700">Gagal memuat data kandang</p>
                </div>
                <Link href="/kandang">
                    <Button variant="secondary">← Kembali</Button>
                </Link>
            </div>
        );
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
        }));
        setError("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!formData.nama.trim()) {
            setError("Nama kandang wajib diisi");
            return;
        }

        const payload = {
            nama: formData.nama,
            kode: formData.kode || undefined,
            lokasi: formData.lokasi || undefined,
            kapasitas: formData.kapasitas ? parseInt(formData.kapasitas) : undefined,
            is_active: formData.is_active,
        };

        const result = await updateKandang(id as string, payload);

        if (result.success) {
            router.push(`/kandang/${id}`);
        } else {
            setError(result.error || "Gagal mengupdate kandang");
        }
    };

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
                <Link href="/kandang" className="hover:text-green-600">Kandang</Link>
                <span>/</span>
                <Link href={`/kandang/${id}`} className="hover:text-green-600">{kandang?.nama || "Detail"}</Link>
                <span>/</span>
                <span className="text-gray-900">Edit</span>
            </div>

            {/* Form Card */}
            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>Edit Kandang</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-red-700 text-sm">{error}</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nama Kandang *
                                </label>
                                <Input
                                    name="nama"
                                    value={formData.nama}
                                    onChange={handleChange}
                                    placeholder="Contoh: Kandang A1"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Kode Kandang
                                </label>
                                <Input
                                    name="kode"
                                    value={formData.kode}
                                    onChange={handleChange}
                                    placeholder="Contoh: KDG-A1"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Lokasi
                                </label>
                                <Input
                                    name="lokasi"
                                    value={formData.lokasi}
                                    onChange={handleChange}
                                    placeholder="Contoh: Blok A - Utara"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Kapasitas
                                </label>
                                <Input
                                    type="number"
                                    name="kapasitas"
                                    value={formData.kapasitas}
                                    onChange={handleChange}
                                    placeholder="Contoh: 5000"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Status
                                </label>
                                <Select
                                    name="is_active"
                                    value={formData.is_active ? "true" : "false"}
                                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.value === "true" }))}
                                >
                                    <option value="true">Aktif</option>
                                    <option value="false">Non-aktif</option>
                                </Select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <Link href={`/kandang/${id}`}>
                                <Button type="button" variant="secondary">Batal</Button>
                            </Link>
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
                </CardContent>
            </Card>
        </div>
    );
}
