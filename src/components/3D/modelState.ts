// Shared, module-level model state so the camera animator (PCScene) can read the
// live auto-rotation of the PC group (PCModel) without prop threading.
// Only one PC scene is mounted at a time, so a singleton is safe here.

export const modelState = {
  /** Current Y rotation (radians) of the auto-rotating PC group. */
  rotationY: 0,
}
