import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster"
import './globals.css';
import Header from '@/components/layout/header';

export const metadata: Metadata = {
  title: 'URL Tools',
  description: 'A modern tool to track and analyze lists of URLs.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <div className="flex min-h-screen flex-col bg-background">
          <Header />
          <main className="container mx-auto flex-1 p-4 md:p-8">
            {children}
          </main>
          <footer className="border-t">
            <div className="container mx-auto flex h-14 items-center justify-center px-4">
              <p className="text-sm text-muted-foreground">
                Built with Next.js and Genkit.
              </p>
            </div>
          </footer>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
