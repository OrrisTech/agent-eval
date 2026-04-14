import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AgentHunter Eval — MCP Server Benchmarks",
    template: "%s | AgentHunter Eval",
  },
  description:
    "Independent benchmarks for MCP servers. Scored across capability, reliability, efficiency, safety, and developer experience.",
  openGraph: {
    title: "AgentHunter Eval — MCP Server Benchmarks",
    description:
      "Independent benchmarks for MCP servers. Scored across capability, reliability, efficiency, safety, and developer experience.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
