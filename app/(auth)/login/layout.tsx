import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In – LearnSphere",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
