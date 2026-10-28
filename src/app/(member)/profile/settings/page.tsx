import { enabledPlatforms, platformLabel } from "@/lib/shortdrama";
import { SettingsView } from "./settings-view";

export default function SettingsPage() {
  const sources = enabledPlatforms().map((key) => ({ key, label: platformLabel(key) }));
  return <SettingsView sources={sources} />;
}
