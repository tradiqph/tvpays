"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Download, Mail, MessageCircleQuestion, Send, Smartphone } from "lucide-react";
import {
  ANDROID_APK_FILENAME,
  ANDROID_APK_HREF,
  ANDROID_APK_VERSION,
  ANDROID_DOWNLOAD_BUTTON_CLASS,
  ANDROID_DOWNLOAD_BUTTON_STYLE,
} from "@/lib/app-download";
import { SubPageHeader } from "@/components/member/SubPageHeader";
import { GlossIcon, GlossPanel } from "@/components/member/ProfileGloss";
import { TELEGRAM_OFFICIAL_GROUP_URL } from "@/lib/community";

// Edit these to match your policies.
const FAQS: { q: string; a: string }[] = [
  {
    q: "How do I earn from ads?",
    a: "Open Media, pick a trailer, wait 10 seconds (or tap Skip when ready), and your ad reward credits to your wallet. Each trailer counts once per day.",
  },
  {
    q: "How many ads can I watch per day?",
    a: "Your plan sets the daily ad cap (see Task or Subscriptions). Upgrade to a higher tier to unlock more ads per day.",
  },
  {
    q: "What are forfeited tasks?",
    a: "If you miss part or all of your daily ad cap (Manila time), the missed display income adds to your forfeited balance. After you finish today's regular ads, you can do up to 3 catch-up ads per day (fewer if less forfeited amount remains) to earn that back on Media.",
  },
  {
    q: "How do I top up my wallet?",
    a: "Go to Wallet, tap Top up, enter the amount and follow the payment steps. Your balance updates once the payment is confirmed.",
  },
  {
    q: "How long do withdrawals take?",
    a: "Withdrawal requests are reviewed by our team before they are sent to your bank or e-wallet. You can see the status in your wallet history.",
  },
  {
    q: "Why can't I withdraw?",
    a: "Withdrawals require an active paid subscription (not trial or expired). Subscribe on Subscriptions, then cash out from Wallet when your plan is active.",
  },
  {
    q: "How do referrals work?",
    a: "Every member gets a referral code on Profile. Share your link — when someone signs up with your code and buys a plan, you earn L1–L3 commissions on their upgrades.",
  },
  {
    q: "I forgot my password.",
    a: "On the sign-in screen tap \"Forgot password?\" and we'll email you a reset link. If you're signed in, you can change it under Profile → Security.",
  },
  {
    q: "How do I change my display name?",
    a: "Go to Profile → Account Information, edit your display name and tap Save.",
  },
  {
    q: "How do I join the official group?",
    a: "Tap Join official Telegram group below or Profile → Official Group. You'll open our community chat on Telegram for updates and support from the team.",
  },
  {
    q: "How do I install the Android app?",
    a: "Tap Download Android app below (or Profile → Settings). Open the APK when it finishes, allow installs from your browser if prompted, then sign in with the same account.",
  },
];

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

export function HelpView() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SubPageHeader title="Help & Support" />
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4">
        <div className="flex items-center gap-3 px-1">
          <GlossIcon icon={MessageCircleQuestion} tone="slate" size="h-9 w-9" />
          <p className="text-sm font-bold text-white">Frequently asked questions</p>
        </div>

        <ul className="space-y-2">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <motion.li
                key={f.q}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <GlossPanel border={isOpen ? "border-sky-300/70" : "border-sky-400/30"}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center gap-3 px-3 py-3 text-left"
                  >
                    <span className="flex-1 text-sm font-semibold text-white">{f.q}</span>
                    <motion.span animate={{ rotate: isOpen ? 180 : 0 }}>
                      <ChevronDown className="h-4 w-4 text-sky-200" />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <p className="px-3 pb-3 text-[13px] leading-relaxed text-sky-100/80">
                          {f.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </GlossPanel>
              </motion.li>
            );
          })}
        </ul>

        <GlossPanel className="p-4 text-center">
          <div className="flex justify-center">
            <GlossIcon icon={Smartphone} tone="green" size="h-9 w-9" />
          </div>
          <p className="mt-2 text-sm font-bold text-white">Download Android app</p>
          <p className="mt-0.5 text-xs text-sky-100/70">
            Install TvPays v{ANDROID_APK_VERSION} on your phone.
          </p>
          <a
            href={ANDROID_APK_HREF}
            download={ANDROID_APK_FILENAME}
            className={`mt-3 ${ANDROID_DOWNLOAD_BUTTON_CLASS}`}
            style={ANDROID_DOWNLOAD_BUTTON_STYLE}
          >
            <Download className="h-4 w-4" />
            Download Android app
          </a>
        </GlossPanel>

        <GlossPanel className="p-4 text-center">
          <p className="text-sm font-bold text-white">Official Telegram group</p>
          <p className="mt-0.5 text-xs text-sky-100/70">
            News, guides, and community support from TvPays.
          </p>
          <a
            href={TELEGRAM_OFFICIAL_GROUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-sky-200/60 bg-gradient-to-b from-[#4fb4ff] to-[#1560e8] px-5 py-2.5 text-sm font-bold text-white"
            style={{
              boxShadow:
                "0 0 14px rgba(56,160,255,0.5), inset 0 1px 0 rgba(255,255,255,0.5)",
            }}
          >
            <Send className="h-4 w-4" />
            Join official Telegram group
          </a>
        </GlossPanel>

        {SUPPORT_EMAIL && (
          <GlossPanel className="mt-3 p-4 text-center">
            <p className="text-sm font-bold text-white">Still need help?</p>
            <p className="mt-0.5 text-xs text-sky-100/70">
              Email us and include your Member ID.
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("TvPays support")}`}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-sky-200/60 bg-gradient-to-b from-[#4fb4ff] to-[#1560e8] px-5 py-2.5 text-sm font-bold text-white"
              style={{
                boxShadow:
                  "0 0 14px rgba(56,160,255,0.5), inset 0 1px 0 rgba(255,255,255,0.5)",
              }}
            >
              <Mail className="h-4 w-4" />
              Contact support
            </a>
          </GlossPanel>
        )}
      </div>
    </div>
  );
}
