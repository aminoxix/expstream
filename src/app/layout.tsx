import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Expstream",
  description: "Real-time chat powered by Stream",
  icons: {
    icon: "/transparent-logo.png",
    apple: "/transparent-logo.png",
  },
  openGraph: {
    title: "Expstream",
    description: "Real-time chat powered by Stream",
    images: [{ url: "/chat_og_image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Expstream",
    description: "Real-time chat powered by Stream",
    images: ["/chat_og_image.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen min-w-screen`}
      >
        <main>
          {children}
          <Toaster />
        </main>
      </body>
    </html>
  );
}
