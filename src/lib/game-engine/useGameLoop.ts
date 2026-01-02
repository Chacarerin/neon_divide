'use client'

import { useEffect, useRef, useCallback } from 'react'

type GameLoopCallback = (deltaTime: number) => void

/**
 * Custom hook for game loop using requestAnimationFrame
 * Returns deltaTime in milliseconds for frame-independent movement
 */
export function useGameLoop(callback: GameLoopCallback, isRunning: boolean = true) {
    const requestRef = useRef<number>()
    const previousTimeRef = useRef<number>()
    const callbackRef = useRef<GameLoopCallback>(callback)

    // Keep callback ref updated
    useEffect(() => {
        callbackRef.current = callback
    }, [callback])

    const animate = useCallback((time: number) => {
        if (previousTimeRef.current !== undefined) {
            const deltaTime = time - previousTimeRef.current
            callbackRef.current(deltaTime)
        }
        previousTimeRef.current = time
        requestRef.current = requestAnimationFrame(animate)
    }, [])

    useEffect(() => {
        if (isRunning) {
            requestRef.current = requestAnimationFrame(animate)
        }

        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current)
            }
        }
    }, [isRunning, animate])
}
