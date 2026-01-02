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

interface Enemy {
    x: number
    y: number
    vx: number
    vy: number
    rotation: number  // For 3D cube effect
}

type PlayerState = 'onWall' | 'onStage'
type GameStatus = 'playing' | 'dead' | 'levelComplete' | 'paused' | 'levelAnnounce'

interface GameState {
    status: GameStatus
    score: number
    percentage: number
    level: number
    lives: number
}

// Explosion particle for enemy destruction animation
interface Particle {
    x: number
    y: number
    vx: number
    vy: number
    life: number  // 0-1, decreases over time
    color: string
    size: number
}

// ===================================
// CONSTANTS - Grid-based like reference
// ===================================
const GRID_WIDTH = 84
const GRID_HEIGHT = 48
const PIXEL_SIZE = 12  // Larger cells for better visibility
const CANVAS_WIDTH = GRID_WIDTH * PIXEL_SIZE
const CANVAS_HEIGHT = GRID_HEIGHT * PIXEL_SIZE

// Win condition: player needs to capture 75% (enemy has ≤25% area)
const WIN_PERCENTAGE = 75

// Player and enemy speeds (grid cells per tick)
const PLAYER_SPEED = 1
const ENEMY_SPEED = 1
const GAME_TICK_MS = 32  // ~30 fps for game logic (like reference web worker)

// Play area bounds (matching reference: area inside the initial border)
const PLAY_AREA_LEFT = 13    // Column where play area starts
const PLAY_AREA_TOP = 1      // Row where play area starts  
const PLAY_AREA_RIGHT = 83   // Column where play area ends
const PLAY_AREA_BOTTOM = 47  // Row where play area ends

// Colors - Neon Cyberpunk
const NEON_CYAN = '#00ffff'
const NEON_MAGENTA = '#ff00ff'
const NEON_YELLOW = '#ffd700'
const NEON_GREEN = '#00ff88'
const NEON_RED = '#ff3333'
const NEON_ORANGE = '#ff6600'
const BG_DARK = '#0a0a0f'
const WALL_COLOR = '#00ffff'

// Cell values (matching reference game)
const CELL_EMPTY = 0
const CELL_WALL = 1
const CELL_TRAIL = 2
const CELL_CAPTURED = 1  // Captured area becomes wall

// ===================================
// HELPER FUNCTIONS
// ===================================

// Create initial UI grid (matching reference structure)
function createInitialGrid(): number[] {
    const grid = new Array(GRID_WIDTH * GRID_HEIGHT).fill(CELL_EMPTY)

    // Create border walls around the play area
    // Top border (row 0)
    for (let x = PLAY_AREA_LEFT - 1; x <= PLAY_AREA_RIGHT; x++) {
        grid[x + 0 * GRID_WIDTH] = CELL_WALL
    }

    // Bottom border (row 47)
    for (let x = PLAY_AREA_LEFT - 1; x <= PLAY_AREA_RIGHT; x++) {
        grid[x + (PLAY_AREA_BOTTOM) * GRID_WIDTH] = CELL_WALL
    }

    // Left border (column 12)
    for (let y = 0; y <= PLAY_AREA_BOTTOM; y++) {
        grid[(PLAY_AREA_LEFT - 1) + y * GRID_WIDTH] = CELL_WALL
    }

    // Right border (column 83)
    for (let y = 0; y <= PLAY_AREA_BOTTOM; y++) {
        grid[PLAY_AREA_RIGHT + y * GRID_WIDTH] = CELL_WALL
    }

    return grid
}

// Check if position is valid for play area
function isInPlayArea(x: number, y: number): boolean {
    return x >= PLAY_AREA_LEFT && x < PLAY_AREA_RIGHT &&
        y >= PLAY_AREA_TOP && y < PLAY_AREA_BOTTOM
}

// Check if position is on a wall
function isOnWall(x: number, y: number, grid: number[]): boolean {
    if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return true
    return grid[x + y * GRID_WIDTH] === CELL_WALL
}

// Check if there's wall adjacent to position
function hasAdjacentWall(x: number, y: number, grid: number[]): boolean {
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue
            const nx = x + dx
            const ny = y + dy
            if (nx >= 0 && nx < GRID_WIDTH && ny >= 0 && ny < GRID_HEIGHT) {
                if (grid[nx + ny * GRID_WIDTH] === CELL_WALL) {
                    return true
                }
            }
        }
    }
    return false
}

// Check if a point is adjacent to void (empty space)
function isAdjacentToVoid(x: number, y: number, grid: number[]): boolean {
    // Check 4 neighbors
    const neighbors = [
        { x: x + 1, y: y },
        { x: x - 1, y: y },
        { x: x, y: y + 1 },
        { x: x, y: y - 1 }
    ]

    for (const n of neighbors) {
        // Check bounds
        if (n.x >= 0 && n.x < GRID_WIDTH && n.y >= 0 && n.y < GRID_HEIGHT) {
            // Return true if any neighbor is empty
            if (grid[n.x + n.y * GRID_WIDTH] === CELL_EMPTY) {
                return true
            }
        }
    }
    return false
}

// Flood fill algorithm (matching reference)
function floodFill(startX: number, startY: number, fillValue: number, grid: number[], enemyPositions: { x: number, y: number }[]): number {
    let x = startX
    let y = startY
    let enemyCount = 0

    // Stack-based flood fill for better performance
    const stack: [number, number][] = [[x, y]]
    const visited = new Set<string>()

    while (stack.length > 0) {
        const [cx, cy] = stack.pop()!
        const key = `${cx},${cy}`

        if (visited.has(key)) continue
        visited.add(key)

        if (cx < PLAY_AREA_LEFT || cx >= PLAY_AREA_RIGHT ||
            cy < PLAY_AREA_TOP || cy >= PLAY_AREA_BOTTOM) continue

        const idx = cx + cy * GRID_WIDTH
        if (grid[idx] !== CELL_EMPTY) continue

        grid[idx] = fillValue

        // Check if any enemy is at this position
        for (const enemy of enemyPositions) {
            const ex = Math.floor(enemy.x)
            const ey = Math.floor(enemy.y)
            if (Math.abs(ex - cx) <= 1 && Math.abs(ey - cy) <= 1) {
                enemyCount++
            }
        }

        // Add neighbors to stack
        if (grid[(cx - 1) + cy * GRID_WIDTH] === CELL_EMPTY) stack.push([cx - 1, cy])
        if (grid[(cx + 1) + cy * GRID_WIDTH] === CELL_EMPTY) stack.push([cx + 1, cy])
        if (grid[cx + (cy - 1) * GRID_WIDTH] === CELL_EMPTY) stack.push([cx, cy - 1])
        if (grid[cx + (cy + 1) * GRID_WIDTH] === CELL_EMPTY) stack.push([cx, cy + 1])
    }

    return enemyCount
}

// Calculate percentage of area captured
function calculatePercentage(grid: number[]): number {
    const totalArea = (PLAY_AREA_RIGHT - PLAY_AREA_LEFT) * (PLAY_AREA_BOTTOM - PLAY_AREA_TOP)
    let capturedCount = 0

    for (let y = PLAY_AREA_TOP; y < PLAY_AREA_BOTTOM; y++) {
        for (let x = PLAY_AREA_LEFT; x < PLAY_AREA_RIGHT; x++) {
            if (grid[x + y * GRID_WIDTH] === CELL_WALL) {
                capturedCount++
            }
        }
    }

    return Math.floor((capturedCount / totalArea) * 100)
}


// ===================================
// COMPONENT
// ===================================
export function GameCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isRunning, setIsRunning] = useState(true)

    // Game grid (like reference uiCopy)
    const gridRef = useRef<number[]>(createInitialGrid())

    // Player state (like reference)
    const playerPos = useRef<Position>({ x: 48, y: PLAY_AREA_BOTTOM })  // Start at bottom middle on wall
    const playerSpeed = useRef<Position>({ x: 0, y: 0 })
    const playerState = useRef<PlayerState>('onWall')

    // Input handling
    const pressedKeys = useRef<{ [key: number]: boolean }>({})

    // Enemies (matching reference structure)
    const enemies = useRef<Enemy[]>([
        {
            x: 40 + Math.floor(Math.random() * 20),
            y: 15 + Math.floor(Math.random() * 15),
            vx: Math.random() > 0.5 ? ENEMY_SPEED : -ENEMY_SPEED,
            vy: Math.random() > 0.5 ? ENEMY_SPEED : -ENEMY_SPEED,
            rotation: 0
        }
    ])

    // Explosion particles for enemy destruction
    const particles = useRef<Particle[]>([])

    // Game state
    const [gameState, setGameState] = useState<GameState>({
        status: 'playing',
        percentage: 0,
        score: 0,
        level: 1,
        lives: 3
    })

    // Tick counter for enemy movement
    const tickCount = useRef(0)

    const handlePlayerDeath = useCallback(() => {
        setGameState(prev => {
            const newLives = prev.lives - 1
            if (newLives < 0) {
                return { ...prev, status: 'dead' }
            }

            // Reset for next life (keep score and level)
            gridRef.current = createInitialGrid()
            playerPos.current = { x: 48, y: PLAY_AREA_BOTTOM }
            playerSpeed.current = { x: 0, y: 0 }
            playerState.current = 'onWall'

            enemies.current.forEach(enemy => {
                enemy.x = PLAY_AREA_LEFT + 10 + Math.floor(Math.random() * (PLAY_AREA_RIGHT - PLAY_AREA_LEFT - 20))
                enemy.y = PLAY_AREA_TOP + 5 + Math.floor(Math.random() * (PLAY_AREA_BOTTOM - PLAY_AREA_TOP - 10))
                enemy.vx = Math.random() > 0.5 ? ENEMY_SPEED : -ENEMY_SPEED
                enemy.vy = Math.random() > 0.5 ? ENEMY_SPEED : -ENEMY_SPEED
            })

            return {
                ...prev,
                lives: newLives,
                percentage: 0,  // Reset progress on death
                status: 'playing'
            }
        })
    }, [])

    // Reset game / level
    const resetStage = useCallback(() => {
        // Reset grid to initial state
        gridRef.current = createInitialGrid()

        // Reset player
        playerPos.current = { x: 48, y: PLAY_AREA_BOTTOM }
        playerSpeed.current = { x: 0, y: 0 }
        playerState.current = 'onWall'

        // Reset enemies to random positions
        enemies.current.forEach(enemy => {
            enemy.x = PLAY_AREA_LEFT + 10 + Math.floor(Math.random() * (PLAY_AREA_RIGHT - PLAY_AREA_LEFT - 20))
            enemy.y = PLAY_AREA_TOP + 5 + Math.floor(Math.random() * (PLAY_AREA_BOTTOM - PLAY_AREA_TOP - 10))
            enemy.vx = Math.random() > 0.5 ? ENEMY_SPEED : -ENEMY_SPEED
            enemy.vy = Math.random() > 0.5 ? ENEMY_SPEED : -ENEMY_SPEED
        })

        setGameState(prev => ({
            ...prev,
            status: 'playing',
            percentage: 0
        }))
    }, [])

    const advanceLevel = useCallback(() => {
        // Show level announcement first
        setGameState(prev => ({
            ...prev,
            status: 'levelAnnounce',
            level: prev.level + 1,
            score: prev.score + 1000  // Bonus for completing level
        }))

        // After 2 seconds, start the new level
        setTimeout(() => {
            // Reset grid
            gridRef.current = createInitialGrid()

            // Reset player
            playerPos.current = { x: 48, y: PLAY_AREA_BOTTOM }
            playerSpeed.current = { x: 0, y: 0 }
            playerState.current = 'onWall'

            // Add a new enemy
            enemies.current.push({
                x: PLAY_AREA_LEFT + 10 + Math.floor(Math.random() * (PLAY_AREA_RIGHT - PLAY_AREA_LEFT - 20)),
                y: PLAY_AREA_TOP + 5 + Math.floor(Math.random() * (PLAY_AREA_BOTTOM - PLAY_AREA_TOP - 10)),
                vx: Math.random() > 0.5 ? ENEMY_SPEED : -ENEMY_SPEED,
                vy: Math.random() > 0.5 ? ENEMY_SPEED : -ENEMY_SPEED,
                rotation: 0
            })

            // Reset enemy positions
            enemies.current.forEach(enemy => {
                enemy.x = PLAY_AREA_LEFT + 10 + Math.floor(Math.random() * (PLAY_AREA_RIGHT - PLAY_AREA_LEFT - 20))
                enemy.y = PLAY_AREA_TOP + 5 + Math.floor(Math.random() * (PLAY_AREA_BOTTOM - PLAY_AREA_TOP - 10))
                enemy.vx = Math.random() > 0.5 ? ENEMY_SPEED : -ENEMY_SPEED
                enemy.vy = Math.random() > 0.5 ? ENEMY_SPEED : -ENEMY_SPEED
            })

            setGameState(prev => ({
                ...prev,
                status: 'playing',
                percentage: 0
            }))
        }, 2000)
    }, [])

    const resetGame = useCallback(() => {
        gridRef.current = createInitialGrid()
        playerPos.current = { x: 48, y: PLAY_AREA_BOTTOM }
        playerSpeed.current = { x: 0, y: 0 }
        playerState.current = 'onWall'
        enemies.current = [{
            x: 40 + Math.floor(Math.random() * 20),
            y: 15 + Math.floor(Math.random() * 15),
            vx: Math.random() > 0.5 ? ENEMY_SPEED : -ENEMY_SPEED,
            vy: Math.random() > 0.5 ? ENEMY_SPEED : -ENEMY_SPEED,
            rotation: 0
        }]
        setGameState({
            status: 'playing',
            percentage: 0,
            score: 0,
            level: 1,
            lives: 3
        })
    }, [])

    // ===================================
    // INPUT HANDLING (matching reference)
    // ===================================
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            pressedKeys.current[e.keyCode] = true

            // Prevent scrolling
            if ([37, 38, 39, 40, 32, 87, 65, 83, 68].includes(e.keyCode)) {
                e.preventDefault()
            }

            // Restart on R
            if (e.key === 'r' || e.key === 'R') {
                if (gameState.status === 'dead') {
                    resetGame()
                }
            }
        }

        const handleKeyUp = (e: KeyboardEvent) => {
            pressedKeys.current[e.keyCode] = false
        }

        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)

        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
        }
    }, [gameState.status, resetGame])

    // ===================================
    // GAME LOOP
    // ===================================
    const gameLoop = useCallback((deltaTime: number) => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        if (gameState.status !== 'playing') {
            renderGame(ctx)
            return
        }

        tickCount.current++
        const grid = gridRef.current

        // --- PLAYER INPUT ---
        // Allow input only when on wall (committed movement)
        // Input is processed below - no need to stop at junctions anymore

        // Process keyboard input (Arrow keys and numpad like reference)
        // Left: 37, Numpad4: 100
        // Process keyboard input (Arrow keys and numpad like reference)
        // Only allow changing direction if on wall (committed movement)

        // Left: 37, Numpad4: 100
        if (pressedKeys.current[37] || pressedKeys.current[65]) {
            if (playerState.current === 'onWall') {
                playerSpeed.current = { x: -PLAYER_SPEED, y: 0 }
            }
        }
        // Right: 39, Numpad6: 102
        if (pressedKeys.current[39] || pressedKeys.current[68]) {
            if (playerState.current === 'onWall') {
                playerSpeed.current = { x: PLAYER_SPEED, y: 0 }
            }
        }
        // Up: 38, Numpad8: 104
        if (pressedKeys.current[38] || pressedKeys.current[87]) {
            if (playerState.current === 'onWall') {
                playerSpeed.current = { x: 0, y: -PLAYER_SPEED }
            }
        }
        // Down: 40, Numpad2: 98
        if (pressedKeys.current[40] || pressedKeys.current[83]) {
            if (playerState.current === 'onWall') {
                playerSpeed.current = { x: 0, y: PLAYER_SPEED }
            }
        }

        // --- UPDATE ENEMIES (every other tick like reference) ---
        if (tickCount.current % 2 === 0) {
            for (const enemy of enemies.current) {
                const ex = Math.floor(enemy.x)
                const ey = Math.floor(enemy.y)

                // Check if enemy hits trail - GAME OVER
                if (grid[ex + ey * GRID_WIDTH] === CELL_TRAIL) {
                    handlePlayerDeath()
                    return
                }

                // Bounce on walls (horizontal)
                const nextX = ex + enemy.vx
                if (grid[nextX + ey * GRID_WIDTH] === CELL_WALL) {
                    enemy.vx = -enemy.vx
                }

                // Bounce on walls (vertical)
                const nextY = ey + enemy.vy
                if (grid[ex + nextY * GRID_WIDTH] === CELL_WALL) {
                    enemy.vy = -enemy.vy
                }

                // Move enemy
                enemy.x += enemy.vx
                enemy.y += enemy.vy

                // Rotate the cube (for 3D effect)
                enemy.rotation += 0.08

                // Clamp to play area
                if (enemy.x < PLAY_AREA_LEFT) {
                    enemy.x = PLAY_AREA_LEFT
                    enemy.vx = Math.abs(enemy.vx)
                }
                if (enemy.x >= PLAY_AREA_RIGHT - 1) {
                    enemy.x = PLAY_AREA_RIGHT - 2
                    enemy.vx = -Math.abs(enemy.vx)
                }
                if (enemy.y < PLAY_AREA_TOP) {
                    enemy.y = PLAY_AREA_TOP
                    enemy.vy = Math.abs(enemy.vy)
                }
                if (enemy.y >= PLAY_AREA_BOTTOM - 1) {
                    enemy.y = PLAY_AREA_BOTTOM - 2
                    enemy.vy = -Math.abs(enemy.vy)
                }
            }
        }

        // --- WALL HIT DETECTION ---
        const px = Math.floor(playerPos.current.x)
        const py = Math.floor(playerPos.current.y)
        const nextPx = Math.floor(playerPos.current.x + playerSpeed.current.x)
        const nextPy = Math.floor(playerPos.current.y + playerSpeed.current.y)
        const nextCell = grid[nextPx + nextPy * GRID_WIDTH]

        // When on wall:
        // - If next cell is wall -> continue sliding on wall
        // - If next cell is empty -> entering void (will become onStage)
        // - If next cell is out of bounds -> stop
        if (playerState.current === 'onWall') {
            // Check bounds
            if (nextPx < PLAY_AREA_LEFT - 1 || nextPx > PLAY_AREA_RIGHT ||
                nextPy < 0 || nextPy > PLAY_AREA_BOTTOM) {
                playerSpeed.current = { x: 0, y: 0 }
            } else if (nextCell === CELL_WALL) {
                // Moving along wall - MUST be coastline (adjacent to void)
                if (!isAdjacentToVoid(nextPx, nextPy, grid)) {
                    playerSpeed.current = { x: 0, y: 0 }
                }
            }
            // Note: If moving into empty, will enter void below.
        } else {
            // onStage: Check if hit wall in next position
            if (nextCell === CELL_WALL) {
                playerSpeed.current = { x: 0, y: 0 }
            }
        }

        // Check if hit own trail - GAME OVER
        if (playerState.current === 'onStage') {
            if (nextCell === CELL_TRAIL) {
                handlePlayerDeath()
                return
            }
        }

        // Move player
        playerPos.current.x += playerSpeed.current.x
        playerPos.current.y += playerSpeed.current.y

        // Clamp position
        playerPos.current.x = Math.max(PLAY_AREA_LEFT - 1, Math.min(PLAY_AREA_RIGHT, playerPos.current.x))
        playerPos.current.y = Math.max(0, Math.min(PLAY_AREA_BOTTOM, playerPos.current.y))

        // --- STATE TRANSITIONS ---
        const currentPx = Math.floor(playerPos.current.x)
        const currentPy = Math.floor(playerPos.current.y)

        // Detect wall around player
        let wallDetected = false
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const checkX = currentPx + dx
                const checkY = currentPy + dy
                if (checkX >= 0 && checkX < GRID_WIDTH && checkY >= 0 && checkY < GRID_HEIGHT) {
                    if (grid[checkX + checkY * GRID_WIDTH] === CELL_WALL) {
                        wallDetected = true
                    }
                }
            }
        }

        if (playerState.current === 'onStage') {
            // Leave trail behind
            grid[currentPx + currentPy * GRID_WIDTH] = CELL_TRAIL
            const prevX = Math.floor(playerPos.current.x - playerSpeed.current.x)
            const prevY = Math.floor(playerPos.current.y - playerSpeed.current.y)
            if (prevX >= 0 && prevX < GRID_WIDTH && prevY >= 0 && prevY < GRID_HEIGHT) {
                grid[prevX + prevY * GRID_WIDTH] = CELL_TRAIL
            }

            if (wallDetected) {
                // Just touched wall - CAPTURE!
                // Find start points for flood fill (perpendicular to movement)
                let X1: number, X2: number, Y1: number, Y2: number

                if (playerSpeed.current.x !== 0) {
                    // Moving horizontally
                    Y1 = currentPy - 1
                    Y2 = currentPy + 1
                    X1 = currentPx
                    X2 = currentPx
                } else {
                    // Moving vertically
                    X1 = currentPx - 1
                    X2 = currentPx + 1
                    Y1 = currentPy
                    Y2 = currentPy
                }

                // Create copy of grid for flood fill
                const gridCopy = [...grid]

                // Get enemy positions
                const enemyPositions = enemies.current.map(e => ({ x: e.x, y: e.y }))

                // Flood fill both sides
                const fill1 = floodFill(X1, Y1, 5, gridCopy, enemyPositions)
                const fill2 = floodFill(X2, Y2, 6, gridCopy, enemyPositions)

                // Determine which side to fill (the one with fewer/no enemies)
                let fillThisValue: number
                let doNotFillThisValue: number

                if (fill1 >= fill2) {
                    fillThisValue = 6
                    doNotFillThisValue = 5
                } else {
                    fillThisValue = 5
                    doNotFillThisValue = 6
                }

                // Apply the fill to actual grid
                let areaCaptured = 0
                for (let y = 0; y < GRID_HEIGHT; y++) {
                    for (let x = 0; x < GRID_WIDTH; x++) {
                        const idx = x + y * GRID_WIDTH
                        if (grid[idx] === CELL_TRAIL) {
                            grid[idx] = CELL_WALL
                        } else if (gridCopy[idx] === fillThisValue) {
                            grid[idx] = CELL_WALL
                            areaCaptured++
                        } else if (gridCopy[idx] === doNotFillThisValue) {
                            grid[idx] = CELL_EMPTY
                        }
                    }
                }

                // Make sure current position is on wall
                grid[currentPx + currentPy * GRID_WIDTH] = CELL_WALL

                // Check for enemies caught in the filled area and destroy them
                let destroyedCount = 0
                const survivingEnemies: Enemy[] = []

                for (const enemy of enemies.current) {
                    const ex = Math.floor(enemy.x)
                    const ey = Math.floor(enemy.y)

                    // Check if enemy is now in a wall cell (captured)
                    if (grid[ex + ey * GRID_WIDTH] === CELL_WALL) {
                        // Enemy destroyed! Spawn explosion particles
                        destroyedCount++
                        const numParticles = 20
                        for (let i = 0; i < numParticles; i++) {
                            const angle = (Math.PI * 2 * i) / numParticles + Math.random() * 0.5
                            const speed = 2 + Math.random() * 3
                            particles.current.push({
                                x: enemy.x * PIXEL_SIZE + PIXEL_SIZE / 2,
                                y: enemy.y * PIXEL_SIZE + PIXEL_SIZE / 2,
                                vx: Math.cos(angle) * speed,
                                vy: Math.sin(angle) * speed,
                                life: 1,
                                color: i % 2 === 0 ? NEON_GREEN : '#00ffaa',
                                size: 4 + Math.random() * 4
                            })
                        }
                    } else {
                        survivingEnemies.push(enemy)
                    }
                }

                // Update enemies array with survivors only
                if (destroyedCount > 0) {
                    enemies.current = survivingEnemies
                }

                // Calculate and update percentage
                const newPercentage = calculatePercentage(grid)

                setGameState(prev => ({
                    ...prev,
                    percentage: newPercentage,
                    score: prev.score + areaCaptured * 10 + destroyedCount * 500  // Bonus for destroying enemies!
                }))

                // Check for level complete (WIN_PERCENTAGE captured)
                if (newPercentage >= WIN_PERCENTAGE) {
                    advanceLevel()
                    return
                }

                // Sidestep to clear position if stuck
                if (grid[currentPx + currentPy * GRID_WIDTH] === CELL_WALL) {
                    if (playerSpeed.current.x !== 0) {
                        if (grid[currentPx + (currentPy - 1) * GRID_WIDTH] === CELL_EMPTY) {
                            playerPos.current.y -= 1
                        } else if (grid[currentPx + (currentPy + 1) * GRID_WIDTH] === CELL_EMPTY) {
                            playerPos.current.y += 1
                        }
                    }
                    if (playerSpeed.current.y !== 0) {
                        if (grid[(currentPx - 1) + currentPy * GRID_WIDTH] === CELL_EMPTY) {
                            playerPos.current.x -= 1
                        } else if (grid[(currentPx + 1) + currentPy * GRID_WIDTH] === CELL_EMPTY) {
                            playerPos.current.x += 1
                        }
                    }
                }

                playerState.current = 'onWall'
            }
        } else {
            // onWall state
            if (!wallDetected && (playerSpeed.current.x !== 0 || playerSpeed.current.y !== 0)) {
                // Leaving wall - mark start of trail
                const prevX = Math.floor(playerPos.current.x - playerSpeed.current.x)
                const prevY = Math.floor(playerPos.current.y - playerSpeed.current.y)
                if (prevX >= 0 && prevX < GRID_WIDTH && prevY >= 0 && prevY < GRID_HEIGHT) {
                    grid[prevX + prevY * GRID_WIDTH] = CELL_TRAIL
                }
                playerState.current = 'onStage'
            }
        }

        // --- RENDER ---
        renderGame(ctx)

    }, [gameState.status, resetStage, advanceLevel])

    // ===================================
    // RENDER
    // ===================================
    const renderGame = useCallback((ctx: CanvasRenderingContext2D) => {
        const grid = gridRef.current

        // Clear canvas
        ctx.fillStyle = BG_DARK
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

        // Draw grid cells
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                const cell = grid[x + y * GRID_WIDTH]
                const px = x * PIXEL_SIZE
                const py = y * PIXEL_SIZE

                if (cell === CELL_WALL) {
                    // Wall/captured area with glow
                    ctx.fillStyle = WALL_COLOR
                    ctx.shadowBlur = 3
                    ctx.shadowColor = WALL_COLOR
                    ctx.fillRect(px, py, PIXEL_SIZE - 1, PIXEL_SIZE - 1)
                    ctx.shadowBlur = 0
                } else if (cell === CELL_TRAIL) {
                    // Trail (player line)
                    ctx.fillStyle = NEON_YELLOW
                    ctx.shadowBlur = 8
                    ctx.shadowColor = NEON_YELLOW
                    ctx.fillRect(px, py, PIXEL_SIZE - 1, PIXEL_SIZE - 1)
                    ctx.shadowBlur = 0
                } else if (cell === CELL_EMPTY && isInPlayArea(x, y)) {
                    // Empty play area (void)
                    ctx.fillStyle = 'rgba(10, 5, 20, 0.8)'
                    ctx.fillRect(px, py, PIXEL_SIZE - 1, PIXEL_SIZE - 1)
                }
            }
        }

        // Draw enemies as 3D rotating cubes
        for (const enemy of enemies.current) {
            const ex = Math.floor(enemy.x) * PIXEL_SIZE + PIXEL_SIZE / 2
            const ey = Math.floor(enemy.y) * PIXEL_SIZE + PIXEL_SIZE / 2
            const cubeSize = PIXEL_SIZE * 1.2
            const rotation = enemy.rotation

            ctx.save()
            ctx.translate(ex, ey)
            ctx.rotate(rotation)

            // 3D cube effect with multiple faces
            const offset = cubeSize * 0.3  // 3D depth offset

            // Back face (darker)
            ctx.fillStyle = '#004422'
            ctx.shadowBlur = 0
            ctx.fillRect(-cubeSize / 2 + offset, -cubeSize / 2 - offset, cubeSize, cubeSize)

            // Side face (medium)
            ctx.fillStyle = '#006644'
            ctx.beginPath()
            ctx.moveTo(cubeSize / 2, -cubeSize / 2)
            ctx.lineTo(cubeSize / 2 + offset, -cubeSize / 2 - offset)
            ctx.lineTo(cubeSize / 2 + offset, cubeSize / 2 - offset)
            ctx.lineTo(cubeSize / 2, cubeSize / 2)
            ctx.closePath()
            ctx.fill()

            // Top face (lighter)
            ctx.fillStyle = '#00aa66'
            ctx.beginPath()
            ctx.moveTo(-cubeSize / 2, -cubeSize / 2)
            ctx.lineTo(-cubeSize / 2 + offset, -cubeSize / 2 - offset)
            ctx.lineTo(cubeSize / 2 + offset, -cubeSize / 2 - offset)
            ctx.lineTo(cubeSize / 2, -cubeSize / 2)
            ctx.closePath()
            ctx.fill()

            // Front face with glow
            ctx.fillStyle = NEON_GREEN
            ctx.shadowBlur = 20
            ctx.shadowColor = NEON_GREEN
            ctx.fillRect(-cubeSize / 2, -cubeSize / 2, cubeSize, cubeSize)

            // Inner pattern (circuit-like)
            ctx.strokeStyle = '#00ffaa'
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.moveTo(-cubeSize / 4, 0)
            ctx.lineTo(cubeSize / 4, 0)
            ctx.moveTo(0, -cubeSize / 4)
            ctx.lineTo(0, cubeSize / 4)
            ctx.stroke()

            ctx.restore()
            ctx.shadowBlur = 0
        }

        // Update and draw explosion particles
        const aliveParticles: Particle[] = []
        for (const p of particles.current) {
            // Update particle physics
            p.x += p.vx
            p.y += p.vy
            p.vy += 0.1  // Gravity
            p.life -= 0.02  // Fade out
            p.size *= 0.98  // Shrink

            if (p.life > 0) {
                aliveParticles.push(p)

                // Draw particle with glow
                ctx.beginPath()
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
                ctx.fillStyle = p.color
                ctx.globalAlpha = p.life
                ctx.shadowBlur = 10
                ctx.shadowColor = p.color
                ctx.fill()
                ctx.globalAlpha = 1
                ctx.shadowBlur = 0
            }
        }
        particles.current = aliveParticles

        // Draw player as glowing energy orb
        const px = Math.floor(playerPos.current.x) * PIXEL_SIZE + PIXEL_SIZE / 2
        const py = Math.floor(playerPos.current.y) * PIXEL_SIZE + PIXEL_SIZE / 2
        const playerColor = playerState.current === 'onStage' ? NEON_YELLOW : NEON_MAGENTA
        const orbRadius = PIXEL_SIZE * 0.8

        // Outer glow rings
        ctx.beginPath()
        ctx.arc(px, py, orbRadius * 1.5, 0, Math.PI * 2)
        ctx.strokeStyle = playerColor
        ctx.lineWidth = 2
        ctx.globalAlpha = 0.3
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(px, py, orbRadius * 1.2, 0, Math.PI * 2)
        ctx.globalAlpha = 0.5
        ctx.stroke()
        ctx.globalAlpha = 1

        // Main orb with radial gradient
        const gradient = ctx.createRadialGradient(px - orbRadius * 0.3, py - orbRadius * 0.3, 0, px, py, orbRadius)
        gradient.addColorStop(0, '#ffffff')
        gradient.addColorStop(0.3, playerColor)
        gradient.addColorStop(1, playerState.current === 'onStage' ? '#aa8800' : '#880088')

        ctx.beginPath()
        ctx.arc(px, py, orbRadius, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.shadowBlur = 25
        ctx.shadowColor = playerColor
        ctx.fill()

        // Direction indicator (small arrow showing movement)
        if (playerSpeed.current.x !== 0 || playerSpeed.current.y !== 0) {
            const arrowLen = orbRadius * 0.8
            const angle = Math.atan2(playerSpeed.current.y, playerSpeed.current.x)
            ctx.beginPath()
            ctx.moveTo(px + Math.cos(angle) * orbRadius, py + Math.sin(angle) * orbRadius)
            ctx.lineTo(px + Math.cos(angle) * (orbRadius + arrowLen), py + Math.sin(angle) * (orbRadius + arrowLen))
            ctx.strokeStyle = '#ffffff'
            ctx.lineWidth = 3
            ctx.stroke()
        }
        ctx.shadowBlur = 0

        // Draw HUD text on canvas
        ctx.fillStyle = NEON_CYAN
        ctx.shadowBlur = 5
        ctx.shadowColor = NEON_CYAN
        ctx.font = 'bold 16px "Press Start 2P", monospace'
        ctx.fillText(`${gameState.percentage}%`, 10, 30)
        ctx.fillText(`LVL ${gameState.level}`, 10, 55)
        ctx.fillText(`PTS ${gameState.score}`, 10, 80)
        ctx.fillStyle = NEON_MAGENTA
        ctx.fillText(`LIVES ${gameState.lives}`, 10, 105)
        ctx.shadowBlur = 0

        // Draw progress bar
        const barWidth = 100
        const barHeight = 12
        const barX = 10
        const barY = 115
        const progress = Math.min(gameState.percentage / WIN_PERCENTAGE, 1)

        ctx.strokeStyle = NEON_CYAN
        ctx.lineWidth = 2
        ctx.strokeRect(barX, barY, barWidth, barHeight)

        ctx.fillStyle = gameState.percentage >= WIN_PERCENTAGE ? NEON_GREEN : NEON_CYAN
        ctx.fillRect(barX + 2, barY + 2, (barWidth - 4) * progress, barHeight - 4)

        // Game over overlay
        if (gameState.status === 'dead') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

            ctx.fillStyle = NEON_RED
            ctx.shadowBlur = 30
            ctx.shadowColor = NEON_RED
            ctx.font = 'bold 48px "Press Start 2P", monospace'
            ctx.textAlign = 'center'
            ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40)

            ctx.fillStyle = NEON_CYAN
            ctx.shadowColor = NEON_CYAN
            ctx.font = '20px monospace'
            ctx.fillText(`Score: ${gameState.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30)
            ctx.fillText(`Level: ${gameState.level}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60)
            ctx.fillStyle = NEON_YELLOW
            ctx.fillText('Press R to restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 110)
            ctx.textAlign = 'left'
            ctx.shadowBlur = 0
        }

        // Level announcement overlay
        if (gameState.status === 'levelAnnounce') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

            ctx.fillStyle = NEON_GREEN
            ctx.shadowBlur = 40
            ctx.shadowColor = NEON_GREEN
            ctx.font = 'bold 56px "Press Start 2P", monospace'
            ctx.textAlign = 'center'
            ctx.fillText(`LEVEL ${gameState.level}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20)

            ctx.fillStyle = NEON_CYAN
            ctx.shadowColor = NEON_CYAN
            ctx.font = '24px monospace'
            ctx.fillText('GET READY!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40)
            ctx.textAlign = 'left'
            ctx.shadowBlur = 0
        }

    }, [gameState])

    // Use game loop with fixed time step
    useGameLoop(gameLoop, isRunning)

    // ===================================
    // RENDER
    // ===================================
    return (
        <div className="relative flex flex-col items-center">
            <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="game-canvas"
                style={{
                    borderRadius: '8px',
                    imageRendering: 'pixelated'
                }}
            />

            {/* Controls hint */}
            <div className="mt-4 text-center text-xs text-gray-500">
                <span className="uppercase">
                    {gameState.status === 'dead'
                        ? 'GAME OVER - Press R to restart'
                        : playerState.current === 'onWall'
                            ? '↑↓←→ or WASD to move • Enter void to capture'
                            : 'Drawing... reach wall to capture!'}
                </span>
            </div>

            {/* Mobile controls */}
            <div className="mt-4 grid grid-cols-3 gap-2 md:hidden">
                <div></div>
                <button
                    className="touch-control"
                    onTouchStart={() => pressedKeys.current[38] = true}
                    onTouchEnd={() => pressedKeys.current[38] = false}
                >
                    ↑
                </button>
                <div></div>
                <button
                    className="touch-control"
                    onTouchStart={() => pressedKeys.current[37] = true}
                    onTouchEnd={() => pressedKeys.current[37] = false}
                >
                    ←
                </button>
                <button
                    className="touch-control"
                    onTouchStart={() => pressedKeys.current[40] = true}
                    onTouchEnd={() => pressedKeys.current[40] = false}
                >
                    ↓
                </button>
                <button
                    className="touch-control"
                    onTouchStart={() => pressedKeys.current[39] = true}
                    onTouchEnd={() => pressedKeys.current[39] = false}
                >
                    →
                </button>
            </div>
        </div>
    )
}
