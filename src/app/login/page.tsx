"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const result = await signIn("credentials", {
                username,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError("Username atau password salah");
            } else {
                router.push("/");
                router.refresh();
            }
        } catch (err) {
            setError("Terjadi kesalahan. Silakan coba lagi.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 mb-4">
                        <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">SmartFarm</h1>
                    <p className="text-gray-500 mt-1">Masuk ke dashboard Anda</p>
                </div>

                {/* Login Card */}
                <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <Input
                            id="username"
                            label="Username atau Email"
                            type="text"
                            placeholder="Masukkan username atau email"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            disabled={isLoading}
                        />

                        <Input
                            id="password"
                            label="Password"
                            type="password"
                            placeholder="Masukkan password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={isLoading}
                        />

                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full"
                            size="lg"
                            isLoading={isLoading}
                        >
                            Masuk
                        </Button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-sm text-gray-400 mt-6">
                    © 2026 SmartFarm. Sistem Monitoring Peternakan Cerdas.
                </p>
            </div>
        </div>
    );
}
