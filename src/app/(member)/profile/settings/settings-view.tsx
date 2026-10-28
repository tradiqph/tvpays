"use client";

import { motion } from "framer-motion";
import { Info, PlayCircle, Sparkles, type LucideIcon } from "lucide-react";
import { SubPageHeader } from "@/components/member/SubPageHeader";
import { GlossIcon, GlossPanel, type Tone } from "@/components/member/ProfileGloss";
import { usePreferences, type Preferences } from "@/lib/preferences";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0";

const TOGGLES: {
  key: keyof Preferences;
  icon: LucideIcon;
  tone: Tone;
  title: string;
  sub: string;
}[] = [
  {
    key: "autoplayNext",
    icon: PlayCircle,
    tone: "blue",
    title: "Autoplay next episode",
    sub: "Continue to the next episode when one ends",
  },
  {
    key: "reduceMotion",
    icon: Sparkles,
    tone: "purple",
    title: "Reduce animations",
    sub: "Turn off floating and sliding effects",
  },
];

function Switch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className={`relative flex h-7 w-12 shrink-0 items-center rounded-full border px-0.5 transition-colors ${
        on
          ? "justify-end border-sky-200/70 bg-gradient-to-r from-sky-400 to-blue-600 shadow-[0_0_12px_rgba(56,160,255,0.55)]"
          : "justify-start border-white/15 bg-[#020b1f]"
      }`}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="h-6 w-6 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.4)]"
      />
    </button>
  );
}

export function SettingsView() {
  const [prefs, setPref] = usePreferences();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SubPageHeader title="Settings" />
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4">
        <p className="px-1 text-[11px] font-semibold uppercase tracking-widest text-sky-200/70">
          Playback & display
        </p>
        <GlossPanel className="divide-y divide-white/10">
          {TOGGLES.map((t) => (
            <div key={t.key} className="flex items-center gap-3 px-3 py-3">
              <GlossIcon icon={t.icon} tone={t.tone} size="h-9 w-9" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">{t.title}</p>
                <p className="text-xs text-sky-100/70">{t.sub}</p>
              </div>
              <Switch
                on={prefs[t.key]}
                label={t.title}
                onToggle={() => setPref(t.key, !prefs[t.key])}
              />
            </div>
          ))}
        </GlossPanel>
        <p className="px-1 text-[11px] text-slate-500">
          Settings are saved on this device.
        </p>

        <GlossPanel>
          <div className="flex items-center gap-3 px-3 py-3">
            <GlossIcon icon={Info} tone="slate" size="h-9 w-9" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">App version</p>
              <p className="text-xs text-sky-100/70">TvPays {APP_VERSION}</p>
            </div>
          </div>
        </GlossPanel>
      </div>
    </div>
  );
}
