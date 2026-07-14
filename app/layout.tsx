import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { LangProvider } from "@/context/LanguageContext";
import { ToastProvider } from "@/context/ToastContext";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "MyFitnessPro",
  description: "Pilates & Fitness Training App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="min-h-full flex flex-col">
        <LangProvider><AuthProvider><ToastProvider>{children}</ToastProvider></AuthProvider></LangProvider>
      </body>
    </html>
  );
}
