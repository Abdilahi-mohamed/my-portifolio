import type { Metadata } from "next";
import "../frontend/src/styles.css";
import "../frontend/src/admin.css";

export const metadata: Metadata = {
  title: "ABdilahi Portfolio",
  description: "Full-stack developer portfolio.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html data-portfolio-theme="dark" lang="en">
      <body>{children}</body>
    </html>
  );
}
