"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api";
import { useMyActivityLogs, ActivityLog } from "@/hooks/useApi";

export default function SettingsPage() {
    const { data: session, status } = useSession();

    const [passwordData, setPasswordData] = useState({
        current_password: "",
        new_password: "",
        confirm_password: "",
    });
    const [passwordError, setPasswordError] = useState("");
    const [passwordSuccess, setPasswordSuccess] = useState("");
    const [changingPassword, setChangingPassword] = useState(false);

    const { data: myLogsData, loading: loadingLogs } = useMyActivityLogs({ per_page: 10 });

    if (status === "loading") {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
        );
    }

    const user = session?.user;

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
        setPasswordError("");
        setPasswordSuccess("");
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError("");
        setPasswordSuccess("");

        if (passwordData.new_password !== passwordData.confirm_password) {
            setPasswordError("Password baru tidak cocok");
            return;
        }

        if (passwordData.new_password.length < 6) {
            setPasswordError("Password minimal 6 karakter");
            return;
        }

        setChangingPassword(true);
        try {
            const token = session?.accessToken as string;
            await authApi.changePassword(
                passwordData.current_password,
                passwordData.new_password,
                token
            );
            setPasswordSuccess("Password berhasil diubah!");
            setPasswordData({ current_password: "", new_password: "", confirm_password: "" });
        } catch (error: any) {
            setPasswordError(error.message || "Gagal mengubah password");
        } finally {
            setChangingPassword(false);
        }
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case "admin":
                return <Badge variant="info">Admin</Badge>;
            case "pemilik":
                return <Badge variant="success">Pemilik</Badge>;
            case "peternak":
                return <Badge variant="default">Peternak</Badge>;
            default:
                return <Badge>{role}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>
                <p className="text-gray-500 mt-1">
                    Kelola profil dan keamanan akun Anda
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Section */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Profile Info Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Informasi Profil
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-start gap-6">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                                    {user?.name?.charAt(0).toUpperCase() || "U"}
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500 mb-1">Nama Lengkap</label>
                                            <p className="text-gray-900 font-medium">{user?.name || "Nama User"}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500 mb-1">Username</label>
                                            <p className="text-gray-900">@{user?.email?.split('@')[0] || "username"}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                                            <p className="text-gray-900">{user?.email || "email@example.com"}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500 mb-1">Role</label>
                                            <div>{getRoleBadge(user?.role || "user")}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Change Password Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Ubah Password
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
                                {passwordError && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <p className="text-red-700 text-sm">{passwordError}</p>
                                    </div>
                                )}
                                {passwordSuccess && (
                                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                        <p className="text-green-700 text-sm">✅ {passwordSuccess}</p>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Password Lama
                                    </label>
                                    <Input
                                        type="password"
                                        name="current_password"
                                        value={passwordData.current_password}
                                        onChange={handlePasswordChange}
                                        placeholder="Masukkan password lama"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Password Baru
                                    </label>
                                    <Input
                                        type="password"
                                        name="new_password"
                                        value={passwordData.new_password}
                                        onChange={handlePasswordChange}
                                        placeholder="Masukkan password baru"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Konfirmasi Password Baru
                                    </label>
                                    <Input
                                        type="password"
                                        name="confirm_password"
                                        value={passwordData.confirm_password}
                                        onChange={handlePasswordChange}
                                        placeholder="Konfirmasi password baru"
                                        required
                                    />
                                </div>

                                <div className="pt-2">
                                    <Button type="submit" disabled={changingPassword}>
                                        {changingPassword ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Mengubah...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                Simpan Password
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* My Activity Logs */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Aktivitas Terakhir Saya
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingLogs ? (
                                <div className="flex justify-center py-6">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                                </div>
                            ) : (myLogsData?.items?.length ?? 0) === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-6">Belum ada aktivitas</p>
                            ) : (
                                <div className="space-y-3">
                                    {myLogsData!.items.map((log: ActivityLog) => (
                                        <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                            <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${log.action.startsWith("create") || log.action === "login" ? "bg-green-500" :
                                                    log.action.startsWith("update") || log.action === "change_password" ? "bg-blue-500" :
                                                        log.action.startsWith("delete") ? "bg-red-500" : "bg-gray-400"
                                                }`}></div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900">
                                                    {log.action.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {log.resource && (
                                                        <span className="text-xs text-gray-500 capitalize">{log.resource}</span>
                                                    )}
                                                    {log.platform && (
                                                        <>
                                                            <span className="text-xs text-gray-300">·</span>
                                                            <span className="text-xs text-gray-500 capitalize">{log.platform}</span>
                                                        </>
                                                    )}
                                                    <span className="text-xs text-gray-300">·</span>
                                                    <span className="text-xs text-gray-400">
                                                        {new Date(log.created_at).toLocaleString("id-ID", {
                                                            day: "numeric",
                                                            month: "short",
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Account Info Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Info Akun
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Status Akun</p>
                                    <p className="text-xs text-green-600">Aktif</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Sesi Login</p>
                                    <p className="text-xs text-gray-500">Aktif sekarang</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Help */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Bantuan
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p className="text-sm text-gray-500">
                                Butuh bantuan? Hubungi administrator sistem.
                            </p>
                            <a
                                href="mailto:support@smartfarm.com"
                                className="inline-flex items-center gap-2 text-sm text-green-600 hover:text-green-700"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                support@smartfarm.com
                            </a>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
