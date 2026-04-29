import type { Metadata } from 'next'
import { Work_Sans, Fraunces, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { Toaster } from '@/components/ui/toaster'
import { QueryProvider } from '@/components/query-provider'

const workSans = Work_Sans({
  subsets: ['latin'],
  variable: '--font-work-sans',
  weight: ['400', '500', '700', '900'],
  display: 'swap',
})
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  weight: ['300', '400', '500'],
  style: ['italic', 'normal'],
  display: 'swap',
})
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'BLKOUT CRM',
  description: 'Relationship memory for the cooperative — obsidian + gold + cream',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${workSans.variable} ${fraunces.variable} ${plexMono.variable}`}>
      <body className="min-h-screen antialiased" style={{ fontFamily: 'var(--font-work-sans), system-ui, sans-serif' }}>
        {/* 4px gold rule across the very top — the BLKOUT thread */}
        <div className="h-1 w-full bg-[#d4af37]" />
        <QueryProvider>
          <div className="flex h-[calc(100vh-4px)] overflow-hidden">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
              <Header />
              <main className="flex-1 overflow-y-auto bg-background p-8 md:p-12">
                {children}
              </main>
            </div>
          </div>
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  )
}
