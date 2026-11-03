"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, Lock, UserPlus, X } from "lucide-react";
import { GlossIcon } from "@/components/member/ProfileGloss";

type AgentReferralGateModalProps = {
  open: boolean;
  onClose: () => void;
  agentStatus: string;
  canApply: boolean;
  onApplied?: (status: string) => void;
};

export function AgentReferralGateModal({
  open,
  onClose,
  agentStatus,
  canApply,
  onApplied,
}: AgentReferralGateModalProps) {
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  async function confirmApply() {
    setApplying(true);
    setApplyError(null);
    try {
      const res = await fetch("/api/agent/apply", { method: "POST" });
      const body = (await res.json()) as { status?: string; error?: string };
      if (!res.ok) {
        setApplyError(body.error ?? "Could not submit application.");
        return;
      }
      const next = body.status ?? "pending";
      onApplied?.(next);
    } catch {
      setApplyError("Could not submit application. Try again.");
    } finally {
      setApplying(false);
    }
  }

  const pending = agentStatus === "pending";
  const rejected = agentStatus === "rejected";
  const showApply =
    canApply && !pending && (agentStatus === "none" || rejected);

  let title = "Referrals locked";
  let body = "Apply and get approved as an Agent to unlock your referral link and team tools.";
  let icon = Lock;

  if (pending) {
    title = "Application under review";
    body =
      "Your Agent application is waiting for HQ approval. You will get your referral link once approved.";
    icon = Clock;
  } else if (rejected) {
    title = "Application not approved";
    body =
      "Your previous Agent application was not approved. You can submit a new application if you are eligible.";
    icon = UserPlus;
  } else if (!canApply) {
    title = "Upgrade to apply";
    body =
      "Elite Pro or a higher plan is required before you can apply for the Agent program and unlock referrals.";
    icon = Lock;
  } else {
    title = "Apply for Agent?";
    body =
      "Approved Agents receive an active referral link and can earn L1–L3 commissions when their team upgrades.";
    icon = UserPlus;
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="agent-gate-title"
            className="relative w-full max-w-xs rounded-2xl border border-sky-400/40 bg-gradient-to-b from-slate-900 to-[#020b1f] p-5 text-center shadow-[0_0_40px_rgba(56,189,248,0.2)]"
            initial={{ scale: 0.9, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 12 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="absolute right-3 top-3 rounded-full p-1 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mx-auto mb-3 flex justify-center">
              <GlossIcon icon={icon} tone="magenta" />
            </div>
            <h2 id="agent-gate-title" className="text-lg font-bold text-white">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-sky-100/75">
              {body}
            </p>
            {applyError ? (
              <p className="mt-2 text-xs text-red-300">{applyError}</p>
            ) : null}
            <div className="mt-4 flex flex-col gap-2">
              {showApply ? (
                <button
                  type="button"
                  disabled={applying}
                  onClick={confirmApply}
                  className="w-full rounded-xl bg-gradient-to-b from-fuchsia-500 to-violet-700 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                >
                  {applying
                    ? "Submitting…"
                    : rejected
                      ? "Apply again"
                      : "Apply for Agent"}
                </button>
              ) : null}
              {!canApply && !pending ? (
                <Link
                  href="/packages"
                  onClick={onClose}
                  className="w-full rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 py-2.5 text-sm font-bold text-white"
                >
                  View packages
                </Link>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl border border-sky-500/40 py-2.5 text-sm font-semibold text-sky-100"
              >
                {pending ? "OK" : "Not now"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
