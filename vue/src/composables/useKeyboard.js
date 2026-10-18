import { onBeforeUnmount, onMounted } from 'vue'

export const useKeyboard = () => {
  const keys = new Set()
  const down = (e) => keys.add(e.code)
  const up = (e) => keys.delete(e.code)
  const reset = () => keys.clear() // окно потеряло фокус - иначе клавиши "залипнут"

  onMounted(() => {
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', reset)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', down)
    window.removeEventListener('keyup', up)
    window.removeEventListener('blur', reset)
  })

  return { isPressed: (...codes) => codes.some((code) => keys.has(code)) }
}
