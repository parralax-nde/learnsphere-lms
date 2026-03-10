import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LearnSphere LMS",
  description: "An online learning management system for educational courses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
