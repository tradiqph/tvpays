"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Search, X } from "lucide-react";

/** Pushes a new value for one query param, resetting pagination. */
function useParamSetter() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    const qs = next.toString();
    start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };
  return { set, pending, params };
}

export function SearchBox({ placeholder = "Search…" }: { placeholder?: string }) {
  const { set, pending, params } = useParamSetter();
  const [value, setValue] = useState(params.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function onChange(v: string) {
    setValue(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => set("q", v.trim() || null), 350);
  }

  return (
    <label className="relative flex h-10 min-w-0 flex-1 items-center rounded-xl border border-white/10 bg-white/[0.03] focus-within:border-sky-400/50 focus-within:ring-2 focus-within:ring-sky-400/15 md:max-w-sm">
      {pending ? (
        <Loader2 className="ml-3 h-4 w-4 shrink-0 animate-spin text-sky-300" />
      ) : (
        <Search className="ml-3 h-4 w-4 shrink-0 text-slate-500" />
      )}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        // 16px on phones so iOS doesn't zoom into the field.
        className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-base text-white outline-none placeholder:text-slate-500 md:text-sm"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="mr-2 rounded-md p-1 text-slate-400 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </label>
  );
}

export function FilterSelect({
  param,
  options,
  label,
}: {
  param: string;
  label: string;
  options: { value: string; label: string }[];
}) {
  const { set, params } = useParamSetter();
  return (
    <select
      aria-label={label}
      value={params.get(param) ?? ""}
      onChange={(e) => set(param, e.target.value || null)}
      className="h-10 rounded-xl border border-white/10 bg-[#0a1630] px-3 text-base text-slate-200 outline-none focus:border-sky-400/50 md:text-sm"
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  tone = "default",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  tone?: "default" | "danger";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button type="button" aria-label="Close" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 340 }}
            className={`relative w-full max-w-md rounded-t-3xl border bg-[#0a1630] p-5 shadow-2xl sm:rounded-3xl ${
              tone === "danger" ? "border-rose-400/30" : "border-white/10"
            }`}
          >
            <h2 className="mb-3 text-base font-bold text-white">{title}</h2>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Button({
  children,
  variant = "primary",
  loading,
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "success" | "ghost";
  loading?: boolean;
}) {
  const styles = {
    primary: "bg-sky-500 text-white hover:bg-sky-400 shadow-[0_0_14px_rgba(14,165,233,0.35)]",
    success: "bg-emerald-500 text-white hover:bg-emerald-400",
    danger: "bg-rose-500/90 text-white hover:bg-rose-500",
    secondary: "border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]",
    ghost: "text-slate-300 hover:bg-white/5",
  }[variant];
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || loading}
      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors disabled:opacity-50 ${styles} ${className}`}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
}

/** POSTs JSON to an HQ endpoint and refreshes server data on success. */
export function useHqAction() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(url: string, body: unknown): Promise<boolean> {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? `Request failed (${res.status})`);
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Network error. Please try again.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  return { run, loading, error, setError };
}

export function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
      {error}
    </p>
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-base text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50 md:text-sm"
    />
  );
}
