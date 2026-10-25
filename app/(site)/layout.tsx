import type { Metadata } from "next"

import "../globals.css"
import { barlow, fontMono, roboto } from "@/app/fonts"
import { SmoothScroll } from "@/components/motion/smooth-scroll"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

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
