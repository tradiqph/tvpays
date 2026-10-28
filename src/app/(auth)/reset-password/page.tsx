"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthField } from "@/components/auth/AuthField";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setReady(true);
        setChecking(false);
      }
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true);
      }
      setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push("/wallet");
    router.refresh();
  }

  return (
    <AuthShell
      title="New password"
      subtitle="Choose a strong password for your TvPays account"
      footer={
        <p className="text-center text-sm text-slate-400">
          <Link
            href="/login"
            className="font-medium text-sky-300 underline-offset-2 hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      }
    >
      {checking ? (
        <p className="text-sm text-slate-500">Verifying reset link…</p>
      ) : !ready ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-amber-500/35 bg-amber-950/30 px-4 py-4 text-sm text-amber-100/90"
        >
          <p>This reset link is invalid or has expired.</p>
          <Link
            href="/forgot-password"
            className="mt-3 inline-block font-medium text-sky-300 underline"
          >
            Request a new link
          </Link>
        </motion.div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <AuthField
            id="password"
            label="New password"
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={setPassword}
            required
            minLength={6}
            autoComplete="new-password"
            delay={0.18}
          />
          <AuthField
            id="confirm"
            label="Confirm password"
            type="password"
            placeholder="Repeat password"
            value={confirm}
            onChange={setConfirm}
            required
            minLength={6}
            autoComplete="new-password"
            delay={0.22}
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
          <AuthSubmitButton loading={loading}>Update password</AuthSubmitButton>
        </form>
      )}
    </AuthShell>
  );
}
