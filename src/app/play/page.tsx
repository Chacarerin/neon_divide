import { GameCanvas } from '@/components/game/GameCanvas'
import Link from 'next/link'

export default function PlayPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            {/* Header */}
            <div className="mb-4 flex items-center gap-4">
                <Link href="/" className="text-cyan-400 hover:text-cyan-300 text-sm">
                    ← MENU
                </Link>
                <h1 className="text-2xl font-bold text-cyan-400 neon-text">
                    NEON DIVIDE
                </h1>
            </div>

            {/* Game Canvas */}
            <GameCanvas />

            {/* Instructions */}
            <div className="mt-4 text-gray-500 text-xs text-center">
                <p>WASD or Arrow Keys to move</p>
            </div>
        </div>
    )
}
