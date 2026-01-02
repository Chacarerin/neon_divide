import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { CRTEffect } from '@/components/ui/CRTEffect'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Neon Divide',
    description: 'Modern arcade game with Cyberpunk/VHS aesthetics',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <CRTEffect />
                <main className="relative z-10">
                    {children}
                </main>
            </body>
        </html>
    )
}
