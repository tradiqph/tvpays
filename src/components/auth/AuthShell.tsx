"use client";

/* eslint-disable @next/next/no-img-element */
import { motion, useReducedMotion } from "framer-motion";
import { TvPaysLogo } from "@/components/member/TvPaysLogo";
import { BRAND } from "@/lib/branding";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Brand lockup instead of the small wordmark. */
  hero?: boolean;
};

// Fixed values so the sky looks the same on every render.
const STARS = Array.from({ length: 28 }, (_, i) => ({
  left: (i * 37) % 100,
  top: (i * 53) % 100,
  size: i % 5 === 0 ? 2.5 : 1.5,
  delay: (i % 7) * 0.6,
}));

function Sky({ still }: { still: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <motion.div
        className="absolute -left-1/4 top-0 h-48 w-[130%] rounded-[50%] bg-gradient-to-r from-cyan-400/0 via-cyan-400/20 to-violet-500/0 blur-3xl"
        animate={still ? undefined : { x: ["-6%", "6%", "-6%"] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      {STARS.map((s, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-cyan-100/90"
          style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size }}
          animate={still ? { opacity: 0.35 } : { opacity: [0.1, 0.75, 0.1] }}
          transition={{ duration: 3, delay: s.delay, repeat: Infinity }}
        />
      ))}
    </div>
  );
}

function RevealTitle({ text, hero = false }: { text: string; hero?: boolean }) {
  return (
    <h1
      className={
        hero
          ? "text-[22px] font-bold tracking-tight text-white/95"
          : "text-[28px] font-extrabold tracking-tight text-white"
      }
    >
      {text.split(" ").map((word, i) => (
        <motion.span
          key={i}
          className="mr-[0.25em] inline-block"
          initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.5, delay: 0.2 + i * 0.08 }}
        >
          {word}
        </motion.span>
      ))}
    </h1>
  );
}

export function AuthShell({ title, subtitle, children, footer, hero = false }: Props) {
  const still = useReducedMotion() ?? false;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-6">
      <Sky still={still} />

      {hero ? (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", damping: 18, stiffness: 140, delay: 0.05 }}
          className="relative mx-auto mt-1 w-full max-w-[340px]"
        >
          <div className="pointer-events-none absolute left-1/2 top-[42%] h-24 w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400/30 blur-3xl" />
          <div className="pointer-events-none absolute bottom-1 left-1/2 h-8 w-2/3 -translate-x-1/2 rounded-full bg-amber-300/30 blur-2xl" />
          <img
            src={BRAND.logo}
            alt={BRAND.alt}
            draggable={false}
            className="relative w-full select-none drop-shadow-[0_18px_28px_rgba(0,40,120,0.55)]"
          />
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative flex justify-center"
        >
          <TvPaysLogo />
        </motion.div>
      )}

      <div className={`relative text-center ${hero ? "mt-1" : "mt-8"}`}>
        <RevealTitle text={title} hero={hero} />
        {subtitle && (
          <motion.p
            initial={{ opacity: 0, letterSpacing: "0.6em" }}
            animate={{ opacity: 1, letterSpacing: "0.25em" }}
            transition={{ duration: 0.8, delay: 0.35 }}
            className="mt-1 text-[11px] font-semibold uppercase text-sky-300/80"
          >
            {subtitle}
          </motion.p>
        )}
      </div>

      {/* Glass card with a travelling border beam */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", damping: 20, stiffness: 160, delay: 0.25 }}
        className="relative mt-4 overflow-hidden rounded-[28px] p-px shadow-[0_24px_50px_rgba(0,8,30,0.45)]"
      >
        <motion.div
          className="absolute left-1/2 top-1/2 aspect-square w-[180%] -translate-x-1/2 -translate-y-1/2 opacity-80"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, rgba(56,189,248,0.9) 28deg, rgba(251,191,36,0.85) 56deg, transparent 90deg, transparent 360deg)",
          }}
          animate={still ? undefined : { rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          aria-hidden
        />
        <div className="relative rounded-[27px] border border-white/10 bg-[#071433]/75 p-5 backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1/3 rounded-t-[22px] bg-gradient-to-b from-white/10 to-transparent" />
          <div className="relative">{children}</div>
        </div>
      </motion.div>

      {footer && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="relative mt-5 pb-2"
        >
          {footer}
        </motion.div>
      )}
    </div>
  );
}
