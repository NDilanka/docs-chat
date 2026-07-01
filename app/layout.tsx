import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chat with your docs — grounded RAG demo",
  description:
    "A production-style RAG feature: streaming answers grounded in a fixed document set, with verifiable inline citations. Built with Next.js, Anthropic Claude, and OpenAI embeddings.",
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
