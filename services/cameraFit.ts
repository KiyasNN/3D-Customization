import { Box3, Mesh, Object3D, PerspectiveCamera, Vector3 } from 'three';

export function getModelBounds(root: Object3D): Box3 {
  root.updateWorldMatrix(true, true);
  const meshes: Mesh[] = [];
  root.traverseVisible(object => {
    if ((object as Mesh).isMesh) meshes.push(object as Mesh);
  });
  // Imported/demo meshes are tagged so labels and selection helpers are excluded.
  const subjects = meshes.some(mesh => mesh.userData.fitViewSubject)
    ? meshes.filter(mesh => mesh.userData.fitViewSubject) : meshes;
  const bounds = new Box3();
  for (const mesh of subjects) {
    if ('computeBoundingBox' in mesh && typeof mesh.computeBoundingBox === 'function') {
      mesh.computeBoundingBox();
    } else {
      mesh.geometry.computeBoundingBox();
    }
    const localBox = (mesh as Mesh & { boundingBox?: Box3 }).boundingBox || mesh.geometry.boundingBox;
    if (!localBox || localBox.isEmpty()) continue;
    const worldBox = localBox.clone().applyMatrix4(mesh.matrixWorld);
    if ([...worldBox.min.toArray(), ...worldBox.max.toArray()].every(Number.isFinite)) {
      bounds.union(worldBox);
    }
  }
  return bounds;
}

// Keep the near plane proportional to model size, rather than almost at zero.
// A tiny near plane wastes depth precision and makes close logo surfaces flicker.
export function getModelClipPlanes(radius: number, distance: number) {
  const safeRadius = Math.max(radius, 0.001);
  return {
    near: Math.max(safeRadius * 0.001, Math.min(safeRadius * 0.05, Math.max(distance - safeRadius, 0) * 0.5)),
    far: Math.max(distance + safeRadius * 4, safeRadius * 10),
  };
}

export function getPerspectiveFit(camera: PerspectiveCamera, bounds: Box3, direction: Vector3) {
  if (bounds.isEmpty()) return null;
  const center = bounds.getCenter(new Vector3());
  const radius = Math.max(bounds.getSize(new Vector3()).length() / 2, 0.001);
  const verticalHalfFov = camera.getEffectiveFOV() * Math.PI / 360;
  const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * camera.aspect);
  const distance = radius * 1.15 / Math.sin(Math.min(verticalHalfFov, horizontalHalfFov));
  const viewDirection = direction.clone();
  if (!viewDirection.toArray().every(Number.isFinite) || viewDirection.lengthSq() < 1e-10) {
    viewDirection.set(4, 1.5, 4);
  }
  return {
    center,
    radius,
    position: center.clone().add(viewDirection.normalize().multiplyScalar(distance)),
    ...getModelClipPlanes(radius, distance),
  };
}
