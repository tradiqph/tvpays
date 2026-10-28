"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  Clapperboard,
  Coins,
  Gauge,
  Headphones,
  Info,
  PlayCircle,
  RotateCcw,
  Sparkles,
  Timer,
  VolumeX,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { SubPageHeader } from "@/components/member/SubPageHeader";
import { AlertDialog } from "@/components/member/AlertDialog";
import { GlossIcon, GlossPanel, type Tone } from "@/components/member/ProfileGloss";
import { usePreferences, type Preferences } from "@/lib/preferences";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0";

type BoolKey = { [K in keyof Preferences]: Preferences[K] extends boolean ? K : never }[keyof Preferences];

type Toggle = {
  key: BoolKey;
  icon: LucideIcon;
  tone: Tone;
  title: string;
  sub: string;
};

const NOTIFICATIONS: Toggle[] = [
  { key: "notifyReminders", icon: Timer, tone: "gold", title: "Daily reminders", sub: "Check-in and episodes left today" },
  { key: "notifyAccess", icon: Bell, tone: "purple", title: "Plan & access alerts", sub: "When your plan, trial or video access is ending" },
  { key: "notifyWallet", icon: Wallet, tone: "green", title: "Wallet updates", sub: "Withdrawal status and refunds" },
];

const PLAYBACK: Toggle[] = [
  { key: "autoplayNext", icon: PlayCircle, tone: "blue", title: "Autoplay next episode", sub: "Continue when an episode ends" },
  { key: "startMuted", icon: VolumeX, tone: "slate", title: "Start muted", sub: "Episodes begin with sound off" },
  { key: "dataSaver", icon: Gauge, tone: "green", title: "Data saver", sub: "Stream at up to 480p on mobile data" },
  { key: "soundEffects", icon: Coins, tone: "gold", title: "Reward sound", sub: "Play a coin sound when an episode earns" },
];

const DISPLAY: Toggle[] = [
  { key: "reduceMotion", icon: Sparkles, tone: "purple", title: "Reduce animations", sub: "Turn off floating and sliding effects" },
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

function Section({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="space-y-2"
    >
      <h2 className="px-1 text-[11px] font-semibold uppercase tracking-widest text-sky-200/70">{title}</h2>
      <GlossPanel className="divide-y divide-white/10">{children}</GlossPanel>
    </motion.section>
  );
}

function ToggleRow({
  t,
  prefs,
  setPref,
}: {
  t: Toggle;
  prefs: Preferences;
  setPref: <K extends keyof Preferences>(k: K, v: Preferences[K]) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <GlossIcon icon={t.icon} tone={t.tone} size="h-9 w-9" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">{t.title}</p>
        <p className="text-xs text-sky-100/70">{t.sub}</p>
      </div>
      <Switch on={prefs[t.key]} label={t.title} onToggle={() => setPref(t.key, !prefs[t.key])} />
    </div>
  );
}

function SourcePicker({
  sources,
  value,
  onChange,
}: {
  sources: { key: string; label: string }[];
  value: string | null;
  onChange: (key: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const options = [{ key: null as string | null, label: "Automatic" }, ...sources];
  const current = options.find((o) => o.key === value) ?? options[0];

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-3 text-left"
      >
        <GlossIcon icon={Clapperboard} tone="gold" size="h-9 w-9" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Default drama source</p>
          <p className="text-xs text-sky-100/70">Opens first on Media</p>
        </div>
        <span className="text-sm font-semibold text-sky-200">{current.label}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }}>
          <ChevronDown className="h-4 w-4 text-sky-200" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-3"
          >
            {options.map((o) => {
              const active = o.key === current.key;
              return (
                <li key={o.key ?? "auto"} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(o.key);
                      setOpen(false);
                    }}
                    className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm ${
                      active ? "bg-gradient-to-r from-[#2a6bff]/60 to-transparent font-bold text-white" : "text-sky-100/85 hover:bg-white/10"
                    }`}
                  >
                    {o.label}
                    {active && <Check className="h-4 w-4 text-cyan-300" strokeWidth={3} />}
                  </button>
                </li>
              );
            })}
            <li className="pb-2 pt-1 text-[11px] text-sky-100/50">
              Free trial members always start on their trial source.
            </li>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SettingsView({ sources }: { sources: { key: string; label: string }[] }) {
  const [prefs, setPref, reset] = usePreferences();
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <SubPageHeader title="Settings" />
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-6">
        <Section title="Notifications">
          {NOTIFICATIONS.map((t) => (
            <ToggleRow key={t.key} t={t} prefs={prefs} setPref={setPref} />
          ))}
        </Section>

        <Section title="Playback" delay={0.05}>
          {PLAYBACK.map((t) => (
            <ToggleRow key={t.key} t={t} prefs={prefs} setPref={setPref} />
          ))}
          {sources.length > 1 && (
            <SourcePicker
              sources={sources}
              value={prefs.defaultSource}
              onChange={(k) => setPref("defaultSource", k)}
            />
          )}
        </Section>

        <Section title="Display" delay={0.1}>
          {DISPLAY.map((t) => (
            <ToggleRow key={t.key} t={t} prefs={prefs} setPref={setPref} />
          ))}
        </Section>

        <Section title="More" delay={0.15}>
          <Link href="/profile/help" className="flex items-center gap-3 px-3 py-3">
            <GlossIcon icon={Headphones} tone="slate" size="h-9 w-9" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">Help & Support</p>
              <p className="text-xs text-sky-100/70">FAQs and contact</p>
            </div>
            <ChevronRight className="h-4 w-4 text-white/70" />
          </Link>
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="flex w-full items-center gap-3 px-3 py-3 text-left"
          >
            <GlossIcon icon={RotateCcw} tone="red" size="h-9 w-9" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">Reset settings</p>
              <p className="text-xs text-sky-100/70">Restore all options to default</p>
            </div>
          </button>
          <div className="flex items-center gap-3 px-3 py-3">
            <GlossIcon icon={Info} tone="blue" size="h-9 w-9" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">App version</p>
              <p className="text-xs text-sky-100/70">TvPays {APP_VERSION}</p>
            </div>
          </div>
        </Section>

        <p className="px-1 text-center text-[11px] text-slate-500">
          Settings are saved on this device and apply instantly.
        </p>
      </div>

      <AlertDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        tone="warning"
        title="Reset all settings?"
        message="Notifications, playback and display options go back to their defaults on this device."
        action={{
          label: "Reset",
          onClick: () => {
            reset();
            setConfirmReset(false);
            setResetDone(true);
          },
        }}
        secondary={{ label: "Cancel", onClick: () => setConfirmReset(false) }}
      />
      <AlertDialog
        open={resetDone}
        onClose={() => setResetDone(false)}
        tone="success"
        title="Settings reset"
        message="Everything is back to default."
      />
    </div>
  );
}
