import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { DataProvider } from "@/lib/data-context";
import { AppShell } from "@/components/layout/AppShell";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-outfit",
  display: "swap",
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Kaime — Medication Adherence Platform",
  description:
    "Voice-call medication adherence platform for Ghanaian healthcare workers and pharmacists.",
  icons: {
    icon: [
      { url: "/Minimal Blue and Coral Leaf Emblem.png", type: "image/png" },
    ],
    shortcut: "/Minimal Blue and Coral Leaf Emblem.png",
    apple: "/Minimal Blue and Coral Leaf Emblem.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable}`}>
      <body className="bg-warm-bg text-primary-text min-h-screen antialiased selection:bg-kaime-blue/20 selection:text-kaime-blue">
        <AuthProvider>
          <DataProvider>
            <AppShell>{children}</AppShell>
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
