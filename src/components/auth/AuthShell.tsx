"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { TvPaysLogo } from "@/components/member/TvPaysLogo";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Show the floating 3D TV hero above the title. */
  hero?: boolean;
};

// Fixed values so the sky looks the same on every render.
const STARS = Array.from({ length: 28 }, (_, i) => ({
  left: (i * 37) % 100,
  top: (i * 53) % 100,
  size: i % 5 === 0 ? 2.5 : 1.5,
  delay: (i % 7) * 0.6,
}));

const METEORS = [
  { left: "15%", delay: 0 },
  { left: "55%", delay: 2.4 },
  { left: "85%", delay: 4.8 },
  { left: "35%", delay: 6.6 },
];

function Sky({ still }: { still: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <motion.div
        className="absolute -left-1/4 -top-10 h-72 w-[150%] rounded-[50%] bg-gradient-to-r from-sky-500/0 via-sky-400/25 to-indigo-500/0 blur-3xl"
        animate={still ? undefined : { x: ["-8%", "8%", "-8%"], rotate: [-6, 4, -6] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl"
        animate={still ? undefined : { scale: [1, 1.15, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      {STARS.map((s, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-white"
          style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size }}
          animate={still ? { opacity: 0.4 } : { opacity: [0.15, 0.9, 0.15] }}
          transition={{ duration: 3, delay: s.delay, repeat: Infinity }}
        />
      ))}
      {!still &&
        METEORS.map((m, i) => (
          <motion.span
            key={i}
            className="absolute top-0 h-px w-24 rotate-[215deg] bg-gradient-to-r from-sky-200 to-transparent"
            style={{ left: m.left, boxShadow: "0 0 6px rgba(186,230,253,0.8)" }}
            initial={{ x: 0, y: -20, opacity: 0 }}
            animate={{ x: [0, -260], y: [-20, 340], opacity: [0, 1, 0] }}
            transition={{ duration: 1.6, delay: m.delay, repeat: Infinity, repeatDelay: 6 }}
          />
        ))}
    </div>
  );
}

/** Floating TV that tilts toward the pointer. */
function Hero({ still }: { still: boolean }) {
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-16, 16]), { stiffness: 150, damping: 15 });
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [12, -12]), { stiffness: 150, damping: 15 });

  return (
    <motion.div
      className="relative mx-auto mt-4 h-40 w-56 [perspective:800px]"
      initial={{ opacity: 0, scale: 0.6, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", damping: 14, stiffness: 140, delay: 0.1 }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width - 0.5);
        py.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => {
        px.set(0);
        py.set(0);
      }}
    >
      <div className="absolute inset-x-8 bottom-0 h-6 rounded-[50%] bg-sky-500/40 blur-xl" />
      <motion.img
        src="/assets/branding/login-hero.png"
        alt=""
        draggable={false}
        className="relative h-full w-full select-none object-contain drop-shadow-[0_12px_24px_rgba(0,90,255,0.45)]"
        style={{ rotateX, rotateY }}
        animate={still ? undefined : { y: [0, -8, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
}

function RevealTitle({ text }: { text: string }) {
  return (
    <h1 className="text-[28px] font-extrabold tracking-tight text-white">
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

      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative flex justify-center"
      >
        <TvPaysLogo />
      </motion.div>

      {hero && <Hero still={still} />}

      <div className={`relative text-center ${hero ? "mt-3" : "mt-8"}`}>
        <RevealTitle text={title} />
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
        className="relative mt-5 overflow-hidden rounded-3xl p-[1.5px]"
      >
        <motion.div
          className="absolute left-1/2 top-1/2 aspect-square w-[200%] -translate-x-1/2 -translate-y-1/2"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, #38bdf8 40deg, #fbbf24 80deg, transparent 120deg, transparent 360deg)",
          }}
          animate={still ? undefined : { rotate: 360 }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          aria-hidden
        />
        <div className="absolute inset-0 rounded-3xl border border-sky-300/20" aria-hidden />
        <div className="relative rounded-[22px] bg-gradient-to-b from-[#0d2a6b]/95 via-[#071a45]/95 to-[#040e2a]/95 p-5 backdrop-blur-xl">
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
