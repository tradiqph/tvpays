import { enabledPlatforms, platformLabel } from "@/lib/shortdrama";
import { MediaView } from "./media-view";

export default function MediaPage() {
  const platforms = enabledPlatforms().map((key) => ({
    key,
    label: platformLabel(key),
  }));
  return <MediaView platforms={platforms} />;
}
