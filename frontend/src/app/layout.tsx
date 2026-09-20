import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { DataProvider } from "@/lib/data-context";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopHeader } from "@/components/layout/TopHeader";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MediCall — Medication Adherence Platform",
  description:
    "Voice-call medication adherence platform for Ghanaian healthcare workers and pharmacists.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable}`}>
      <body className="bg-[#F8F9FA] text-[#111827] min-h-screen flex flex-col md:flex-row antialiased selection:bg-[#70BF2B]/20 selection:text-[#55941E]">
        <DataProvider>
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0 bg-[#F8F9FA]">
            <TopHeader />
            <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
              {children}
            </main>
          </div>
        </DataProvider>
      </body>
    </html>
  );
}
