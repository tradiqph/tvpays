"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthField } from "@/components/auth/AuthField";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fromUrl =
      searchParams.get("ref") ?? searchParams.get("referral") ?? "";
    const trimmed = fromUrl.trim();
    if (trimmed) {
      setReferralCode(trimmed.toUpperCase());
    }
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName.trim() || undefined,
          referral_code: referralCode.trim() || undefined,
        },
      },
    });
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
      title="Create account"
      subtitle="15-day free trial · projections are not guaranteed earnings"
      footer={
        <p className="text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-sky-300 underline-offset-2 hover:underline"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <AuthField
          id="displayName"
          label="Display name"
          placeholder="How we greet you"
          value={displayName}
          onChange={setDisplayName}
          autoComplete="name"
          delay={0.18}
        />
        <AuthField
          id="email"
          label="Email"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={setEmail}
          required
          autoComplete="email"
          delay={0.22}
        />
        <AuthField
          id="password"
          label="Password"
          type="password"
          placeholder="At least 6 characters"
          value={password}
          onChange={setPassword}
          required
          minLength={6}
          autoComplete="new-password"
          delay={0.26}
        />
        <AuthField
          id="referral"
          label="Referral code"
          placeholder="Optional"
          value={referralCode}
          onChange={setReferralCode}
          delay={0.3}
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
        <AuthSubmitButton loading={loading}>Sign up</AuthSubmitButton>
      </form>
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Create account" subtitle="Loading…">
          <p className="text-center text-sm text-slate-400">Loading…</p>
        </AuthShell>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
