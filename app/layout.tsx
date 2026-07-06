import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavBar from "./components/NavBar";
import AuthProvider from "./components/AuthProvider";
import ToastProvider from "./components/ToastProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ethio Telecom - Issue Tracker",
  description: "Operational incident and bug tracker for Ethio Telecom",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50/50 text-zinc-900">
        <AuthProvider>
          <ToastProvider />
          <NavBar />
          <main className="flex-1 pb-12">
            {children}
          </main>
          <footer className="bg-white border-t border-zinc-100 py-6 mt-auto">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-zinc-500 text-xs gap-4">
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-brand-green" />
                <span className="font-semibold text-zinc-700">Ethio Telecom IT Operations</span>
              </div>
              <div>
                © 2026 Ethio Telecom. All rights reserved.
              </div>
              <div className="flex space-x-4">
                <a href="https://www.ethiotelecom.et" target="_blank" rel="noreferrer" className="hover:text-brand-green hover:underline">
                  Official Website
                </a>
                <span>•</span>
                <span className="text-zinc-400">Internal Use Only</span>
              </div>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
