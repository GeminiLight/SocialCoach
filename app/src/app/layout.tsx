import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/AppProviders";

const hanken = Hanken_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-hanken", display: "swap" });

export const metadata: Metadata = {
  title: "SocialCoach",
  description: "想说的话，说出来。跟有自己目的、不会让你赢的 AI 角色实战演练，拿到引用你原话的教练复盘——告诉你是不会，还是会但没做到。每天 3 分钟。Say the thing you've been not saying.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "SocialCoach" },
  icons: { icon: "/icon.svg", apple: "/apple-icon.png" },
};

export const viewport: Viewport = {
  // The browser chrome should match whichever ground the page is on.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f5ef" },
    { media: "(prefers-color-scheme: dark)", color: "#22201d" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${hanken.variable}`} suppressHydrationWarning>
      <head>
        {/* Before first paint, so a pinned light theme does not flash dark (or
            the reverse). Reads the persisted store directly; failures are
            ignored and the media query decides. It has to be in <head> and
            without `async`: React refuses to order a blocking script anywhere
            else, and deferring it is the same as not having it. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=JSON.parse(localStorage.getItem("socialcoach.v1")||"{}").state?.settings?.theme;if(t&&t!=="system")document.documentElement.setAttribute("data-theme",t)}catch(e){}`,
          }}
        />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
