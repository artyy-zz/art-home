import { Cormorant_Garamond, Manrope } from "next/font/google";

export const sans = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
