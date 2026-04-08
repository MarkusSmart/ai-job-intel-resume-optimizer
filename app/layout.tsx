import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Job Intelligence & Resume Optimizer",
  description: "Analyze a job posting against a resume and surface skill gaps.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
