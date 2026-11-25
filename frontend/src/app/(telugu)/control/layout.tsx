import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Control Workspace",
  robots: { index: false, follow: false },
};

export default function ControlLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
