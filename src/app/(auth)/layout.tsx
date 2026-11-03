import { PhoneFrame } from "@/components/PhoneFrame";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <PhoneFrame>{children}</PhoneFrame>;
}
