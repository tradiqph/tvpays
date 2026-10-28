"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthField } from "@/components/auth/AuthField";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setMessage(
        data.message ??
          "If an account exists for that email, we sent a password reset link.",
      );
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Forgot password"
      subtitle="We’ll email you a secure link to choose a new password"
      footer={
        <p className="text-center text-sm text-slate-400">
          Remembered it?{" "}
          <Link
            href="/login"
            className="font-medium text-sky-300 underline-offset-2 hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <AuthField
          id="email"
          label="Email"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={setEmail}
          required
          autoComplete="email"
          delay={0.18}
        />
        {error && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-red-400"
          >
            {error}
          </motion.p>
        )}
        {message && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-sky-500/30 bg-sky-950/40 px-4 py-3 text-sm text-sky-100/90"
          >
            {message}
          </motion.p>
        )}
        <AuthSubmitButton loading={loading}>Send reset link</AuthSubmitButton>
      </form>
    </AuthShell>
  );
}
