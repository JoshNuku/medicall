import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { DataProvider } from "@/lib/data-context";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MediCall — Medication Adherence Dashboard",
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
      <body className="bg-[#FAF9F6] text-[#111827] min-h-screen flex flex-col md:flex-row antialiased selection:bg-emerald-100 selection:text-emerald-900">
        <DataProvider>
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <MobileNav />
            <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
              {children}
            </main>
          </div>
        </DataProvider>
      </body>
    </html>
  );
}
