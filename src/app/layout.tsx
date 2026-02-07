import type { Metadata, Viewport } from 'next'
import './globals.css'
import NavigationLoader from '@/ui/components/NavigationLoader'
import PageTransition from '@/ui/components/PageTransition'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#0A0D0B',
}

export const metadata: Metadata = {
  title: {
    default: 'West Analyze - AI Destekli Bahis Analiz Platformu',
    template: '%s | West Analyze',
  },
  description: 'Yapay zeka destekli profesyonel bahis analiz platformu. Altin kurallar, canli skor takibi ve yuksek guvenilirlikli tahminler.',
  keywords: ['bahis analiz', 'AI tahmin', 'mac analizi', 'canli skor', 'bahis tahmin', 'west analyze'],
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
    description: 'Yapay zeka destekli profesyonel bahis analiz platformu. Altin kurallar ve yuksek guvenilirlikli tahminler.',
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
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'West Analyze',
  },
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
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="overflow-x-hidden env-safe">
        <NavigationLoader />
        <PageTransition>
          {children}
        </PageTransition>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(reg) { console.log('SW registered:', reg.scope); })
                    .catch(function(err) { console.warn('SW failed:', err); });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
