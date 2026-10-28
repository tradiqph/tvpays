"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, Clapperboard, Trash2 } from "lucide-react";
import { MemberHeader } from "@/components/member/MemberHeader";
import { SubPageHeader } from "@/components/member/SubPageHeader";
import { GlossPanel } from "@/components/member/ProfileGloss";
import {
  removeDramaFromList,
  useDramaSavedList,
  type SavedDramaEntry,
} from "@/lib/drama-saved-list";

function proxiedCover(src: string | null) {
  return src ? `/api/dramas/cover?url=${encodeURIComponent(src)}` : null;
}

function SavedRow({
  entry,
  onRemove,
  onOpen,
}: {
  entry: SavedDramaEntry;
  onRemove: () => void;
  onOpen: () => void;
}) {
  const poster = proxiedCover(entry.cover);
  return (
    <GlossPanel border="border-sky-400/25">
      <div className="flex gap-3 p-2">
        <button
          type="button"
          onClick={onOpen}
          className="relative h-[4.5rem] w-12 shrink-0 overflow-hidden rounded-lg bg-[#0a1638] ring-1 ring-sky-400/30"
        >
          {poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={poster} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center">
              <Clapperboard className="h-5 w-5 text-sky-300/60" />
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 text-left"
        >
          <p className="line-clamp-2 text-sm font-semibold text-white">
            {entry.title}
          </p>
          <p className="mt-0.5 text-xs text-sky-100/70">
            Episode {entry.episodeNumber}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">
            {entry.platform}
          </p>
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-rose-500/15 hover:text-rose-300"
          aria-label="Remove from list"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </GlossPanel>
  );
}

export function SavedListView() {
  const router = useRouter();
  const { list } = useDramaSavedList();

  function openEntry(entry: SavedDramaEntry) {
    const params = new URLSearchParams({
      platform: entry.platform,
      drama: entry.dramaId,
      ep: String(entry.episodeNumber),
      title: entry.title,
    });
    if (entry.cover) params.set("cover", entry.cover);
    router.push(`/media?${params.toString()}`);
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <MemberHeader variant="profile" />
      <SubPageHeader title="My list" />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        <p className="mb-3 flex items-center gap-2 text-xs text-sky-100/70">
          <Bookmark className="h-3.5 w-3.5 text-sky-300" />
          Bookmarks are saved on this device so you can pick up where you left off.
        </p>

        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-sky-400/30 bg-[#06153f]/50 px-4 py-10 text-center">
            <Bookmark className="mx-auto h-10 w-10 text-sky-400/40" />
            <p className="mt-3 text-sm font-semibold text-white">Nothing saved yet</p>
            <p className="mt-1 text-xs text-slate-400">
              While watching, tap the bookmark below the episode list to save a show.
            </p>
            <Link
              href="/media"
              className="mt-4 inline-block rounded-full bg-gradient-to-b from-sky-400 to-blue-700 px-5 py-2 text-sm font-bold text-white"
            >
              Browse dramas
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {list.map((entry) => (
              <li key={`${entry.platform}:${entry.dramaId}`}>
                <SavedRow
                  entry={entry}
                  onOpen={() => openEntry(entry)}
                  onRemove={() =>
                    removeDramaFromList(entry.platform, entry.dramaId)
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
