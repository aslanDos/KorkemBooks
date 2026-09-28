import type { Metadata } from "next";
import { Cormorant_Garamond, Forum, Literata, Manrope, Playfair_Display } from "next/font/google";
import { ThemeScript } from "@/components/theme/theme-script";
import { LocaleProvider, type Locale } from "@/components/locale/locale-provider";
import { cookies } from "next/headers";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["cyrillic", "latin"] });
const forum = Forum({ preload: false, variable: "--font-forum", subsets: ["cyrillic", "latin"], weight: "400" });
const playfair = Playfair_Display({ preload: false, variable: "--font-playfair", subsets: ["cyrillic", "latin"], weight: ["400", "500"] });
const cormorant = Cormorant_Garamond({ preload: false, variable: "--font-cormorant", subsets: ["cyrillic", "latin"], weight: ["400", "500", "600"] });
const literata = Literata({ preload: false, variable: "--font-literata", subsets: ["cyrillic", "latin"] });

export const metadata: Metadata = {
  title: "korkembooks — Ваша история достойна книги",
  description: "Создайте книгу из ваших воспоминаний",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale: Locale = (await cookies()).get("korkem-locale")?.value === "kk" ? "kk" : "ru";
  return (
    <html lang={locale} suppressHydrationWarning>
      <head><ThemeScript /></head>
      <body className={`${manrope.variable} ${forum.variable} ${playfair.variable} ${cormorant.variable} ${literata.variable}`}><LocaleProvider initialLocale={locale}>{children}</LocaleProvider></body>
    </html>
  );
}
