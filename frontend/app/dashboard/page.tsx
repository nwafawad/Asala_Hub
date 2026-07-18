"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { EducatorDashboard } from "@/components/EducatorDashboard";
import { StudentDashboard } from "@/components/StudentDashboard";

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center py-12">
        <div className="h-8 w-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
        <span className="text-xs text-slate-400 font-medium mt-3">Loading dashboard...</span>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0b0c10]">
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8 flex-grow flex flex-col">
        {user.role === "educator" ? (
          <EducatorDashboard />
        ) : (
          <StudentDashboard />
        )}
      </div>
    </div>
  );
}
