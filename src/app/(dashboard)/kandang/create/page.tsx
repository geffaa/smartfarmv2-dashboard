"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import Link from "next/link";
import { useCreateKandang, useUsers } from "@/hooks/useApi";

export default function CreateKandangPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const { mutate: createKandang, loading: creating } = useCreateKandang();
    const { data: usersData } = useUsers({ role: "pemilik" });

    const [formData, setFormData] = useState({
        nama: "",
        kode: "",
        lokasi: "",
        kapasitas: "",
        deskripsi: "",
        pemilik_id: "",
    });
    const [error, setError] = useState("");

    if (status === "loading") {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
        );
    }

    const isAdmin = session?.user?.role === "admin";
    const isPemilik = session?.user?.role === "pemilik";
    const canCreate = isAdmin || isPemilik;

    // List of pemilik users for admin dropdown
    const pemilikUsers = usersData?.items || [];

    if (!canCreate) {
        return (
            <div className="space-y-6">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700">Anda tidak memiliki akses untuk membuat kandang</p>
                </div>
                <Link href="/kandang">
                    <Button variant="secondary">← Kembali</Button>
                </Link>
            </div>
        );
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!formData.nama.trim()) {
            setError("Nama kandang wajib diisi");
            return;
        }

        if (!formData.kode.trim()) {
            setError("Kode kandang wajib diisi");
            return;
        }

        // Determine pemilik_id
        let pemilikId: string;
        if (isPemilik) {
            // Pemilik uses their own ID
            pemilikId = (session?.user as any)?.id;
            if (!pemilikId) {
                setError("User ID tidak ditemukan. Silakan login ulang.");
                return;
            }
        } else if (isAdmin) {
            if (!formData.pemilik_id) {
                setError("Pilih pemilik kandang terlebih dahulu");
                return;
            }
            pemilikId = formData.pemilik_id;
        } else {
            setError("Anda tidak memiliki akses");
            return;
        }

        const payload: any = {
            nama: formData.nama,
            kode: formData.kode,
            pemilik_id: pemilikId,
            lokasi: formData.lokasi || undefined,
            kapasitas: formData.kapasitas ? parseInt(formData.kapasitas) : undefined,
            deskripsi: formData.deskripsi || undefined,
        };

        const result = await createKandang(payload);

        if (result.success) {
            router.push("/kandang");
        } else {
            setError(result.error || "Gagal membuat kandang");
        }
    };

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
                <Link href="/kandang" className="hover:text-green-600">Kandang</Link>
                <span>/</span>
                <span className="text-gray-900">Tambah Kandang</span>
            </div>

            {/* Form Card */}
            <Card className="max-w-full">
                <CardHeader>
                    <CardTitle>Tambah Kandang Baru</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-red-700 text-sm">{error}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    Kode Kandang *
                                </label>
                                <Input
                                    name="kode"
                                    value={formData.kode}
                                    onChange={handleChange}
                                    placeholder="Contoh: KDG-A1"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">Kode unik untuk identifikasi kandang</p>
                            </div>

                            {/* Pemilik dropdown - only for Admin */}
                            {isAdmin && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Pemilik Kandang *
                                    </label>
                                    <Select
                                        name="pemilik_id"
                                        value={formData.pemilik_id}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="">Pilih Pemilik</option>
                                        {pemilikUsers.map((user: any) => (
                                            <option key={user.id} value={user.id}>
                                                {user.full_name} ({user.username})
                                            </option>
                                        ))}
                                    </Select>
                                    <p className="text-xs text-gray-500 mt-1">Pilih pemilik yang bertanggung jawab atas kandang ini</p>
                                </div>
                            )}

                            {/* Show pemilik info for Pemilik role */}
                            {isPemilik && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Pemilik
                                    </label>
                                    <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 text-sm">
                                        {session?.user?.name || session?.user?.email} (Anda)
                                    </div>
                                </div>
                            )}

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
                                    Kapasitas (ekor)
                                </label>
                                <Input
                                    type="number"
                                    name="kapasitas"
                                    value={formData.kapasitas}
                                    onChange={handleChange}
                                    placeholder="Contoh: 5000"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Deskripsi
                            </label>
                            <textarea
                                name="deskripsi"
                                value={formData.deskripsi}
                                onChange={handleChange}
                                placeholder="Deskripsi kandang (opsional)"
                                rows={3}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <Link href="/kandang">
                                <Button type="button" variant="secondary">Batal</Button>
                            </Link>
                            <Button type="submit" disabled={creating}>
                                {creating ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Menyimpan...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        Simpan Kandang
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
