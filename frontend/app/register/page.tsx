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
      <div className="flex-grow flex justify-center items-center py-16">
        <p className="text-xs text-accent-muted font-bold tracking-wide uppercase">Creating Account...</p>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col justify-center items-center px-4 py-16">
      <div className="w-full max-w-md space-y-6">
        
        {/* Title Block */}
        <div className="text-center space-y-2">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-text-heading">
            Create an Account
          </h2>
          <p className="text-xs text-accent-muted font-semibold">
            Join Asala Hub learning portal
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

            {/* Full Name Field */}
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="text-xs font-bold text-text-heading uppercase tracking-wider block">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isSubmitting}
                className="input-field"
                placeholder="John Doe"
                required
              />
              {errors.fullName && (
                <p className="text-xs text-accent-danger font-bold">{errors.fullName}</p>
              )}
            </div>

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
                placeholder="Min. 6 characters"
                required
              />
              {errors.password && (
                <p className="text-xs text-accent-danger font-bold">{errors.password}</p>
              )}
            </div>

            {/* Role Select Field (Simple Native Radio Blocks) */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-text-heading uppercase tracking-wider block">
                Workspace Role
              </span>
              <div className="flex gap-6 text-xs font-bold">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="student"
                    checked={role === "student"}
                    onChange={() => setRole("student")}
                    disabled={isSubmitting}
                  />
                  <span>Learn as Student</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="educator"
                    checked={role === "educator"}
                    onChange={() => setRole("educator")}
                    disabled={isSubmitting}
                  />
                  <span>Teach as Educator</span>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-2.5"
            >
              {isSubmitting ? "Creating account..." : "Register Now"}
            </button>
          </form>

          {/* Switch page footnote */}
          <div className="text-center text-xs text-accent-muted font-bold">
            Already have an account?{" "}
            <Link href="/login" className="text-text-heading underline">
              Sign in
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
