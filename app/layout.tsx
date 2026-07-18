import type { Metadata } from "next";
import "./ios26.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chat with your docs · grounded RAG demo",
  description:
    "A production-style RAG feature: streaming answers grounded in a fixed document set, with clickable inline citations. Built with Next.js on free-tier APIs. Generation runs on OpenRouter and embeddings on Google Gemini.",
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
