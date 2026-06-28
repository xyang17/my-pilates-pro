import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { LangProvider } from "@/context/LanguageContext";
import { ToastProvider } from "@/context/ToastContext";

export const metadata: Metadata = {
  title: "MyPilatesPro",
  description: "Pilates & Fitness Training App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-full flex flex-col">
        <LangProvider><AuthProvider><ToastProvider>{children}</ToastProvider></AuthProvider></LangProvider>
      </body>
    </html>
  );
}
