import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "California Conservatorship & Trust Accounting App",
  description: "Automated court petition generation for California conservatorship and trust accounting",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
