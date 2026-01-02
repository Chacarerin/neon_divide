'use client'

/**
 * CRTEffect Component
 * Applies scanlines, vignette, and noise overlay to create
 * the classic CRT/VHS aesthetic
 */
export function CRTEffect() {
    return (
        <>
            {/* Scanlines */}
            <div className="crt-scanlines" aria-hidden="true" />

            {/* Vignette (dark edges) */}
            <div className="crt-vignette" aria-hidden="true" />

            {/* Subtle noise/static */}
            <div className="crt-noise" aria-hidden="true" />
        </>
    )
}
