import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import NavbarWrapper from "@/components/NavbarWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "micSQL",
  description: "Your lightweight SQL database management tool",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Ensure the font is preloaded */}
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Jaro:opsz@6..72&family=Tektur:wght@400..900&display=swap"
        />
      </head>
      <body className={inter.className}>
        <Providers>
          <NavbarWrapper>{children}</NavbarWrapper>
        </Providers>
      </body>
    </html>
  );
}
