import type { Metadata } from "next";
import "./globals.css";
import { Comfortaa } from "next/font/google";
import NavBar from "@/components/NavBar";

const comfortaa = Comfortaa({
  subsets: ["latin"],
  variable: "--font-comfortaa",
});

export const metadata: Metadata = {
  title: "TKI",
  description: "Study, puzzles, and accounts for block-stacking games.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={comfortaa.variable}>
      <body>
        <NavBar />
        {children}
      </body>
    </html>
  );
}
