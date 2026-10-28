"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";

type Props = {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  delay?: number;
  icon?: LucideIcon;
};

export function AuthField({
  id,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  required,
  minLength,
  autoComplete,
  delay = 0,
  icon: Icon,
}: Props) {
  const [focused, setFocused] = useState(false);
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";

  return (
    <motion.label
      htmlFor={id}
      className="block"
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", damping: 20, stiffness: 200, delay }}
    >
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-sky-200/80">
        {label}
      </span>
      <motion.div
        className="relative flex items-center rounded-2xl border bg-[#020b1f]/80 transition-colors"
        animate={{
          borderColor: focused ? "rgba(125,211,252,0.8)" : "rgba(56,189,248,0.25)",
          boxShadow: focused
            ? "0 0 0 3px rgba(56,189,248,0.15), 0 0 22px rgba(56,160,255,0.3)"
            : "0 0 0 0 rgba(56,189,248,0), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
        transition={{ duration: 0.2 }}
      >
        {Icon && (
          <motion.span
            className="pl-3.5"
            animate={{ color: focused ? "#7dd3fc" : "#64748b", scale: focused ? 1.1 : 1 }}
          >
            <Icon className="h-[18px] w-[18px]" />
          </motion.span>
        )}
        <input
          id={id}
          type={isPassword && reveal ? "text" : type}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full bg-transparent px-3.5 py-3 text-white outline-none placeholder:text-slate-500"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? "Hide password" : "Show password"}
            className="pr-3.5 text-slate-400 hover:text-sky-200"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={reveal ? "hide" : "show"}
                className="block"
                initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
                transition={{ duration: 0.15 }}
              >
                {reveal ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
              </motion.span>
            </AnimatePresence>
          </button>
        )}
      </motion.div>
    </motion.label>
  );
}
