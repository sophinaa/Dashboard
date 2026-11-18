import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import "./globals.css";
import { StudyProvider } from "@/components/providers/StudyProvider";
import { getStudyConfig } from "@/lib/study/server";

const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "StoreScope",
  description: "Research prototype analytics dashboard (synthetic data).",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const config = await getStudyConfig();
  return (
    <html lang="en-GB" className={sans.variable}>
      <body className="font-sans antialiased">
        <StudyProvider config={config}>{children}</StudyProvider>
      </body>
    </html>
  );
}
