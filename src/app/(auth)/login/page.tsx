"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Lock, Mail } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthField } from "@/components/auth/AuthField";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";

const turnstileSiteKey =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || "";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/wallet";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const resetTurnstileRef = useRef<(() => void) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const turnstileRequired = Boolean(turnstileSiteKey);

  const onTurnstileToken = useCallback((token: string | null) => {
    setTurnstileToken(token);
  }, []);

  const onTurnstileReady = useCallback((reset: () => void) => {
    resetTurnstileRef.current = reset;
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (turnstileRequired && !turnstileToken) {
      setError("Complete the security check before signing in.");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        turnstileToken: turnstileToken ?? undefined,
      }),
    });
    const json = (await res.json()) as { error?: string };
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? "Could not sign in");
      resetTurnstileRef.current?.();
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
      {turnstileRequired && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.48 }}
          className="flex justify-center"
        >
          <TurnstileWidget
            siteKey={turnstileSiteKey}
            onToken={onTurnstileToken}
            onReady={onTurnstileReady}
          />
        </motion.div>
      )}
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
      <AuthSubmitButton
        loading={loading}
        disabled={turnstileRequired && !turnstileToken}
      >
        Sign in
      </AuthSubmitButton>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      hero
      footer={
        <p className="text-center text-sm text-slate-300/80">
          No account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-amber-200 underline-offset-4 transition hover:text-amber-100 hover:underline"
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
