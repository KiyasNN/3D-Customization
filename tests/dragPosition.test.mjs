import assert from 'node:assert/strict';
import test from 'node:test';
import { Group, Mesh, Vector3 } from 'three';
import { setWorldDragPosition } from '../services/dragPosition.ts';

for (const scale of [0.01, 1, 100]) {
  test(`drag follows world movement under nested transforms, scale ${scale}`, () => {
    const root = new Group();
    root.scale.setScalar(scale);
    root.rotation.set(0.3, 0.8, -0.2);
    root.position.set(5, -3, 2);
    const parent = new Group();
    parent.scale.set(2, 0.5, 3);
    parent.rotation.set(-0.1, 0.4, 0.7);
    root.add(parent);
    const mesh = new Mesh();
    mesh.position.set(1, 2, 3);
    parent.add(mesh);

    const start = mesh.getWorldPosition(new Vector3());
    const displacement = new Vector3(0.02, -0.01, 0);
    const target = start.clone().add(displacement);
    setWorldDragPosition(mesh, target);
    assert.ok(mesh.getWorldPosition(new Vector3()).distanceTo(target) < 1e-9);
    // Repeated pointer events at the same location must not accumulate movement.
    setWorldDragPosition(mesh, target);
    assert.ok(mesh.getWorldPosition(new Vector3()).distanceTo(target) < 1e-9);
  });
}

test('drag supports objects without a parent and leaves input unchanged', () => {
  const mesh = new Mesh();
  const target = new Vector3(2, 3, 4);
  setWorldDragPosition(mesh, target);
  assert.deepEqual(mesh.position.toArray(), [2, 3, 4]);
  assert.deepEqual(target.toArray(), [2, 3, 4]);
});
