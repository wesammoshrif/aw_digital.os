import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import "./globals.css";

/* Inter = the web fallback that most closely matches SF Pro metrics.
   On Apple devices the CSS stack resolves to true SF Pro first. */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AW Digital OS",
  description: "Akquise-Cockpit für Handwerksbetriebe",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const path = (await headers()).get("x-pathname") ?? "";
  const isAuthPage =
    path === "/login" || path === "/signup" || path === "/pending";

  // Nicht-eingeloggt regelt die Middleware (→ /login). Hier nur das
  // Pending-Gate: wer noch nicht freigegeben ist, sieht den Warte-Screen.
  if (!isAuthPage) {
    const user = await getSessionUser();
    if (user && !user.approved) redirect("/pending");
  }

  return (
    <html lang="de" className={`${inter.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-fg)] antialiased">
        {children}
      </body>
    </html>
  );
}
