import type { CSSProperties, ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/golos-text";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAKYRO — Моя волна",
  description: "Слушайте демокаталог SAKYRO и выберите оформление главного экрана.",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  colorScheme: "dark",
  themeColor: "#121016",
};

const typography = {
  "--font-display": '"Manrope Variable", system-ui, sans-serif',
  "--font-body": '"Golos Text Variable", system-ui, sans-serif',
} as CSSProperties;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" style={typography}>
      <body>{children}</body>
    </html>
  );
}
