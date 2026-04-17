import type { Metadata, Viewport } from "next";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "AgentHunter Eval — AI Agent Evaluation",
    template: "%s | AgentHunter Eval",
  },
  description:
    "Independent AI agent evaluation platform. Task completion scoring for agents. Quality benchmarks for MCP servers.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/logo.svg", type: "image/svg+xml", sizes: "any" },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "AgentHunter Eval — AI Agent Evaluation",
    description:
      "Independent AI agent evaluation platform. Task completion scoring for agents. Quality benchmarks for MCP servers.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col" suppressHydrationWarning>
        <Nav />
        <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
