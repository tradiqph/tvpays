"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Loader2, LogOut, ShieldCheck, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Me = {
  name: string;
  email: string;
  avatarUrl: string | null;
  isStaff: boolean;
};

/** Header avatar that opens Profile / HQ (staff only) / Sign out. */
export function ProfileMenu() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      const role = user.app_metadata?.role;
      setMe({
        name: data?.display_name || "Member",
        email: user.email ?? "",
        avatarUrl: data?.avatar_url ?? null,
        // Only hides the link; /hq itself is guarded on the server.
        isStaff: role === "hq" || role === "super_admin",
      });
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    setSigningOut(true);
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const items = [
    { href: "/profile", label: "Profile", sub: "Account, plan and settings", icon: User, tone: "from-[#5ab8ff] to-[#1546c9]", glow: "rgba(56,150,255,0.55)" },
    ...(me?.isStaff
      ? [{ href: "/hq", label: "HQ Console", sub: "Admin dashboard", icon: ShieldCheck, tone: "from-[#c08cff] to-[#5b21b6]", glow: "rgba(167,139,250,0.55)" }]
      : []),
  ];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-sky-200/70 bg-gradient-to-br from-sky-600 to-blue-900 shadow-[0_0_12px_rgba(0,150,255,0.45)] transition-transform active:scale-95"
      >
        {me?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Supabase public avatar
          <img src={me.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <User className="h-4 w-4 fill-sky-200/30 text-sky-100" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-60 origin-top-right overflow-hidden rounded-2xl border border-sky-300/50 bg-gradient-to-b from-[#123480]/95 to-[#06143a]/95 p-1.5 backdrop-blur-md"
            style={{
              boxShadow:
                "0 12px 30px rgba(0,0,0,0.55), 0 0 18px rgba(56,150,255,0.3), inset 0 1px 0 rgba(255,255,255,0.25)",
            }}
          >
            {me && (
              <div className="mb-1 border-b border-white/10 px-2.5 pb-2 pt-1.5">
                <p className="truncate text-sm font-bold text-white">{me.name}</p>
                <p className="truncate text-[11px] text-sky-200/70">{me.email}</p>
              </div>
            )}
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/10"
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border border-white/40 bg-gradient-to-b ${item.tone}`}
                    style={{ boxShadow: `0 0 10px ${item.glow}, inset 0 2px 3px rgba(255,255,255,0.5)` }}
                  >
                    <Icon className="h-4 w-4 text-white" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-white">{item.label}</span>
                    <span className="block truncate text-[11px] text-sky-100/60">{item.sub}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-white/50" />
                </Link>
              );
            })}
            <button
              type="button"
              role="menuitem"
              onClick={signOut}
              disabled={signingOut}
              className="mt-1 flex w-full items-center gap-3 rounded-xl border-t border-white/10 px-2 py-2 text-left hover:bg-rose-500/10 disabled:opacity-60"
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/40 bg-gradient-to-b from-[#ff6b7d] to-[#9b1030]"
                style={{ boxShadow: "0 0 10px rgba(244,63,94,0.5), inset 0 2px 3px rgba(255,255,255,0.5)" }}
              >
                {signingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <LogOut className="h-4 w-4 text-white" />
                )}
              </span>
              <span className="text-sm font-semibold text-rose-100">
                {signingOut ? "Signing out…" : "Sign out"}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
