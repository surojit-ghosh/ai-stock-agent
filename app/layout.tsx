import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    variable: "--font-mono",
});

const inter = Inter({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    variable: "--font-sans",
});

export const metadata: Metadata = {
    title: "AI Stock Agent",
    description: "AI-powered NSE/BSE stock analysis",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            suppressHydrationWarning
            className={`dark ${jetbrainsMono.variable} ${inter.variable} antialiased`}
        >
            <body className="font-sans bg-stock-bg min-h-screen text-stock-text">
                {children}
            </body>
        </html>
    );
}
