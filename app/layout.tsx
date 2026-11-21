import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { SupabaseProvider } from '@/components/supabase-provider'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/env'
import './globals.css'

export const dynamic = 'force-dynamic'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'contribmatch — Find open-source issues you can solve',
  description: 'Discover open-source GitHub issues matched to your skills, goals, and machine.',
  icons: { icon: '/icon.svg' },
}

export const viewport: Viewport = { colorScheme: 'light', themeColor: '#f8fafc', userScalable: false }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabaseUrl = getSupabaseUrl()
  const supabasePublishableKey = getSupabaseAnonKey()
  return (
    <html lang="en" className="bg-background">
      <body className={`${geist.variable} ${geistMono.variable} antialiased`}>
        <SupabaseProvider url={supabaseUrl} publishableKey={supabasePublishableKey}>
          {children}
        </SupabaseProvider>
        {process.env.VERCEL && <Analytics />}
      </body>
    </html>
  )
}
