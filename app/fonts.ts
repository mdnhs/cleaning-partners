import localFont from "next/font/local"

// Self-hosted (latin subset, from @fontsource): the build never reaches out
// to Google Fonts, so a network blip can no longer fail the Docker build.

export const roboto = localFont({
  src: [
    { path: "./fonts-files/roboto-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts-files/roboto-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "./fonts-files/roboto-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts-files/roboto-latin-500-italic.woff2", weight: "500", style: "italic" },
  ],
  variable: "--font-sans",
})

export const barlow = localFont({
  src: [
    { path: "./fonts-files/barlow-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts-files/barlow-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts-files/barlow-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts-files/barlow-latin-800-normal.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-heading",
})

export const fontMono = localFont({
  src: [
    { path: "./fonts-files/geist-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts-files/geist-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts-files/geist-mono-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-mono",
})

export const jakarta = localFont({
  src: [
    { path: "./fonts-files/plus-jakarta-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts-files/plus-jakarta-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts-files/plus-jakarta-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts-files/plus-jakarta-sans-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-jakarta",
  display: "swap",
})

export const adminMono = localFont({
  src: [
    { path: "./fonts-files/geist-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts-files/geist-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts-files/geist-mono-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-geist-mono",
  display: "swap",
})
