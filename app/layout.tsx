import type { Metadata } from 'next'
import type { Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { PwaAnalyticsListeners } from '@/components/pwa/pwa-analytics-listeners'
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  preload: false,
})

export const metadata: Metadata = {
  title: 'SHALOM Saúde - Cadastro e Adesão',
  description: 'Sistema de cadastro e adesão ao serviço SHALOM Saúde com captura de selfie e termo digital',
  generator: 'v0.app',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SHALOM Saúde',
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#f8fafc',
  viewportFit: 'cover',
  colorScheme: 'light',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}>
        {children}
        <ServiceWorkerRegister />
        <PwaAnalyticsListeners />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
