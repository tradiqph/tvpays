"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthField } from "@/components/auth/AuthField";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/wallet";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
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
        icon={Mail}
        delay={0.35}
      />
      <div>
        <AuthField
          id="password"
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={setPassword}
          required
          autoComplete="current-password"
          icon={Lock}
          delay={0.42}
        />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-2 text-right"
        >
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-sky-300/90 underline-offset-2 transition hover:text-sky-200 hover:underline"
          >
            Forgot password?
          </Link>
        </motion.p>
      </div>
      {error && (
        <motion.p
          key={error}
          role="alert"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, x: [0, -8, 8, -5, 5, 0] }}
          transition={{ duration: 0.4 }}
          className="rounded-xl border border-rose-400/30 bg-rose-500/15 px-3 py-2 text-sm text-rose-200"
        >
          {error}
        </motion.p>
      )}
      <AuthSubmitButton loading={loading}>Sign in</AuthSubmitButton>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Watch • Click • Earn"
      hero
      footer={
        <p className="text-center text-sm text-slate-400">
          No account?{" "}
          <Link
            href="/signup"
            className="font-medium text-sky-300 underline-offset-2 hover:underline"
          >
            Sign up
          </Link>
        </p>
      }
    >
      <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
