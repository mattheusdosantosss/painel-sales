import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sales · Demandas Performance | MKT",
  description:
    "Acompanhamento das demandas do time de Sales no pipeline Performance | MKT do HubSpot · PSA",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" data-theme="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="topglow" />
        {children}
      </body>
    </html>
  );
}
