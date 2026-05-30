import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ateliê Crochet',
  description: 'Gerencie seus projetos de crochê, amigurumi e jacquard',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#d946ef',
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
