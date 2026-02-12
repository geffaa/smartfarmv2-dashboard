"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { NotificationProvider } from "@/components/notification-provider";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <NotificationProvider>
            <div className="min-h-screen bg-gray-50">
                <Sidebar />
                <Navbar />
                <main className="ml-64 pt-24 px-8 pb-8">
                    <div className="animate-fade-in">{children}</div>
                </main>
            </div>
        </NotificationProvider>
    );
}
