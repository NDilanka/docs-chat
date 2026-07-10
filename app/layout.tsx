import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chat with your docs — grounded RAG demo",
  description:
    "A production-style RAG feature: streaming answers grounded in a fixed document set, with clickable inline citations. Built with Next.js on free-tier APIs — OpenRouter generation and Google Gemini embeddings.",
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
