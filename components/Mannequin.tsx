// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
// @ts-ignore
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';
import { useStore } from '../store';
import { ShoeModel, ShoeMeshOnly, useModelLoader } from './ShoeModel';

// Preload the asset to avoid pop-in
useGLTF.preload('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/Soldier.glb');

// Pre-allocated temporary variables for math calculations inside useFrame to prevent GC pressure
const _worldPos = new THREE.Vector3();
const _worldQuat = new THREE.Quaternion();
const _worldScale = new THREE.Vector3();
const _parentQuat = new THREE.Quaternion();

export const Mannequin = () => {
  const walkSpeed = useStore(s => s.walkSpeed);
  const baseShoeType = useStore(s => s.baseShoeType);
  const currentModel = useStore(s => s.currentModel);
  const reverseWalk = useStore(s => s.reverseWalk);

  const group = useRef<THREE.Group>(null);
  
  // Load Soldier Model
  const { scene, animations } = useGLTF('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/Soldier.glb');
  
  // Clone to ensure unique instance
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { actions } = useAnimations(animations, group);

  // References for attached shoes
  const leftShoeRef = useRef<THREE.Group>(null);
  const rightShoeRef = useRef<THREE.Group>(null);
  
  // Bone references state
  const [bones, setBones] = useState<{ left: THREE.Object3D | null, right: THREE.Object3D | null }>({ left: null, right: null });

  // Initialize: Find bones and hide soldier mesh
  useEffect(() => {
    const rightBone = clone.getObjectByName('mixamorigRightFoot');
    const leftBone = clone.getObjectByName('mixamorigLeftFoot');
    setBones({ left: leftBone || null, right: rightBone || null });

    clone.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
         // Disable shadows for the invisible body to avoid giant shadows when scaled
         obj.castShadow = false;
         obj.receiveShadow = false;
         // Make invisible but keep in scene for shadow casting logic if needed (now disabled)
         const mesh = obj as THREE.Mesh;
         mesh.material = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.0, depthWrite: false });
      }
    });
  }, [clone]);

  // Animation Control
  useEffect(() => {
     const action = actions['Walk'];
     if (action) {
        action.reset().fadeIn(0.2).play();
        action.timeScale = walkSpeed * 0.35; 
     }
     return () => {
        action?.fadeOut(0.2);
     };
  }, [actions]);

  // Speed Update
  useEffect(() => {
     const action = actions['Walk'];
     if (action) action.timeScale = walkSpeed * 0.35;
  }, [walkSpeed, actions]);

  // Frame Loop: Sync Shoes to Bones
  useFrame(() => {
    if (!bones.left || !bones.right || !leftShoeRef.current || !rightShoeRef.current || !group.current) return;

    // Helper to sync
    const syncShoe = (bone: THREE.Object3D, shoeContainer: THREE.Group) => {
        // Get bone world transform
        bone.matrixWorld.decompose(_worldPos, _worldQuat, _worldScale);
        
        // Apply world pos first
        shoeContainer.position.copy(_worldPos);
        shoeContainer.quaternion.copy(_worldQuat);
        
        // Convert to local space of the parent (Mannequin Group)
        // This is necessary because Mannequin is offset in App.tsx (y=-0.5)
        // Without this, the offset is applied twice (once by App.tsx, once by copying world pos)
        if (shoeContainer.parent) {
            shoeContainer.parent.worldToLocal(shoeContainer.position);
            
            // Adjust rotation for parent's rotation (if any)
            shoeContainer.parent.getWorldQuaternion(_parentQuat);
            shoeContainer.quaternion.premultiply(_parentQuat.invert());
        }
    };

    syncShoe(bones.left, leftShoeRef.current);
    syncShoe(bones.right, rightShoeRef.current);
  });

  // Scale calibration: 
  // 0.06 creates a realistic foot size relative to the soldier body (approx 25cm length).
  const CONTAINER_SCALE = 0.06;

  // Rotation calibration:
  // ROTATION_OFFSET: [-Math.PI / 2 + 0.3, 0, 0]
  // Tilted slightly to match ankle bone orientation
  const ROTATION_OFFSET: [number, number, number] = [-Math.PI / 2 + 0.3, 0, 0];
  
  // Position calibration:
  // [0, -0.15, 0.08]
  // With coordinate space fixed, we position relative to the Ankle Bone.
  // We move DOWN (-Y) to place sole on floor, and slightly Forward (+Z) to align with leg.
  const POSITION_OFFSET: [number, number, number] = [0, -0.15, 0.08];

  const rotationY = (currentModel ? 0 : -Math.PI / 2) + (reverseWalk ? Math.PI : 0);

  // Mirror Logic
  const leftScaleX = baseShoeType === 'right' ? -1 : 1;
  const rightScaleX = baseShoeType === 'left' ? -1 : 1;

  const isObj = currentModel?.extension === 'obj';
  const isUsdz = currentModel?.extension === 'usdz';
  const { data: shoeScene } = useModelLoader(currentModel?.url, isObj, isUsdz, currentModel?.resources);

  return (
    <group ref={group} dispose={null}>
       <primitive object={clone} />
       
       {/* Left Foot Container */}
       <group ref={leftShoeRef}>
          {/* Apply Offset & Scale Wrapper */}
          <group rotation={ROTATION_OFFSET} position={POSITION_OFFSET} scale={[CONTAINER_SCALE, CONTAINER_SCALE, CONTAINER_SCALE]}>
             <group scale={[leftScaleX, 1, 1]} rotation={[0, rotationY, 0]}>
                {/* DO NOT pass customScale here. Let it normalize. */}
                <ShoeMeshOnly scene={shoeScene} interactive={false} />
             </group>
          </group>
       </group>

       {/* Right Foot Container */}
       <group ref={rightShoeRef}>
          <group rotation={ROTATION_OFFSET} position={POSITION_OFFSET} scale={[CONTAINER_SCALE, CONTAINER_SCALE, CONTAINER_SCALE]}>
             <group scale={[rightScaleX, 1, 1]} rotation={[0, rotationY, 0]}>
                <ShoeMeshOnly scene={shoeScene} interactive={false} />
             </group>
          </group>
       </group>
    </group>
  );
};