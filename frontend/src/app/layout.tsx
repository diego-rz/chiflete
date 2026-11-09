import type { Metadata, Viewport } from "next";
import { t } from "@/i18n/t";
import "./globals.css";

export const metadata: Metadata = {
  title: t("app.title"),
  description: t("app.description"),
};

// Mobile-first (Principio VII): ancho del dispositivo y escala inicial 1.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
