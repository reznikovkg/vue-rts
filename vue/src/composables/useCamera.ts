import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { Ref } from 'vue'
import { world, type Point } from '@/game/world'

const speed = 500
const edgeSize = 24

export const useCamera = (viewport: Ref<HTMLElement | null>) => {
  const camera = ref({ x: 0, y: 0 })
  const keys = new Set<string>()
  let pointer: Point | null = null
  let frame = 0
  let previousTime = 0

  const clamp = () => {
    camera.value.x = Math.max(0, Math.min(camera.value.x, world.width - viewport.value!.clientWidth))
    camera.value.y = Math.max(0, Math.min(camera.value.y, world.height - viewport.value!.clientHeight))
  }

  const center = () => {
    camera.value.x = (world.width - viewport.value!.clientWidth) / 2
    camera.value.y = (world.height - viewport.value!.clientHeight) / 2
    clamp()
  }

  const update = (time: number) => {
    const seconds = Math.min((time - previousTime) / 1000, 0.05)
    previousTime = time
    let horizontal = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'))
    let vertical = Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp'))

    if (pointer) {
      horizontal += Number(pointer.x > viewport.value!.clientWidth - edgeSize) - Number(pointer.x < edgeSize)
      vertical += Number(pointer.y > viewport.value!.clientHeight - edgeSize) - Number(pointer.y < edgeSize)
    }

    camera.value.x += horizontal * speed * seconds
    camera.value.y += vertical * speed * seconds
    clamp()
    frame = requestAnimationFrame(update)
  }

  const setPointer = (x: number, y: number) => { pointer = { x, y } }
  const clearPointer = () => { pointer = null }
  const controlKeys = new Set([
    'KeyW', 'KeyA', 'KeyS', 'KeyD',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  ])
  const keyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return
    if ((event.target as HTMLElement).closest?.('input, textarea, [contenteditable]')) return
    if (!controlKeys.has(event.code)) return
    event.preventDefault()
    keys.add(event.code)
  }
  const keyUp = (event: KeyboardEvent) => keys.delete(event.code)
  const clearKeys = () => keys.clear()

  onMounted(() => {
    center()
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    window.addEventListener('resize', clamp)
    window.addEventListener('blur', clearKeys)
    frame = requestAnimationFrame(update)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', keyDown)
    window.removeEventListener('keyup', keyUp)
    window.removeEventListener('resize', clamp)
    window.removeEventListener('blur', clearKeys)
    cancelAnimationFrame(frame)
  })

  return { camera, setPointer, clearPointer }
}
