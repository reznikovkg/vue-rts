export const CAMERA_POSITION_IS_VIEWPORT_CENTER_IN_WORLD = true

export function createCameraAtWorldCenter(cameraCenterWx = 0, cameraCenterWy = 0) {
  return { cameraCenterWx, cameraCenterWy, cameraWorldZoom: 1 }
}

export function setCameraWorldCenter(camera, cameraCenterWx, cameraCenterWy) {
  return {
    ...camera,
    cameraCenterWx,
    cameraCenterWy,
  }
}

export function translateCameraWorldCenter(camera, deltaWx, deltaWy) {
  return {
    ...camera,
    cameraCenterWx: camera.cameraCenterWx + deltaWx,
    cameraCenterWy: camera.cameraCenterWy + deltaWy,
  }
}
