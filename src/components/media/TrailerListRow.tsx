"use client";

import Image from "next/image";
import { Eye, MoreVertical, ThumbsUp, Wallet } from "lucide-react";
import { formatPhp } from "@/lib/format";
import { formatViewCount } from "@/lib/youtube-rss";
import type { VideoListItem } from "@/app/api/videos/route";
import {
  LikePointsBurst,
  type LikeBurst,
} from "@/components/media/LikePointsBurst";

type Props = {
  video: VideoListItem;
  selected: boolean;
  onSelect: () => void;
  onToggleLike: () => void;
  likePending: boolean;
  likeBurst: LikeBurst | null;
};

export function TrailerListRow({
  video,
  selected,
  onSelect,
  onToggleLike,
  likePending,
  likeBurst,
}: Props) {
  const thumb = `https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`relative z-10 flex w-full cursor-pointer gap-3 rounded-xl border p-2 text-left transition active:scale-[0.99] ${
        selected
          ? "border-sky-400/90 bg-sky-950/60 ring-1 ring-sky-400/40"
          : "border-slate-800/80 bg-slate-900/40 hover:border-sky-800/50"
      }`}
    >
      <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-slate-800">
        <Image src={thumb} alt="" fill className="object-cover" sizes="112px" />
        {video.duration_label && (
          <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 text-[10px] text-white">
            {video.duration_label}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-xs font-semibold text-white">
          {video.title}
        </p>
        <p className="mt-0.5 text-[10px] uppercase text-sky-400/70">
          {video.visibility}
          {video.credited_today && (
            <span className="ml-2 text-emerald-400">· credited</span>
          )}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
          <span className="inline-flex items-center gap-0.5">
            <Eye className="h-3 w-3" />
            {formatViewCount(video.display_views)}
          </span>
          <span className="inline-flex items-center gap-0.5 text-emerald-300/90">
            <Wallet className="h-3 w-3" />
            {formatPhp(video.ads_fund_display)}
          </span>
          <span className="text-sky-300/80">1 Ad</span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-center gap-1 pt-1 text-sky-500/60">
        <MoreVertical className="pointer-events-none h-4 w-4" />
        <span className="relative inline-flex">
          <LikePointsBurst burst={likeBurst} />
          <button
            type="button"
            aria-pressed={video.liked}
            aria-label={video.liked ? "Unlike trailer" : "Like trailer"}
            disabled={likePending}
            onClick={(e) => {
              e.stopPropagation();
              onToggleLike();
            }}
            className={`-m-1 rounded-full p-1.5 transition active:scale-90 disabled:opacity-60 ${
              video.liked ? "text-sky-300" : "hover:text-sky-300"
            }`}
          >
            <ThumbsUp
              className={`h-4 w-4 ${video.liked ? "fill-sky-400/80" : ""}`}
            />
          </button>
        </span>
      </div>
    </div>
  );
}
