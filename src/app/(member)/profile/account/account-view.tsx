"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  Check,
  Copy,
  Crown,
  Hash,
  Loader2,
  Mail,
  User,
  type LucideIcon,
} from "lucide-react";
import { SubPageHeader } from "@/components/member/SubPageHeader";
import { AvatarPicker } from "@/components/member/AvatarPicker";
import { GlossIcon, GlossPanel, type Tone } from "@/components/member/ProfileGloss";
import { createClient } from "@/lib/supabase/client";
import { planBySlug } from "@/lib/plans";
import { formatDateManila } from "@/lib/format";

type Account = {
  email: string;
  memberCode: string;
  displayName: string;
  avatarUrl: string | null;
  planSlug: string;
  createdAt: string;
};

const MAX_NAME = 40;

function InfoRow({
  icon,
  tone,
  label,
  value,
  action,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <GlossIcon icon={icon} tone={tone} size="h-9 w-9" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider text-sky-200/70">{label}</p>
        <p className="truncate text-sm font-semibold text-white">{value}</p>
      </div>
      {action}
    </div>
  );
}

export function AccountView() {
  const [account, setAccount] = useState<Account | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("member_code, display_name, avatar_url, plan_slug, created_at")
        .eq("id", user.id)
        .single();
      if (!data) return;
      setAccount({
        email: user.email ?? "—",
        memberCode: data.member_code,
        displayName: data.display_name ?? "",
        avatarUrl: data.avatar_url,
        planSlug: data.plan_slug,
        createdAt: data.created_at,
      });
      setName(data.display_name ?? "");
    });
  }, []);

  const trimmed = name.trim();
  const dirty = account !== null && trimmed !== account.displayName;
  const valid = trimmed.length >= 2 && trimmed.length <= MAX_NAME;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty || !valid) return;
    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = user
      ? await supabase.from("profiles").update({ display_name: trimmed }).eq("id", user.id)
      : { error: new Error("Not signed in") };
    setSaving(false);
    if (error) {
      setMessage({ ok: false, text: "Couldn't save your name. Please try again." });
      return;
    }
    setAccount((a) => (a ? { ...a, displayName: trimmed } : a));
    setName(trimmed);
    setMessage({ ok: true, text: "Display name updated." });
  }

  async function copyId() {
    if (!account) return;
    await navigator.clipboard.writeText(`TVP${account.memberCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SubPageHeader title="Account Information" />
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4">
        <motion.div
          className="flex flex-col items-center gap-2 py-2"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <AvatarPicker
            size={104}
            avatarUrl={account?.avatarUrl ?? null}
            onChange={(url) => setAccount((a) => (a ? { ...a, avatarUrl: url } : a))}
          />
          <p className="text-xs text-sky-200/70">Tap to change your profile photo</p>
        </motion.div>

        <motion.form
          onSubmit={save}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <GlossPanel className="p-3">
            <label htmlFor="display-name" className="text-[11px] uppercase tracking-wider text-sky-200/70">
              Display name
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                id="display-name"
                value={name}
                maxLength={MAX_NAME}
                onChange={(e) => {
                  setName(e.target.value);
                  setMessage(null);
                }}
                placeholder="Your name"
                disabled={!account}
                className="min-w-0 flex-1 rounded-xl border border-sky-400/35 bg-[#020b1f]/80 px-3 py-2.5 text-white outline-none placeholder:text-slate-500 focus:border-sky-300/70 focus:shadow-[0_0_16px_rgba(56,160,255,0.25)]"
              />
              <motion.button
                type="submit"
                disabled={!dirty || !valid || saving}
                whileTap={{ scale: 0.96 }}
                className="flex w-20 items-center justify-center rounded-xl border border-sky-200/60 bg-gradient-to-b from-[#4fb4ff] to-[#1560e8] text-sm font-bold text-white disabled:opacity-40"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </motion.button>
            </div>
            <div className="mt-1.5 flex justify-between text-[11px]">
              <AnimatePresence mode="wait">
                {message ? (
                  <motion.span
                    key={message.text}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={message.ok ? "text-emerald-300" : "text-rose-300"}
                  >
                    {message.text}
                  </motion.span>
                ) : (
                  <span className="text-slate-500">
                    {trimmed.length > 0 && trimmed.length < 2 ? "At least 2 characters" : ""}
                  </span>
                )}
              </AnimatePresence>
              <span className="text-slate-500">
                {name.length}/{MAX_NAME}
              </span>
            </div>
          </GlossPanel>
        </motion.form>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
        >
          <GlossPanel className="divide-y divide-white/10">
            <InfoRow icon={Mail} tone="blue" label="Email" value={account?.email ?? "…"} />
            <InfoRow
              icon={Hash}
              tone="purple"
              label="Member ID"
              value={account ? `TVP${account.memberCode}` : "…"}
              action={
                <button
                  type="button"
                  onClick={copyId}
                  aria-label="Copy member ID"
                  className="rounded-full bg-white/10 p-2 text-sky-100 hover:bg-white/20"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                </button>
              }
            />
            <InfoRow
              icon={Crown}
              tone="gold"
              label="Current plan"
              value={account ? (planBySlug(account.planSlug)?.name ?? account.planSlug) : "…"}
            />
            <InfoRow
              icon={CalendarDays}
              tone="green"
              label="Member since"
              value={account ? formatDateManila(account.createdAt) : "…"}
            />
          </GlossPanel>
        </motion.div>

        <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-500">
          <User className="h-3 w-3" />
          To change your email, contact support.
        </p>
      </div>
    </div>
  );
}
