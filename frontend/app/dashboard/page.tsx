"use client";

import React, { useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useUserSession } from "@/lib/auth-context";

const EducatorDashboard = dynamic(
  () => import("@/components/EducatorDashboard").then((mod) => mod.EducatorDashboard),
  {
    loading: () => <p style={{ textAlign: "center", padding: "40px" }}>Loading Educator Portal...</p>,
    ssr: false,
  }
);

const InstitutionalStudent = dynamic(
  () => import("@/components/student/InstitutionalStudent").then((mod) => mod.InstitutionalStudent),
  {
    loading: () => <p style={{ textAlign: "center", padding: "40px" }}>Loading Student Portal...</p>,
    ssr: false,
  }
);

export default function DashboardPage() {
  const { user, isLoading } = useUserSession();
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
    <div>
      {user.role === "educator" ? (
        <EducatorDashboard />
      ) : (
        <InstitutionalStudent />
      )}
    </div>
  );
}

