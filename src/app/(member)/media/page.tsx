import { Suspense } from "react";
import { enabledPlatforms, platformLabel, platformSupportsSearch } from "@/lib/shortdrama";
import { MediaView } from "./media-view";

export default function MediaPage() {
  const platforms = enabledPlatforms().map((key) => ({
    key,
    label: platformLabel(key),
    search: platformSupportsSearch(key),
  }));
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center py-20 text-sm text-sky-200/70">
          Loading…
        </div>
      }
    >
      <MediaView platforms={platforms} />
    </Suspense>
  );
}
