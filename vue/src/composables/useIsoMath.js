import { ISO_ROTATION_DEG, ISO_SCALE_Y } from '@/config/game';

const ISO_RAD = (ISO_ROTATION_DEG * Math.PI) / 180;
const ISO_COS = Math.cos(ISO_RAD);
const ISO_SIN = Math.sin(ISO_RAD);

export const useIsoMath = () => {
  const screenToWorld = (screenX, screenY, viewport, camera) => {
    const offsetX = screenX - viewport.width / 2;
    const offsetY = screenY - viewport.height / 2;
    const unscaledX = offsetX / camera.zoom;
    const unsquashedY = offsetY / camera.zoom / ISO_SCALE_Y;

    return {
      x: camera.x + unscaledX * ISO_COS + unsquashedY * ISO_SIN,
      y: camera.y + unsquashedY * ISO_COS - unscaledX * ISO_SIN
    };
  };

  const worldToScreen = (world, viewport, camera) => {
    const dx = world.x - camera.x;
    const dy = world.y - camera.y;

    // rotate(45deg) — clockwise в CSS
    const rx = dx * ISO_COS - dy * ISO_SIN;
    const ry = dx * ISO_SIN + dy * ISO_COS;

    return {
      x: viewport.width / 2 + rx * camera.zoom,
      y: viewport.height / 2 + ry * ISO_SCALE_Y * camera.zoom
    };
  };

  return { screenToWorld, worldToScreen };
}