"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Mail, MessageCircleQuestion } from "lucide-react";
import { SubPageHeader } from "@/components/member/SubPageHeader";
import { GlossIcon, GlossPanel } from "@/components/member/ProfileGloss";

// Edit these to match your policies.
const FAQS: { q: string; a: string }[] = [
  {
    q: "How do I watch dramas?",
    a: "Open the Media tab, pick a source from the dropdown, then tap any drama. Swipe up in the player to go to the next episode.",
  },
  {
    q: "Why is an episode locked?",
    a: "Some episodes need active video access. Check your remaining days on the Profile page and renew or upgrade a plan to add more.",
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
    q: "I forgot my password.",
    a: "On the sign-in screen tap \"Forgot password?\" and we'll email you a reset link. If you're signed in, you can change it under Profile → Security.",
  },
  {
    q: "How do I change my display name?",
    a: "Go to Profile → Account Information, edit your display name and tap Save.",
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

        {SUPPORT_EMAIL && (
          <GlossPanel className="p-4 text-center">
            <p className="text-sm font-bold text-white">Still need help?</p>
            <p className="mt-0.5 text-xs text-sky-100/70">
              Email us and include your Member ID.
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("TvPays support")}`}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-sky-200/60 bg-gradient-to-b from-[#4fb4ff] to-[#1560e8] px-5 py-2.5 text-sm font-bold text-white"
              style={{ boxShadow: "0 0 14px rgba(56,160,255,0.5), inset 0 1px 0 rgba(255,255,255,0.5)" }}
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
