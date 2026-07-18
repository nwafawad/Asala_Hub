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
      <div style={{ padding: "50px", textAlign: "center" }}>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div style={{ padding: "20px" }}>
      {user.role === "educator" ? (
        <EducatorDashboard />
      ) : (
        <StudentDashboard />
      )}
    </div>
  );
}
