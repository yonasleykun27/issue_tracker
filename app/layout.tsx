import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthProvider from "./components/AuthProvider";
import ToastProvider from "./components/ToastProvider";
import QueryProvider from "./components/QueryProvider";
import ConditionalShell from "./components/ConditionalShell";
import { ThemeProvider } from "./components/ThemeProvider";

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
  description: "Operational incident and issue tracker for Ethio Telecom IT Operations",
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
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        <AuthProvider>
          <QueryProvider>
            <ThemeProvider>
              <ToastProvider />
              {/* ConditionalShell hides NavBar/Sidebar/footer on /auth/* pages */}
              <ConditionalShell>
                {children}
              </ConditionalShell>
            </ThemeProvider>
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
