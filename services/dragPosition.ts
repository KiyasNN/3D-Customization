import { Object3D, Vector3 } from 'three';

// Ray/plane intersections are world-space; Object3D.position is parent-local.
export function setWorldDragPosition(object: Object3D, worldPosition: Vector3) {
  const localPosition = worldPosition.clone();
  if (object.parent) {
    object.parent.updateWorldMatrix(true, false);
    object.parent.worldToLocal(localPosition);
  }
  object.position.copy(localPosition);
}
