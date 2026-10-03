import type { Metadata } from "next";
import "./globals.css";
import { Comfortaa } from "next/font/google";
import { cookies } from "next/headers";
import NavBar from "@/components/NavBar";

const comfortaa = Comfortaa({
  subsets: ["latin"],
  variable: "--font-comfortaa",
});

export const metadata: Metadata = {
  title: "Tetris Knowledge Index",
  description: "Share Tetris openings and strategies, solve Perfect Clear puzzles, and discuss the game with the community.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("tt-theme")?.value === "light" ? "light" : "dark";

  return (
    <html lang="en" className={comfortaa.variable} data-theme={theme}>
      <body>
        <NavBar />
        {children}
      </body>
    </html>
  );
}
