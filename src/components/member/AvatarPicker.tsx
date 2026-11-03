"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Cropper, { type Area } from "react-easy-crop";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Loader2, RotateCw, Trash2, User, ZoomIn, ZoomOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { processAvatar } from "@/lib/avatar-image";

const BUCKET = "avatars";
const MAX_INPUT_BYTES = 25 * 1024 * 1024;

type Props = {
  avatarUrl: string | null;
  onChange: (url: string | null) => void;
  /** Inner circle size in px. */
  size?: number;
};

async function currentUserId() {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (!user) throw new Error("Please sign in again.");
  return user.id;
}

/** Deletes every file in the member's folder except `keep`. */
async function cleanupOld(userId: string, keep?: string) {
  const storage = createClient().storage.from(BUCKET);
  const { data } = await storage.list(userId);
  const stale = (data ?? [])
    .map((f) => `${userId}/${f.name}`)
    .filter((p) => p !== keep);
  if (stale.length) await storage.remove(stale);
}

/** Round avatar with a camera button that opens a crop-and-upload sheet. */
export function AvatarPicker({ avatarUrl, onChange, size = 74 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState<"save" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);

  // Release the object URL whenever the picked file changes or the sheet closes.
  useEffect(() => {
    return () => {
      if (src) URL.revokeObjectURL(src);
    };
  }, [src]);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    setError(null);
    const problem = !file.type.startsWith("image/")
      ? "Please choose an image file."
      : file.size > MAX_INPUT_BYTES
        ? "That photo is too large (max 25 MB)."
        : null;
    if (problem) {
      setPickError(problem);
      setTimeout(() => setPickError(null), 3500);
      return;
    }
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setSrc(URL.createObjectURL(file));
  }

  const close = useCallback(() => {
    if (busy) return;
    setSrc(null);
    setError(null);
  }, [busy]);

  async function save() {
    if (!src || !area) return;
    setBusy("save");
    setError(null);
    try {
      const blob = await processAvatar(src, area, rotation);
      const userId = await currentUserId();
      const ext = blob.type === "image/webp" ? "webp" : "jpg";
      // New name per upload so CDN/browser caches never show the old photo.
      const path = `${userId}/${Date.now()}.${ext}`;
      const supabase = createClient();
      const storage = supabase.storage.from(BUCKET);
      const { error: upErr } = await storage.upload(path, blob, {
        contentType: blob.type,
        cacheControl: "31536000",
        upsert: false,
      });
      if (upErr) throw upErr;
      const url = storage.getPublicUrl(path).data.publicUrl;
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", userId);
      if (dbErr) {
        await storage.remove([path]);
        throw dbErr;
      }
      void cleanupOld(userId, path);
      setImgFailed(false);
      onChange(url);
      setBusy(null);
      setSrc(null);
    } catch (err) {
      console.error("[avatar] upload failed", err);
      setError("Couldn't save your photo. Please try again.");
      setBusy(null);
    }
  }

  function openPicker() {
    setPickError(null);
    if (avatarUrl) setMenuOpen(true);
    else inputRef.current?.click();
  }

  async function remove() {
    setBusy("remove");
    setError(null);
    try {
      const userId = await currentUserId();
      const { error: dbErr } = await createClient()
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", userId);
      if (dbErr) throw dbErr;
      void cleanupOld(userId);
      onChange(null);
      setBusy(null);
      setMenuOpen(false);
    } catch (err) {
      console.error("[avatar] remove failed", err);
      setError("Couldn't remove your photo. Please try again.");
      setBusy(null);
    }
  }

  const showPhoto = avatarUrl && !imgFailed;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={openPicker}
        aria-label="Change profile photo"
        className="block rounded-full bg-gradient-to-b from-cyan-300 to-blue-600 p-[3px]"
        style={{ boxShadow: "0 0 18px rgba(56,189,248,0.7)" }}
      >
        <span
          className="flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-b from-[#1b4bb8] to-[#071a4a]"
          style={{ width: size, height: size }}
        >
          {showPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element -- Supabase public URL, already optimised
            <img
              src={avatarUrl}
              alt="Profile photo"
              className="h-full w-full object-cover"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <User className="h-1/2 w-1/2 fill-sky-200/30 text-sky-100" />
          )}
        </span>
      </button>
      <button
        type="button"
        onClick={openPicker}
        aria-label="Upload profile photo"
        className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white/80 bg-gradient-to-b from-sky-400 to-blue-700"
        style={{ boxShadow: "inset 0 1px 2px rgba(255,255,255,0.6)" }}
      >
        <Camera className="h-3.5 w-3.5 text-white" />
      </button>
      <AnimatePresence>
        {pickError && (
          <motion.p
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute left-0 top-full z-20 mt-2 w-44 rounded-lg border border-rose-400/40 bg-[#2a0a18]/95 px-2.5 py-1.5 text-[11px] text-rose-200"
          >
            {pickError}
          </motion.p>
        )}
      </AnimatePresence>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={pick}
      />

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {menuOpen && !src && (
              <PhotoMenu
                key="menu"
                busy={busy === "remove"}
                error={error}
                onChange={() => {
                  setMenuOpen(false);
                  setError(null);
                  inputRef.current?.click();
                }}
                onRemove={remove}
                onClose={() => {
                  if (busy) return;
                  setMenuOpen(false);
                  setError(null);
                }}
              />
            )}
            {src && (
              <CropSheet
                key="crop"
                src={src}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                setCrop={setCrop}
                setZoom={setZoom}
                setRotation={setRotation}
                onArea={setArea}
                busy={busy}
                error={error}
                onSave={save}
                onClose={close}
              />
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

function CropSheet({
  src,
  crop,
  zoom,
  rotation,
  setCrop,
  setZoom,
  setRotation,
  onArea,
  busy,
  error,
  onSave,
  onClose,
}: {
  src: string;
  crop: { x: number; y: number };
  zoom: number;
  rotation: number;
  setCrop: (c: { x: number; y: number }) => void;
  setZoom: (z: number) => void;
  setRotation: (r: number) => void;
  onArea: (a: Area) => void;
  busy: "save" | "remove" | null;
  error: string | null;
  onSave: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Crop profile photo"
        initial={{ y: 80, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", damping: 24, stiffness: 280 }}
        className="relative w-full max-w-[380px] overflow-hidden rounded-t-[28px] border-2 border-sky-300/50 bg-gradient-to-b from-[#123480] via-[#0a2263] to-[#06143a] p-4 sm:rounded-[28px]"
        style={{ boxShadow: "0 0 36px rgba(56,150,255,0.4), inset 0 1px 0 rgba(255,255,255,0.3)" }}
      >
        <p className="mb-3 text-center text-base font-extrabold text-white">
          Adjust your photo
        </p>

        <div className="relative h-72 overflow-hidden rounded-2xl bg-black">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            minZoom={1}
            maxZoom={4}
            aspect={1}
            cropShape="round"
            showGrid={false}
            objectFit="contain"
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={(_, px) => onArea(px)}
            style={{
              cropAreaStyle: {
                border: "2px solid rgba(125,211,252,0.9)",
                boxShadow: "0 0 0 9999px rgba(2,8,30,0.7)",
              },
            }}
          />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <ZoomOut className="h-4 w-4 shrink-0 text-sky-200" />
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Zoom"
            className="h-1.5 flex-1 cursor-pointer accent-sky-400"
          />
          <ZoomIn className="h-4 w-4 shrink-0 text-sky-200" />
          <motion.button
            type="button"
            whileTap={{ rotate: 90, scale: 0.9 }}
            onClick={() => setRotation((rotation + 90) % 360)}
            aria-label="Rotate 90°"
            className="ml-1 rounded-full border border-sky-300/50 bg-white/10 p-2 text-sky-100"
          >
            <RotateCw className="h-4 w-4" />
          </motion.button>
        </div>

        {error && (
          <motion.p
            key={error}
            role="alert"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, x: [0, -6, 6, -3, 3, 0] }}
            className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/15 px-3 py-2 text-xs text-rose-200"
          >
            {error}
          </motion.p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={Boolean(busy)}
            className="h-11 flex-1 rounded-full border border-sky-300/40 bg-[#0b1d4d]/80 text-sm font-semibold text-sky-100 disabled:opacity-40"
          >
            Cancel
          </button>
          <motion.button
            type="button"
            onClick={onSave}
            disabled={Boolean(busy)}
            whileTap={{ scale: 0.97 }}
            className="flex h-11 flex-[1.4] items-center justify-center gap-2 rounded-full border border-sky-200/70 bg-gradient-to-r from-sky-400 to-blue-600 text-sm font-bold uppercase tracking-wide text-white disabled:opacity-70"
            style={{ boxShadow: "0 0 18px rgba(0,150,255,0.5), inset 0 1px 0 rgba(255,255,255,0.5)" }}
          >
            {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busy === "save" ? "Saving…" : "Save photo"}
          </motion.button>
        </div>

      </motion.div>
    </motion.div>
  );
}

function PhotoMenu({
  busy,
  error,
  onChange,
  onRemove,
  onClose,
}: {
  busy: boolean;
  error: string | null;
  onChange: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-end justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Profile photo options"
        initial={{ y: 60 }}
        animate={{ y: 0 }}
        exit={{ y: 60 }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}
        className="relative w-full max-w-[380px] space-y-2 rounded-t-[28px] border-2 border-b-0 border-sky-300/50 bg-gradient-to-b from-[#123480] to-[#06143a] p-4"
      >
        <button
          type="button"
          onClick={onChange}
          disabled={busy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-sky-200/70 bg-gradient-to-r from-sky-400 to-blue-600 text-sm font-bold text-white disabled:opacity-50"
        >
          <Camera className="h-4 w-4" />
          Change photo
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={busy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-rose-300/40 bg-rose-500/15 text-sm font-semibold text-rose-200 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Remove photo
        </button>
        {error && <p role="alert" className="text-center text-xs text-rose-300">{error}</p>}
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="h-11 w-full text-sm font-semibold text-sky-200/80"
        >
          Cancel
        </button>
      </motion.div>
    </motion.div>
  );
}
