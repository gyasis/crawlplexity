import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from 'sonner'
import { ThemeProvider } from "next-themes"
import { SidebarProvider } from "@/contexts/SidebarContext"

export const metadata: Metadata = {
  title: "Fireplexity - AI-Powered Search",
  description: "Advanced search with AI-powered insights and real-time stock information",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SidebarProvider>
            {children}
            <Toaster position="bottom-right" />
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}