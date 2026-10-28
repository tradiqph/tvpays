"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useImmersiveWatch } from "@/components/member/ImmersiveWatchContext";
import {
  Wallet,
  Film,
  ClipboardList,
  Crown,
  User,
} from "lucide-react";

const tabs = [
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/media", label: "Media", icon: Film },
  { href: "/task", label: "Task", icon: ClipboardList },
  { href: "/subscriptions", label: "Subscriptions", icon: Crown },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const { immersive } = useImmersiveWatch();

  if (immersive) return null;

  return (
    <nav className="relative shrink-0 border-t border-sky-900/80 bg-[#000814]/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
      <ul className="flex justify-between">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="relative flex-1">
              <Link
                href={href}
                className={`relative flex flex-col items-center gap-0.5 px-1 py-1 text-[10px] ${
                  active ? "text-sky-300" : "text-slate-500"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute -top-2 h-0.5 w-10 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(0,180,255,0.9)]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon
                  className={`h-5 w-5 ${
                    active
                      ? "text-sky-300 drop-shadow-[0_0_8px_rgba(0,180,255,0.9)]"
                      : ""
                  }`}
                />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
