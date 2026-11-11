import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, BoxGeometry, Group, Mesh, PerspectiveCamera, Vector3 } from 'three';
import { getModelBounds, getPerspectiveFit } from '../services/cameraFit.ts';

for (const aspect of [0.35, 1, 2.5]) {
  for (const size of [0.01, 3, 1000]) {
    test(`fit contains all model corners: aspect ${aspect}, size ${size}`, () => {
      const camera = new PerspectiveCamera(50, aspect);
      camera.zoom = 1.5;
      const center = new Vector3(10000, -2000, 3000);
      const bounds = new Box3().setFromCenterAndSize(center, new Vector3(size, size * 2, size * 3));
      const fit = getPerspectiveFit(camera, bounds, new Vector3(4, 1.5, 4));
      camera.position.copy(fit.position);
      camera.near = fit.near;
      camera.far = fit.far;
      camera.lookAt(fit.center);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      assert.ok(fit.center.distanceTo(center) < 1e-8);
      for (const x of [bounds.min.x, bounds.max.x]) {
        for (const y of [bounds.min.y, bounds.max.y]) {
          for (const z of [bounds.min.z, bounds.max.z]) {
            const screen = new Vector3(x, y, z).project(camera);
            assert.ok(Math.abs(screen.x) < 1 && Math.abs(screen.y) < 1 && Math.abs(screen.z) < 1, screen.toArray());
          }
        }
      }
    });
  }
}

test('model bounds exclude hidden meshes and helper geometry under selected meshes', () => {
  const root = new Group();
  root.position.set(20, -4, 8);
  root.scale.setScalar(3);
  const part = new Mesh(new BoxGeometry(2, 2, 2));
  part.userData.fitViewSubject = true;
  part.position.x = 5;
  root.add(part);
  const helper = new Mesh(new BoxGeometry(10000, 10000, 10000));
  part.add(helper);
  const hidden = new Group();
  hidden.visible = false;
  const hiddenMesh = new Mesh(new BoxGeometry(10000, 10000, 10000));
  hiddenMesh.userData.fitViewSubject = true;
  hidden.add(hiddenMesh);
  root.add(hidden);
  const bounds = getModelBounds(root);
  assert.deepEqual(bounds.getCenter(new Vector3()).toArray(), [35, -4, 8]);
  assert.deepEqual(bounds.getSize(new Vector3()).toArray(), [6, 6, 6]);
});

test('empty scene is ignored and zero direction recovers with a valid view', () => {
  const camera = new PerspectiveCamera();
  assert.equal(getPerspectiveFit(camera, new Box3(), new Vector3()), null);
  const bounds = new Box3(new Vector3(-1, -1, -1), new Vector3(1, 1, 1));
  assert.ok(getPerspectiveFit(camera, bounds, new Vector3()).position.length() > 1);
});
