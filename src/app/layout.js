/* eslint-disable @next/next/no-page-custom-font */
import { Inter } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "Ajuste de Ponto — ViaRondon",
  description: "Ajuste de Ponto - ViaRondon",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <head>
        {/* Handwritten signature fonts only — UI font is loaded via next/font */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Sacramento&family=Allura&family=Dancing+Script:wght@700&family=Marck+Script&family=Kaushan+Script&family=Caveat:wght@700&family=Indie+Flower&family=Patrick+Hand&family=Shadows+Into+Light&family=Satisfy&family=Great+Vibes&family=Playball&family=Yellowtail&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
