import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { FarcasterAuthProvider } from "@/components/farcaster-auth-provider"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Snake Game with Rewards",
  description: "A fun snake game with Farcaster authentication and token rewards",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <FarcasterAuthProvider>{children}</FarcasterAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}



import './globals.css'