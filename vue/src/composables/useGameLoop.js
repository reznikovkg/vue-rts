import {onMounted, onUnmounted} from 'vue'

const MAX_FRAME_SECONDS = 0.1

export function useGameLoop(onFrame) {
    let frameRequestId = null
    let previousTime = null

    function runFrame(time) {
        if (previousTime !== null) {
            const deltaSeconds = Math.min(
                (time - previousTime) / 1000,
                MAX_FRAME_SECONDS

            )
            onFrame(deltaSeconds)
        }
        previousTime = time
        frameRequestId = requestAnimationFrame(runFrame)
    }

    onMounted(() => {
        frameRequestId = requestAnimationFrame(runFrame)
    })


    onUnmounted(() => {
        cancelAnimationFrame(frameRequestId)
    })
}
