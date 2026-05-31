import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ateliê Crochet',
  description: 'Gerencie seus projetos de crochê, amigurumi e jacquard',
  icons: {
    icon: '/api/icon',
    apple: '/api/icon',
    shortcut: '/api/icon',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1A2A4A',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[#faf5f0] antialiased">
        <main className="pb-20">
          {children}
        </main>
      </body>
    </html>
  )
}
