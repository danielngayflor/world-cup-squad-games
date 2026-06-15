import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "World Cup Squad Games",
  description: "Draft 4 teams with your friends and follow them to glory",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-[100dvh] text-white relative overflow-x-hidden flex flex-col">
        {/* Animated geometric background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
          <div className="geo-shape geo-1" />
          <div className="geo-shape geo-2" />
          <div className="geo-shape geo-3" />
          <div className="geo-shape geo-4" />
          <div className="geo-shape geo-5" />
          <div className="geo-shape geo-6" />
          <div className="glow-dot" style={{ top: "15%", left: "20%", animationDelay: "0s" }} />
          <div className="glow-dot" style={{ top: "35%", right: "25%", animationDelay: "1.5s" }} />
          <div className="glow-dot" style={{ top: "65%", left: "40%", animationDelay: "3s" }} />
          <div className="glow-dot" style={{ bottom: "20%", right: "15%", animationDelay: "0.8s" }} />
          <div className="light-streak" style={{ left: "28%", ["--dur" as string]: "22s", ["--del" as string]: "0s" }} />
          <div className="light-streak" style={{ left: "52%", ["--dur" as string]: "30s", ["--del" as string]: "8s" }} />
        </div>

        {/* Header */}
        <header className="relative px-6 py-4 flex items-center gap-3 border-b border-white/10 flex-shrink-0" style={{ zIndex: 10, backdropFilter: "blur(4px)", paddingTop: "max(1rem, env(safe-area-inset-top))", paddingLeft: "max(1.5rem, env(safe-area-inset-left))", paddingRight: "max(1.5rem, env(safe-area-inset-right))" }}>
          <span className="text-2xl">⚽</span>
          <a href="/" className="font-bold text-xl tracking-wide hover:text-blue-300 transition-colors" style={{ letterSpacing: "0.05em" }}>
            World Cup Squad Games
          </a>
        </header>

        <main className="relative flex-1 max-w-2xl w-full mx-auto px-4 py-6 flex flex-col" style={{ zIndex: 10 }}>
          {children}
        </main>
      </body>
    </html>
  );
}
