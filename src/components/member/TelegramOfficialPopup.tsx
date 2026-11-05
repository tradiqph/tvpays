"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Send, X } from "lucide-react";
import {
  openTelegramOfficialGroup,
  TELEGRAM_POPUP_BANNER_PATH,
  TELEGRAM_POPUP_SESSION_KEY,
} from "@/lib/community";
import { useImmersiveWatch } from "@/components/member/ImmersiveWatchContext";
import { usePreferences } from "@/lib/preferences";

function dismissForSession() {
  try {
    sessionStorage.setItem(TELEGRAM_POPUP_SESSION_KEY, "1");
  } catch {
    /* private mode */
  }
}

function wasDismissedThisSession(): boolean {
  try {
    return sessionStorage.getItem(TELEGRAM_POPUP_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function TelegramOfficialPopup() {
  const { immersive } = useImmersiveWatch();
  const [prefs] = usePreferences();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!wasDismissedThisSession()) {
      setOpen(true);
    }
  }, []);

  function close() {
    dismissForSession();
    setOpen(false);
  }

  function join() {
    openTelegramOfficialGroup();
    close();
  }

  if (immersive) return null;

  const motionProps = prefs.reduceMotion
    ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, scale: 0.92, y: 10 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.92, y: 10 },
      };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="telegram-popup-title"
            className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-sky-400/40 bg-[#020b1f] shadow-[0_0_40px_rgba(56,189,248,0.25)]"
            {...motionProps}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={close}
              className="absolute right-2 top-2 z-10 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
            >
              <X className="h-4 w-4" />
            </button>
            <p id="telegram-popup-title" className="sr-only">
              Join TvPays official Telegram group
            </p>
            <button
              type="button"
              onClick={join}
              className="block w-full text-left"
            >
              <Image
                src={TELEGRAM_POPUP_BANNER_PATH}
                alt="Join TvPays official Telegram group"
                width={1080}
                height={608}
                className="h-auto w-full"
                priority
              />
            </button>
            <div className="space-y-2 p-3">
              <button
                type="button"
                onClick={join}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-sky-400 to-blue-700 py-2.5 text-sm font-bold text-white"
              >
                <Send className="h-4 w-4" />
                Join official group
              </button>
              <button
                type="button"
                onClick={close}
                className="w-full rounded-xl border border-sky-500/40 py-2 text-sm font-semibold text-sky-100"
              >
                Maybe later
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
