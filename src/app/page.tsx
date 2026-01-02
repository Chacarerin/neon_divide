import Link from 'next/link'

export default function Home() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8">
            {/* Title */}
            <h1 className="text-6xl md:text-8xl font-bold text-cyan-400 neon-text crt-rgb-shift mb-4">
                NEON DIVIDE
            </h1>

            <p className="text-xl text-gray-400 mb-12 tracking-widest uppercase">
                Capture Territory • Avoid Enemies • Survive
            </p>

            {/* Menu */}
            <div className="flex flex-col gap-4 w-64">
                <Link href="/play" className="btn-retro text-center">
                    Start Game
                </Link>

                <Link href="/leaderboard" className="btn-retro text-center">
                    Leaderboard
                </Link>
            </div>

            {/* Instructions */}
            <div className="mt-16 text-gray-500 text-sm max-w-md text-center">
                <p className="mb-2">Use WASD or Arrow Keys to move</p>
                <p>Capture 75% of the territory to advance</p>
            </div>

            {/* Version */}
            <p className="absolute bottom-4 right-4 text-gray-600 text-xs">
                v0.1.0 • Fase 1
            </p>
        </div>
    )
}
