'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useGameLoop } from '@/lib/game-engine/useGameLoop'

// ===================================
// TYPES
// ===================================
interface Position {
    x: number
    y: number
}

type PlayerMode = 'idle' | 'drawing'
type GameStatus = 'playing' | 'dead' | 'won' | 'paused'

interface GameState {
    status: GameStatus
    score: number
    areaCaptured: number
    level: number
}

// ===================================
// CONSTANTS
// ===================================
const PLAYER_SPEED = 0.15 // pixels per ms
const CANVAS_SIZE = 400
const CELL_SIZE = 4 // Grid cell size for territory tracking
const GRID_CELLS = CANVAS_SIZE / CELL_SIZE
const PLAYER_SIZE = 8
const BORDER_WIDTH = PLAYER_SIZE // Safe border width

// Colors
const NEON_CYAN = '#00ffff'
const NEON_MAGENTA = '#ff00ff'
const NEON_GREEN = '#00ff00'
const NEON_YELLOW = '#ffd700'
const BG_DARK = '#050505'

// ===================================
// HELPER FUNCTIONS
// ===================================
function isOnBorder(x: number, y: number): boolean {
    return (
        x <= BORDER_WIDTH ||
        x >= CANVAS_SIZE - BORDER_WIDTH - PLAYER_SIZE ||
        y <= BORDER_WIDTH ||
        y >= CANVAS_SIZE - BORDER_WIDTH - PLAYER_SIZE
    )
}

function clampToBorder(x: number, y: number, dir: Position): Position {
    // Keep player on the border edges
    let newX = x
    let newY = y

    const minPos = BORDER_WIDTH
    const maxX = CANVAS_SIZE - BORDER_WIDTH - PLAYER_SIZE
    const maxY = CANVAS_SIZE - BORDER_WIDTH - PLAYER_SIZE

    // If on top edge
    if (y <= minPos) {
        newY = minPos
        if (dir.y < 0) return { x: newX, y: newY } // Can't go up more
    }
    // If on bottom edge
    if (y >= maxY) {
        newY = maxY
        if (dir.y > 0) return { x: newX, y: newY } // Can't go down more
    }
    // If on left edge
    if (x <= minPos) {
        newX = minPos
        if (dir.x < 0) return { x: newX, y: newY } // Can't go left more
    }
    // If on right edge
    if (x >= maxX) {
        newX = maxX
        if (dir.x > 0) return { x: newX, y: newY } // Can't go right more
    }

    return { x: newX, y: newY }
}

// ===================================
// COMPONENT
// ===================================
export function GameCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isRunning, setIsRunning] = useState(true)

    // Player state
    const playerPos = useRef<Position>({ x: BORDER_WIDTH, y: BORDER_WIDTH })
    const direction = useRef<Position>({ x: 1, y: 0 }) // Start moving right
    const playerMode = useRef<PlayerMode>('idle')

    // Trail for drawing mode (when entering void)
    const trail = useRef<Position[]>([])

    // Captured territory (grid-based)
    const capturedCells = useRef<Set<string>>(new Set())

    // Game state
    const [gameState, setGameState] = useState<GameState>({
        status: 'playing',
        score: 0,
        areaCaptured: 0,
        level: 1,
    })

    // ===================================
    // INPUT HANDLING
    // ===================================
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Prevent scrolling with arrow keys
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault()
            }

            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    direction.current = { x: 0, y: -1 }
                    break
                case 'ArrowDown':
                case 's':
                case 'S':
                    direction.current = { x: 0, y: 1 }
                    break
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    direction.current = { x: -1, y: 0 }
                    break
                case 'ArrowRight':
                case 'd':
                case 'D':
                    direction.current = { x: 1, y: 0 }
                    break
                case ' ': // Spacebar to enter drawing mode
                    if (playerMode.current === 'idle') {
                        playerMode.current = 'drawing'
                        trail.current = [{ ...playerPos.current }]
                    }
                    break
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    // ===================================
    // GAME LOOP
    // ===================================
    const gameLoop = useCallback((deltaTime: number) => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // --- UPDATE ---
        const speed = PLAYER_SPEED * deltaTime
        let newX = playerPos.current.x + direction.current.x * speed
        let newY = playerPos.current.y + direction.current.y * speed

        // Movement constraints based on mode
        if (playerMode.current === 'idle') {
            // In idle mode: constrain movement to borders only
            const clamped = clampToBorder(newX, newY, direction.current)

            // Only allow movement along the border
            if (isOnBorder(playerPos.current.x, playerPos.current.y)) {
                // Check if new position would still be on border
                const testX = Math.max(BORDER_WIDTH, Math.min(CANVAS_SIZE - BORDER_WIDTH - PLAYER_SIZE, newX))
                const testY = Math.max(BORDER_WIDTH, Math.min(CANVAS_SIZE - BORDER_WIDTH - PLAYER_SIZE, newY))

                if (isOnBorder(testX, testY)) {
                    playerPos.current.x = testX
                    playerPos.current.y = testY
                } else {
                    // Stay on current border edge
                    playerPos.current = clamped
                }
            }
        } else if (playerMode.current === 'drawing') {
            // In drawing mode: can move freely in void but add to trail
            newX = Math.max(BORDER_WIDTH, Math.min(CANVAS_SIZE - BORDER_WIDTH - PLAYER_SIZE, newX))
            newY = Math.max(BORDER_WIDTH, Math.min(CANVAS_SIZE - BORDER_WIDTH - PLAYER_SIZE, newY))

            playerPos.current.x = newX
            playerPos.current.y = newY

            // Add position to trail
            const lastTrailPos = trail.current[trail.current.length - 1]
            const dist = Math.hypot(newX - lastTrailPos.x, newY - lastTrailPos.y)
            if (dist > 4) {
                trail.current.push({ x: newX, y: newY })
            }

            // Check if returned to border (capture area)
            if (isOnBorder(newX, newY) && trail.current.length > 5) {
                // TODO: Implement flood fill capture logic
                // For now, just clear trail and return to idle
                const capturedPoints = trail.current.length
                setGameState(prev => ({
                    ...prev,
                    score: prev.score + capturedPoints * 10,
                    areaCaptured: Math.min(100, prev.areaCaptured + Math.floor(capturedPoints / 5))
                }))
                trail.current = []
                playerMode.current = 'idle'
            }
        }

        // --- RENDER ---
        // Clear canvas
        ctx.fillStyle = BG_DARK
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

        // Draw grid lines (subtle)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'
        ctx.lineWidth = 1
        for (let i = 0; i <= CANVAS_SIZE; i += 20) {
            ctx.beginPath()
            ctx.moveTo(i, 0)
            ctx.lineTo(i, CANVAS_SIZE)
            ctx.stroke()
            ctx.beginPath()
            ctx.moveTo(0, i)
            ctx.lineTo(CANVAS_SIZE, i)
            ctx.stroke()
        }

        // Draw void area (inside the border)
        ctx.fillStyle = 'rgba(5, 5, 15, 1)'
        ctx.fillRect(BORDER_WIDTH, BORDER_WIDTH,
            CANVAS_SIZE - BORDER_WIDTH * 2,
            CANVAS_SIZE - BORDER_WIDTH * 2)

        // Draw border (safe zone) with neon glow
        ctx.strokeStyle = NEON_CYAN
        ctx.lineWidth = BORDER_WIDTH
        ctx.shadowBlur = 15
        ctx.shadowColor = NEON_CYAN
        ctx.strokeRect(
            BORDER_WIDTH / 2,
            BORDER_WIDTH / 2,
            CANVAS_SIZE - BORDER_WIDTH,
            CANVAS_SIZE - BORDER_WIDTH
        )
        ctx.shadowBlur = 0

        // Draw trail (when drawing)
        if (trail.current.length > 1) {
            ctx.strokeStyle = NEON_YELLOW
            ctx.lineWidth = 3
            ctx.shadowBlur = 10
            ctx.shadowColor = NEON_YELLOW
            ctx.beginPath()
            ctx.moveTo(
                trail.current[0].x + PLAYER_SIZE / 2,
                trail.current[0].y + PLAYER_SIZE / 2
            )
            for (let i = 1; i < trail.current.length; i++) {
                ctx.lineTo(
                    trail.current[i].x + PLAYER_SIZE / 2,
                    trail.current[i].y + PLAYER_SIZE / 2
                )
            }
            ctx.stroke()
            ctx.shadowBlur = 0
        }

        // Draw player with neon glow
        const playerColor = playerMode.current === 'drawing' ? NEON_YELLOW : NEON_MAGENTA
        ctx.fillStyle = playerColor
        ctx.shadowBlur = 25
        ctx.shadowColor = playerColor
        ctx.fillRect(
            playerPos.current.x,
            playerPos.current.y,
            PLAYER_SIZE,
            PLAYER_SIZE
        )
        ctx.shadowBlur = 0

        // Draw mode indicator
        if (playerMode.current === 'drawing') {
            ctx.fillStyle = NEON_YELLOW
            ctx.font = '10px monospace'
            ctx.fillText('DRAWING', playerPos.current.x - 10, playerPos.current.y - 5)
        }

    }, [])

    useGameLoop(gameLoop, isRunning)

    // ===================================
    // RENDER
    // ===================================
    return (
        <div className="relative">
            <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className="game-canvas"
                style={{ borderRadius: '4px' }}
            />

            {/* HUD Overlay */}
            <div className="absolute top-2 left-2 hud-container text-xs">
                <div className="flex gap-4">
                    <span>Score: <span className="hud-value">{gameState.score}</span></span>
                    <span>Area: <span className="hud-value">{gameState.areaCaptured}%</span></span>
                    <span>Level: <span className="hud-value">{gameState.level}</span></span>
                </div>
            </div>

            {/* Mode Indicator */}
            <div className="absolute bottom-2 left-2 text-xs text-gray-500">
                <span className="uppercase">
                    {playerMode.current === 'idle' ? '↑↓←→ Move • Space to draw' : 'Drawing...'}
                </span>
            </div>
        </div>
    )
}
