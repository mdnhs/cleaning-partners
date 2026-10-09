import type { Metadata } from "next"
import { Barlow, Geist_Mono, Roboto } from "next/font/google"

import "./globals.css"
import { SmoothScroll } from "@/components/motion/smooth-scroll"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-sans",
})

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-heading",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "Cleaning Partners Ltd. | The Clean Team",
  description:
    "Medical, commercial and domestic cleaning you can rely on, across the midlands and beyond.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        roboto.variable,
        barlow.variable
      )}
    >
      <body>
        <noscript>
          <style>{`[data-intro]{visibility:visible!important}`}</style>
        </noscript>
        <SmoothScroll />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
