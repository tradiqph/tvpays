"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Clock, KeyRound, Lock, LogOut } from "lucide-react";
import { SubPageHeader } from "@/components/member/SubPageHeader";
import { GlossIcon, GlossPanel } from "@/components/member/ProfileGloss";
import { AuthField } from "@/components/auth/AuthField";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";
import { AlertDialog } from "@/components/member/AlertDialog";
import { createClient } from "@/lib/supabase/client";
import { formatDateManila } from "@/lib/format";

const MIN_PASSWORD = 8;

export function SecurityView() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [lastSignIn, setLastSignIn] = useState<string | null>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        setEmail(user?.email ?? null);
        setLastSignIn(user?.last_sign_in_at ?? null);
      });
  }, []);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next.length < MIN_PASSWORD) {
      setError(`New password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (next !== confirm) {
      setError("New passwords don't match.");
      return;
    }
    if (next === current) {
      setError("Choose a password different from your current one.");
      return;
    }
    if (!email) return;

    setLoading(true);
    const supabase = createClient();
    // Re-check the current password so a borrowed unlocked phone can't change it.
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email,
      password: current,
    });
    if (authErr) {
      setLoading(false);
      setError("Current password is incorrect.");
      return;
    }
    const { error: updErr } = await supabase.auth.updateUser({ password: next });
    setLoading(false);
    if (updErr) {
      setError(updErr.message);
      return;
    }
    setCurrent("");
    setNext("");
    setConfirm("");
    setDone(true);
  }

  async function signOutEverywhere() {
    await createClient().auth.signOut({ scope: "global" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <SubPageHeader title="Security" />
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <GlossPanel className="p-4">
            <div className="mb-3 flex items-center gap-3">
              <GlossIcon icon={KeyRound} tone="blue" size="h-9 w-9" />
              <div>
                <p className="font-bold text-white">Change password</p>
                <p className="text-xs text-sky-100/70">At least {MIN_PASSWORD} characters</p>
              </div>
            </div>
            <form onSubmit={changePassword} className="flex flex-col gap-3">
              <AuthField
                id="current-password"
                label="Current password"
                type="password"
                value={current}
                onChange={setCurrent}
                required
                autoComplete="current-password"
                icon={Lock}
              />
              <AuthField
                id="new-password"
                label="New password"
                type="password"
                value={next}
                onChange={setNext}
                required
                minLength={MIN_PASSWORD}
                autoComplete="new-password"
                icon={KeyRound}
                delay={0.04}
              />
              <AuthField
                id="confirm-password"
                label="Confirm new password"
                type="password"
                value={confirm}
                onChange={setConfirm}
                required
                minLength={MIN_PASSWORD}
                autoComplete="new-password"
                icon={KeyRound}
                delay={0.08}
              />
              {error && (
                <motion.p
                  key={error}
                  role="alert"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
                  className="rounded-xl border border-rose-400/30 bg-rose-500/15 px-3 py-2 text-sm text-rose-200"
                >
                  {error}
                </motion.p>
              )}
              <AuthSubmitButton loading={loading}>Update password</AuthSubmitButton>
            </form>
          </GlossPanel>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
        >
          <GlossPanel className="divide-y divide-white/10">
            <div className="flex items-center gap-3 px-3 py-2.5">
              <GlossIcon icon={Clock} tone="green" size="h-9 w-9" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-wider text-sky-200/70">Last sign-in</p>
                <p className="text-sm font-semibold text-white">
                  {lastSignIn ? formatDateManila(lastSignIn) : "…"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setConfirmSignOut(true)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
            >
              <GlossIcon icon={LogOut} tone="red" size="h-9 w-9" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">Sign out of all devices</p>
                <p className="text-xs text-sky-100/70">Use this if you lost a phone or shared your login</p>
              </div>
            </button>
          </GlossPanel>
        </motion.div>
      </div>

      <AlertDialog
        open={done}
        onClose={() => setDone(false)}
        tone="success"
        title="Password updated"
        message="Use your new password next time you sign in."
      />
      <AlertDialog
        open={confirmSignOut}
        onClose={() => setConfirmSignOut(false)}
        tone="warning"
        title="Sign out everywhere?"
        message="You'll be signed out on this and every other device."
        action={{ label: "Sign out all", onClick: signOutEverywhere }}
        secondary={{ label: "Cancel", onClick: () => setConfirmSignOut(false) }}
      />
    </div>
  );
}
