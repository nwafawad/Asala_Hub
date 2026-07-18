"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { user, login, isLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, isLoading, router]);

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Invalid email format";
    }
    if (!password) {
      newErrors.password = "Password is required";
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
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setErrors({
        form: err.message || "Invalid credentials. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || user) {
    return (
      <div className="flex-grow flex justify-center items-center py-16">
        <p className="text-xs text-accent-muted font-bold tracking-wide uppercase">Verifying Session...</p>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col justify-center items-center px-4 py-16">
      <div className="w-full max-w-md space-y-6">
        
        {/* Title Block */}
        <div className="text-center space-y-2">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-text-heading">
            Sign In to Asala Hub
          </h2>
          <p className="text-xs text-accent-muted font-semibold">
            Offline-first curriculum workspace
          </p>
        </div>

        {/* Card Form */}
        <div className="card space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Form Error */}
            {errors.form && (
              <div className="rounded border border-accent-danger bg-surface-base p-3 text-xs text-accent-danger font-bold">
                {errors.form}
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-bold text-text-heading uppercase tracking-wider block">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                className="input-field"
                placeholder="you@example.com"
                required
              />
              {errors.email && (
                <p className="text-xs text-accent-danger font-bold">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-bold text-text-heading uppercase tracking-wider block">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                className="input-field"
                placeholder="••••••••"
                required
              />
              {errors.password && (
                <p className="text-xs text-accent-danger font-bold">{errors.password}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-2.5"
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Footnote */}
          <div className="text-center text-xs text-accent-muted font-bold">
            Don't have an account?{" "}
            <Link href="/register" className="text-text-heading underline">
              Create an account
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
