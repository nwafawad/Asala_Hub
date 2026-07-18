"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { UserRole } from "@/lib/api";

export default function RegisterPage() {
  const { user, register, isLoading } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("student");

  const [errors, setErrors] = useState<{ fullName?: string; email?: string; password?: string; form?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, isLoading, router]);

  const validate = () => {
    const newErrors: { fullName?: string; email?: string; password?: string } = {};
    if (!fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Invalid email format";
    }
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});
    try {
      await register({
        full_name: fullName,
        email,
        password,
        role,
      });
      router.push("/dashboard");
    } catch (err: any) {
      setErrors({
        form: err.message || "Registration failed. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || user) {
    return (
      <div className="flex-1 flex justify-center items-center py-12">
        <div className="h-8 w-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-8 sm:py-16 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.12),rgba(255,255,255,0))]">
      <div className="w-full max-w-md space-y-6 sm:space-y-8">
        
        {/* Title Block */}
        <div className="text-center space-y-2">
          <h2 className="font-outfit text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Create an account
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Start learning or teaching offline-first with Asala Hub
          </p>
        </div>

        {/* Card Form */}
        <div className="rounded-2xl border border-white/5 bg-[#12131a]/80 p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Form Error */}
            {errors.form && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs text-rose-400 font-medium">
                {errors.form}
              </div>
            )}

            {/* Full Name Field */}
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-4 py-2.5 rounded-xl border border-white/5 bg-black/30 text-white font-sans text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200"
                placeholder="John Doe"
              />
              {errors.fullName && (
                <p className="text-xs text-rose-400">{errors.fullName}</p>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-4 py-2.5 rounded-xl border border-white/5 bg-black/30 text-white font-sans text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200"
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="text-xs text-rose-400">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-4 py-2.5 rounded-xl border border-white/5 bg-black/30 text-white font-sans text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200"
                placeholder="Min. 6 characters"
              />
              {errors.password && (
                <p className="text-xs text-rose-400">{errors.password}</p>
              )}
            </div>

            {/* Role Select Field */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                I want to
              </span>
              <div className="grid grid-cols-2 gap-4">
                {/* Student Option */}
                <label className={`relative flex items-center justify-center p-4 rounded-xl border cursor-pointer select-none transition-all duration-200 ${
                  role === "student"
                    ? "border-indigo-500 bg-indigo-500/10 text-white shadow-md shadow-indigo-500/5"
                    : "border-white/5 bg-black/20 text-slate-400 hover:bg-black/30 hover:border-white/10"
                }`}>
                  <input
                    type="radio"
                    name="role"
                    value="student"
                    checked={role === "student"}
                    onChange={() => setRole("student")}
                    disabled={isSubmitting}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <span className="block font-semibold text-sm">Learn</span>
                    <span className="block text-[10px] opacity-75 mt-0.5">As a Student</span>
                  </div>
                </label>

                {/* Educator Option */}
                <label className={`relative flex items-center justify-center p-4 rounded-xl border cursor-pointer select-none transition-all duration-200 ${
                  role === "educator"
                    ? "border-indigo-500 bg-indigo-500/10 text-white shadow-md shadow-indigo-500/5"
                    : "border-white/5 bg-black/20 text-slate-400 hover:bg-black/30 hover:border-white/10"
                }`}>
                  <input
                    type="radio"
                    name="role"
                    value="educator"
                    checked={role === "educator"}
                    onChange={() => setRole("educator")}
                    disabled={isSubmitting}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <span className="block font-semibold text-sm">Teach</span>
                    <span className="block text-[10px] opacity-75 mt-0.5">As an Educator</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/15 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 transition-all duration-200 cursor-pointer"
            >
              {isSubmitting ? "Creating account..." : "Register Now"}
            </button>
          </form>

          {/* Footnotes */}
          <div className="mt-6 text-center text-xs text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-400 hover:underline font-semibold transition-colors duration-150">
              Sign in
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
