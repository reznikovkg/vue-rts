import {onMounted, onUnmounted} from 'vue'

const KEY_DIRECTIONS = {
    KeyW: {x: 0, y: -1},
    KeyS: {x: 0, y: 1},
    KeyA: {x: -1, y: 0},
    KeyD: {x: 1, y: 0},
    ArrowUp: {x: 0, y: -1},
    ArrowDown: {x: 0, y: 1},
    ArrowLeft: {x: -1, y: 0},
    ArrowRight: {x: 1, y: 0},
}

export function useKeyboardDirection() {
    const pressedKeys = {}

    function handleKeyDown(event) {
        if (KEY_DIRECTIONS[event.code]) {
            pressedKeys[event.code] = true
            event.preventDefault()
        }
    }

    function handleKeyUp(event) {
        pressedKeys[event.code] = false
    }

    function getDirection() {
        const direction = {x: 0, y: 0}
        for (const code in KEY_DIRECTIONS) {
            if (pressedKeys[code]) {
                direction.x += KEY_DIRECTIONS[code].x
                direction.y += KEY_DIRECTIONS[code].y
            }
        }
        return direction
    }

    onMounted(() => {
        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)
    })

    onUnmounted(() => {
        window.removeEventListener('keydown', handleKeyDown)
        window.removeEventListener('keyup', handleKeyUp)
    })

    return {getDirection}
}
