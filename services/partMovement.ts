import { Object3D, Vector3 } from 'three';
import { setWorldDragPosition } from './dragPosition';

export function getMoveMembers(groups: Record<string, string[]>, enabled: Record<string, boolean>, partId: string): string[] {
  const group = Object.entries(groups).find(([, members]) => members.includes(partId));
  return group && enabled[group[0]] !== false ? group[1] : [partId];
}

type MoveMeta = { basePosition: Vector3; expansion: { current: number } };
const metadata = new WeakMap<Object3D, MoveMeta>();
const moving = new WeakSet<Object3D>();
const holdUntil = new WeakMap<Object3D, number>();
export function registerPartMovement(object: Object3D, basePosition: Vector3, expansion: { current: number }) {
  metadata.set(object, { basePosition, expansion });
}
export function isPartMoving(object: Object3D) {
  return moving.has(object) || (holdUntil.get(object) || 0) > performance.now();
}
export type PartMoveSession = { anchor: Object3D; origin: Vector3; entries: { object: Object3D; start: Vector3 }[] };

export function beginPartMove(anchor: Object3D, members: string[]): PartMoveSession {
  let root = anchor;
  while (root.parent && !root.userData.partMoveRoot) root = root.parent;
  root.updateWorldMatrix(true, true);
  const ids = new Set(members);
  const entries: PartMoveSession['entries'] = [];
  root.traverse(object => {
    if (metadata.has(object) && ids.has(object.name)) {
      entries.push({ object, start: object.getWorldPosition(new Vector3()) });
      moving.add(object);
    }
  });
  return { anchor, origin: anchor.getWorldPosition(new Vector3()), entries };
}

export function syncPartMove(session: PartMoveSession) {
  const delta = session.anchor.getWorldPosition(new Vector3()).sub(session.origin);
  session.entries.forEach(({ object, start }) => {
    if (object !== session.anchor) setWorldDragPosition(object, start.clone().add(delta));
  });
}

export function finishPartMove(session: PartMoveSession): Record<string, [number, number, number]> {
  const offsets: Record<string, [number, number, number]> = {};
  session.entries.forEach(({ object }) => {
    const meta = metadata.get(object)!;
    const expansion = meta.expansion.current > 0.05 ? meta.expansion.current : 1;
    offsets[object.name] = object.position.clone().sub(meta.basePosition).divideScalar(expansion).toArray();
    moving.delete(object);
    holdUntil.set(object, performance.now() + 100);
  });
  return offsets;
}

export function cancelPartMove(session: PartMoveSession) {
  session.entries.forEach(({ object, start }) => {
    setWorldDragPosition(object, start);
    moving.delete(object);
    holdUntil.delete(object);
  });
}
