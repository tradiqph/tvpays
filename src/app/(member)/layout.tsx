import { PhoneFrame } from "@/components/PhoneFrame";
import { BottomNav } from "@/components/member/BottomNav";
import { ImmersiveWatchProvider } from "@/components/member/ImmersiveWatchContext";
import { MemberMotionConfig } from "@/components/member/MemberMotionConfig";
import { TabTransition } from "@/components/member/TabTransition";

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PhoneFrame>
      <ImmersiveWatchProvider>
        <MemberMotionConfig>
          <div className="flex min-h-0 flex-1 flex-col">
            <TabTransition>{children}</TabTransition>
          </div>
          <BottomNav />
        </MemberMotionConfig>
      </ImmersiveWatchProvider>
    </PhoneFrame>
  );
}
