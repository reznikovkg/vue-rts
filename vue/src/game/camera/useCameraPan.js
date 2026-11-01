import { nextTick, onMounted, onUnmounted, unref } from 'vue'
import { screenDragToCameraWorldDelta } from '../world/coordinates.js'

const PAN_POINTER_BUTTONS = new Set([0, 1, 2])
const MIDDLE_BUTTON = 1
const CLICK_DRAG_THRESHOLD_PX = 5

export function useCameraPan(viewportEl, getCamera, { onPanCamera, onZoomAtScreen, onClick }) {
  let lastClientX = 0
  let lastClientY = 0
  let panning = false
  let dragging = false
  let pressedButton = 0
  let startClientX = 0
  let startClientY = 0
  let mountedElement = null

  const dragMapByScreenDelta = (deltaSx, deltaSy) => {
    const { deltaWx, deltaWy } = screenDragToCameraWorldDelta(
      deltaSx,
      deltaSy,
      getCamera(),
    )
    onPanCamera(deltaWx, deltaWy)
  }

  const onPointerDown = (event) => {
    if (!PAN_POINTER_BUTTONS.has(event.button)) {
      return
    }
    panning = true
    pressedButton = event.button
    dragging = event.button === MIDDLE_BUTTON
    startClientX = lastClientX = event.clientX
    startClientY = lastClientY = event.clientY
    mountedElement?.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  const onPointerMove = (event) => {
    if (!panning) {
      return
    }
    if (!dragging) {
      const moved = Math.hypot(event.clientX - startClientX, event.clientY - startClientY)
      if (moved < CLICK_DRAG_THRESHOLD_PX) {
        return
      }
      dragging = true
      lastClientX = event.clientX
      lastClientY = event.clientY
    }
    const deltaSx = event.clientX - lastClientX
    const deltaSy = event.clientY - lastClientY
    lastClientX = event.clientX
    lastClientY = event.clientY
    dragMapByScreenDelta(deltaSx, deltaSy)
  }

  const onPointerUp = (event) => {
    if (!panning) {
      return
    }
    panning = false
    mountedElement?.releasePointerCapture(event.pointerId)
    if (!dragging && event.type === 'pointerup') {
      const rect = mountedElement.getBoundingClientRect()
      onClick?.(event.clientX - rect.left, event.clientY - rect.top, pressedButton)
    }
  }

  const onContextMenu = (event) => {
    event.preventDefault()
  }

  const onWheel = (event) => {
    event.preventDefault()
    if (!mountedElement || event.deltaY === 0) {
      return
    }
    const rect = mountedElement.getBoundingClientRect()
    const sx = event.clientX - rect.left
    const sy = event.clientY - rect.top
    const zoomFactor = event.deltaY < 0 ? 1.1 : 1 / 1.1
    onZoomAtScreen(sx, sy, zoomFactor)
  }

  const onKeyDown = (event) => {
    if (event.target !== mountedElement && !mountedElement?.contains(event.target)) {
      return
    }
    const step = 40
    if (event.code === 'KeyW') {
      onPanCamera(0, -step)
    } else if (event.code === 'KeyS') {
      onPanCamera(0, step)
    } else if (event.code === 'KeyA') {
      onPanCamera(-step, 0)
    } else if (event.code === 'KeyD') {
      onPanCamera(step, 0)
    } else {
      return
    }
    event.preventDefault()
  }

  onMounted(async () => {
    await nextTick()
    mountedElement = unref(viewportEl)
    if (!mountedElement) {
      return
    }
    mountedElement.addEventListener('pointerdown', onPointerDown)
    mountedElement.addEventListener('pointermove', onPointerMove)
    mountedElement.addEventListener('pointerup', onPointerUp)
    mountedElement.addEventListener('pointercancel', onPointerUp)
    mountedElement.addEventListener('contextmenu', onContextMenu)
    mountedElement.addEventListener('wheel', onWheel, { passive: false })
    mountedElement.addEventListener('keydown', onKeyDown)
  })

  onUnmounted(() => {
    mountedElement?.removeEventListener('pointerdown', onPointerDown)
    mountedElement?.removeEventListener('pointermove', onPointerMove)
    mountedElement?.removeEventListener('pointerup', onPointerUp)
    mountedElement?.removeEventListener('pointercancel', onPointerUp)
    mountedElement?.removeEventListener('contextmenu', onContextMenu)
    mountedElement?.removeEventListener('wheel', onWheel)
    mountedElement?.removeEventListener('keydown', onKeyDown)
  })
}
