import "./globals.css";
import PwaRegister from "./pwa-register";

export const metadata = {
  title: "ORION AI",
  description: "Your Intelligent Companion",
  applicationName: "ORION AI",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ORION AI",
  },
  icons: {
    icon: "/orion-icon.svg",
    apple: "/orion-icon.svg",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }) {
  return (
    <html lang="hi">
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
