import type { Metadata, Viewport } from 'next'
import './globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#1a1a2e',
}

export const metadata: Metadata = {
  title: {
    default: 'West Analyze - AI Destekli Bahis Analiz Platformu',
    template: '%s | West Analyze',
  },
  description: 'Yapay zeka destekli profesyonel bahis analiz platformu. Altın kurallar, canlı skor takibi ve yüksek güvenilirlikli tahminler.',
  keywords: ['bahis analiz', 'AI tahmin', 'maç analizi', 'canlı skor', 'bahis tahmin', 'west analyze'],
  authors: [{ name: 'WestBetPro' }],
  creator: 'WestBetPro',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: 'https://westbetpro.vercel.app',
    siteName: 'West Analyze',
    title: 'West Analyze - AI Destekli Bahis Analiz Platformu',
    description: 'Yapay zeka destekli profesyonel bahis analiz platformu. Altın kurallar ve yüksek güvenilirlikli tahminler.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'West Analyze - AI Destekli Bahis Analiz',
    description: 'Yapay zeka destekli profesyonel bahis analiz platformu.',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Rye&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons+Round"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="overflow-x-hidden">{children}</body>
    </html>
  )
}
