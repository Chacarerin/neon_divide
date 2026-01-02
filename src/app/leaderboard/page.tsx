import Link from 'next/link'

// Placeholder leaderboard data
const mockLeaderboard = [
    { rank: 1, username: 'PLAYER_1', score: 15000 },
    { rank: 2, username: 'NEON_MASTER', score: 12500 },
    { rank: 3, username: 'QIX_LORD', score: 10000 },
    { rank: 4, username: 'CYBER_PUNK', score: 8500 },
    { rank: 5, username: 'ARCADE_PRO', score: 7200 },
]

export default function LeaderboardPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8">
            {/* Header */}
            <div className="mb-8 flex items-center gap-4">
                <Link href="/" className="text-cyan-400 hover:text-cyan-300 text-sm">
                    ← MENU
                </Link>
                <h1 className="text-4xl font-bold text-cyan-400 neon-text crt-rgb-shift">
                    LEADERBOARD
                </h1>
            </div>

            {/* Table */}
            <div className="w-full max-w-md">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-gray-500 text-xs border-b border-cyan-900">
                            <th className="py-2 w-12">RANK</th>
                            <th className="py-2">PLAYER</th>
                            <th className="py-2 text-right">SCORE</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mockLeaderboard.map((entry) => (
                            <tr
                                key={entry.rank}
                                className="border-b border-gray-800 hover:bg-gray-900/50"
                            >
                                <td className="py-3 text-yellow-400">
                                    {entry.rank === 1 ? '👑' : entry.rank}
                                </td>
                                <td className="py-3 text-cyan-400">{entry.username}</td>
                                <td className="py-3 text-right hud-value">
                                    {entry.score.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Note */}
            <p className="mt-8 text-gray-600 text-xs">
                Scores update every 60 seconds
            </p>
        </div>
    )
}
