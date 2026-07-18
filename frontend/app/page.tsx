"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-16 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]">
      <div className="w-full max-w-md text-center space-y-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-purple-500/25 animate-pulse">
            A
          </div>
          <h1 className="font-outfit text-2xl font-extrabold text-white">
            Asala Hub
          </h1>
          <div className="flex flex-col items-center space-y-2">
            <div className="h-6 w-6 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
            <span className="text-xs text-slate-400 font-medium">Loading workspace...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
