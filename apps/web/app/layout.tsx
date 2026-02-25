import type { Metadata } from "next"
import { Figtree } from "next/font/google"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Shell } from "@/components/layout/shell"
import { Providers } from "./providers"
import "./globals.css"

const figtree = Figtree({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "Webify",
  description: "Monitor Shopify stores for price and stock changes",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={figtree.variable}>
      <body className="antialiased">
        <Providers>
          <TooltipProvider>
            <Shell>{children}</Shell>
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  )
}
