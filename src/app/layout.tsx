import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
// Order matters: the design system defines tokens and base styles, then
// globals.css layers anything app-specific on top.
import "@vivancedata/ui/styles";
import "./globals.css";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
// The display voice of the `nightshift` world, with its italic. Loaded here
// so a visitor arriving from the marketing site lands on the same typography
// rather than on a second, blacker house style.
const displaySerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Missed-call demo — Vivancedata",
  description:
    "The 9pm voicemail becomes a triaged, bookable job instead of a lost customer. Browser simulation of the phone-line service.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // `data-world` opts this demo into the same token set the marketing site
    // runs, so the click-through from there does not change grounds.
    <html
      lang="en"
      data-world="nightshift"
      className={`${geistSans.variable} ${geistMono.variable} ${displaySerif.variable} dark`}
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
