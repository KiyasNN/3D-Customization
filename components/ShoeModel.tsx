// @ts-nocheck
import React, { useRef, useMemo, useEffect, useState, useLayoutEffect, useCallback, useContext } from 'react';
// @ts-ignore
import { Html, Outlines, Edges, Line, Text, Billboard, TransformControls } from '@react-three/drei';
import * as THREE from 'three';
// @ts-ignore
import { useLoader, useFrame, useThree } from '@react-three/fiber';
import { OBJLoader, GLTFLoader, SkeletonUtils } from 'three-stdlib';
import { USDLoader } from 'three/examples/jsm/loaders/USDLoader.js';
import { useStore } from '../store';
import { SHOE_PARTS } from '../constants';
import { Material, TextureConfig } from '../types';

const InitialPositionsContext = React.createContext({ 
  initialPositions: new Map<string, THREE.Vector3>(), 
  initialRotations: new Map<string, THREE.Euler>(), 
  initialScales: new Map<string, THREE.Vector3>() 
});

export const ShoeMeshOnly = ({ scene, interactive = false, videoTexture }: any) => {
  const currentModel = useStore(s => s.currentModel);
  const calibrations = useStore(s => s.modelCalibrations) || {};

  const model = useMemo(() => {
    if (!scene) return null;
    let actualModel: any = null;
    if (scene.isObject3D) {
      actualModel = scene;
    } else if (scene.scene && scene.scene.isObject3D) {
      actualModel = scene.scene;
    } else if (scene.scenes && scene.scenes[0] && scene.scenes[0].isObject3D) {
      actualModel = scene.scenes[0];
    } else if (typeof scene.traverse === 'function') {
      actualModel = scene;
    } else if (scene.scene && typeof scene.scene.traverse === 'function') {
      actualModel = scene.scene;
    } else {
      actualModel = scene;
    }

    if (!actualModel) return null;

    try {
      return SkeletonUtils.clone(actualModel);
    } catch (e) {
      console.warn("SkeletonUtils.clone failed, falling back to simple clone:", e);
      if (typeof actualModel.clone === 'function') {
        return actualModel.clone();
      }
      return actualModel;
    }
  }, [scene]);

  // Center and normalize sizing to standard shoe length (~2.8 units)
  const normalization = useMemo(() => {
    if (!model || typeof model.updateMatrixWorld !== 'function') {
      return { scale: 1, position: [0, 0, 0] };
    }
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z) || 1.0;
    const scale = 2.8 / maxDim;

    const xOffset = -center.x * scale;
    const yOffset = -box.min.y * scale;
    const zOffset = -center.z * scale;

    return {
      scale: scale,
      position: [xOffset, yOffset, zOffset]
    };
  }, [model]);

  if (!model) return null;

  const calibration = currentModel ? (calibrations[currentModel.id] || {
    scale: 1.0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    positionX: 0,
    positionY: 0,
    positionZ: 0,
  }) : {
    scale: 1.0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    positionX: 0,
    positionY: 0,
    positionZ: 0,
  };

  const finalScaleValue = normalization.scale * calibration.scale;
  const finalScale = [finalScaleValue, finalScaleValue, finalScaleValue];
  const finalPosition = [
    normalization.position[0] + calibration.positionX,
    normalization.position[1] + calibration.positionY,
    normalization.position[2] + calibration.positionZ
  ];
  const finalRotation = [
    calibration.rotationX,
    calibration.rotationY,
    calibration.rotationZ
  ];

  return (
    <group 
      position={finalPosition} 
      rotation={finalRotation} 
      scale={finalScale}
    >
       <group
         scale={model ? [model.scale.x, model.scale.y, model.scale.z] : [1, 1, 1]}
         position={model ? [model.position.x, model.position.y, model.position.z] : [0, 0, 0]}
         rotation={model ? [model.rotation.x, model.rotation.y, model.rotation.z] : [0, 0, 0]}
       >
         {model && model.children?.map((child: any, i: number) => (
           <RecursivePart 
               key={child.uuid || i} 
               object={child} 
               interactive={interactive}
               videoTexture={videoTexture}
           />
         ))}
       </group>
    </group>
  );
};
const clonedTextureCache: Record<string, THREE.Texture> = {};
const materialCache: Record<string, THREE.MeshStandardMaterial> = {};
const textureCache: Record<string, THREE.Texture> = {};

// Constant for explosion scale
const EXPLOSION_SCALE = 0.5; 

// Default config
const DEFAULT_CONFIG: TextureConfig = {
  scale: 2,
  normalScale: 1.0,
  roughness: 0.5,
  displacementScale: 0,
  explosionOffset: [0, 0, 0],
  meshScale: 1.0,
  projectedImageUrl: '',
  projectionOffsetX: 0,
  projectionOffsetY: 0,
  projectionScaleX: 1,
  projectionScaleY: 1,
  projectionRotation: 0,
  projectionRepeat: true,
};

const getThreeMaterial = (
  matId: string, 
  allMaterials: Material[], 
  config: TextureConfig = DEFAULT_CONFIG,
  videoTexture?: THREE.Texture | null,
  wireframe: boolean = false
) => {
  const matDef = allMaterials?.find(m => m.id === matId);
  if (!matDef) {
    const fallbackKey = `fallback_${wireframe}`;
    if (!materialCache[fallbackKey]) {
      materialCache[fallbackKey] = new THREE.MeshStandardMaterial({ color: '#cccccc', wireframe });
    }
    return materialCache[fallbackKey];
  }

  const cacheKey = `${matId}_r${config.roughness}_s${config.scale}_ns${config.normalScale}_ds${config.displacementScale}_w${wireframe}_v${videoTexture ? 'yes' : 'no'}_decal${config.projectedImageUrl ? `${config.projectedImageUrl}_ox${config.projectionOffsetX}_oy${config.projectionOffsetY}_sx${config.projectionScaleX}_sy${config.projectionScaleY}_rot${config.projectionRotation}_rep${config.projectionRepeat}` : 'none'}`;

  if (materialCache[cacheKey]) {
    return materialCache[cacheKey];
  }

  const params: THREE.MeshStandardMaterialParameters = {
    color: matDef.color,
    roughness: config.roughness,
    metalness: matDef.metalness,
    wireframe: wireframe,
  };

  const scale = config.scale;

  const loadMap = (url: string, isColorMap: boolean = false) => {
    let tex = textureCache[url];
    if (!tex) {
      tex = new THREE.TextureLoader().load(url);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.anisotropy = 16;
      textureCache[url] = tex;
    }
    
    if (!tex) return null;

    tex.colorSpace = isColorMap ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace;

    const cacheKey = `${url}_${scale}`;
    if (clonedTextureCache[cacheKey]) {
      return clonedTextureCache[cacheKey];
    }

    const img = tex.image;
    const isReady = img && (
      (typeof HTMLVideoElement !== 'undefined' && img instanceof HTMLVideoElement) || 
      ((img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0)
    );

    if (!isReady) {
       return tex;
    }

    const clone = tex.clone();
    clone.repeat.set(scale, scale);
    clone.wrapS = THREE.RepeatWrapping;
    clone.wrapT = THREE.RepeatWrapping;
    clone.colorSpace = isColorMap ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace;
    clone.needsUpdate = true;
    clonedTextureCache[cacheKey] = clone;
    return clone;
  };

  if (matDef.type === 'video' && videoTexture) {
     videoTexture.repeat.set(scale, scale);
     videoTexture.wrapS = THREE.RepeatWrapping;
     videoTexture.wrapT = THREE.RepeatWrapping;
     videoTexture.colorSpace = THREE.SRGBColorSpace;
     params.map = videoTexture;
     params.color = new THREE.Color('#ffffff');
  } else if (matDef.textureUrl) {
     params.map = loadMap(matDef.textureUrl, true);
  }
  
  if (matDef.normalMapUrl) {
     params.normalMap = loadMap(matDef.normalMapUrl, false);
     params.normalScale = new THREE.Vector2(config.normalScale, config.normalScale);
  }
  
  if (matDef.roughnessMapUrl) params.roughnessMap = loadMap(matDef.roughnessMapUrl, false);
  if (matDef.metalnessMapUrl) params.metalnessMap = loadMap(matDef.metalnessMapUrl, false);
  if (matDef.aoMapUrl) {
     params.aoMap = loadMap(matDef.aoMapUrl, false);
     params.aoMapIntensity = 1.0;
  }
  
  if (matDef.displacementMapUrl) {
    params.displacementMap = loadMap(matDef.displacementMapUrl, false);
    params.displacementScale = config.displacementScale;
  }

  const material = new THREE.MeshStandardMaterial(params);

  // Ensure USE_UV is defined so vUv is populated for decal overlay calculation
  material.defines = material.defines || {};
  material.defines.USE_UV = '';

  if (config.projectedImageUrl) {
     let decalTex = textureCache[config.projectedImageUrl];
     if (!decalTex) {
        decalTex = new THREE.TextureLoader().load(config.projectedImageUrl);
        decalTex.wrapS = THREE.RepeatWrapping;
        decalTex.wrapT = THREE.RepeatWrapping;
        decalTex.generateMipmaps = true;
        decalTex.minFilter = THREE.LinearMipmapLinearFilter;
        decalTex.anisotropy = 16;
        textureCache[config.projectedImageUrl] = decalTex;
     }

     const offsetX = config.projectionOffsetX !== undefined ? config.projectionOffsetX : 0;
     const offsetY = config.projectionOffsetY !== undefined ? config.projectionOffsetY : 0;
     const scaleX = config.projectionScaleX !== undefined ? config.projectionScaleX : 1;
     const scaleY = config.projectionScaleY !== undefined ? config.projectionScaleY : 1;
     const rotation = config.projectionRotation !== undefined ? config.projectionRotation : 0;
     const repeat = config.projectionRepeat !== false;

     material.userData.decalMap = { value: decalTex };
     material.userData.uHasDecal = { value: true };
     material.userData.uDecalOffsetX = { value: offsetX };
     material.userData.uDecalOffsetY = { value: offsetY };
     material.userData.uDecalScaleX = { value: scaleX };
     material.userData.uDecalScaleY = { value: scaleY };
     material.userData.uDecalRotation = { value: rotation * (Math.PI / 180) };
     material.userData.uDecalRepeat = { value: repeat };

     material.onBeforeCompile = (shader) => {
        shader.uniforms.decalMap = material.userData.decalMap;
        shader.uniforms.uHasDecal = material.userData.uHasDecal;
        shader.uniforms.uDecalOffsetX = material.userData.uDecalOffsetX;
        shader.uniforms.uDecalOffsetY = material.userData.uDecalOffsetY;
        shader.uniforms.uDecalScaleX = material.userData.uDecalScaleX;
        shader.uniforms.uDecalScaleY = material.userData.uDecalScaleY;
        shader.uniforms.uDecalRotation = material.userData.uDecalRotation;
        shader.uniforms.uDecalRepeat = material.userData.uDecalRepeat;

        shader.fragmentShader = shader.fragmentShader.replace(
           '#include <map_pars_fragment>',
           `#include <map_pars_fragment>
            uniform sampler2D decalMap;
            uniform bool uHasDecal;
            uniform float uDecalOffsetX;
            uniform float uDecalOffsetY;
            uniform float uDecalScaleX;
            uniform float uDecalScaleY;
            uniform float uDecalRotation;
            uniform bool uDecalRepeat;
           `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
           '#include <map_fragment>',
           `#include <map_fragment>
            #ifdef USE_UV
            if (uHasDecal) {
               vec2 decalUv = vUv;
               decalUv -= vec2(0.5);
               float c = cos(uDecalRotation);
               float s = sin(uDecalRotation);
               decalUv = vec2(decalUv.x * c - decalUv.y * s, decalUv.x * s + decalUv.y * c);
               decalUv *= vec2(uDecalScaleX, uDecalScaleY);
               decalUv += vec2(0.5);
               decalUv -= vec2(uDecalOffsetX, uDecalOffsetY);
               
               if (uDecalRepeat || (decalUv.x >= 0.0 && decalUv.x <= 1.0 && decalUv.y >= 0.0 && decalUv.y <= 1.0)) {
                  vec2 readUv = decalUv;
                  if (uDecalRepeat) {
                     readUv = fract(decalUv);
                  }
                  vec4 decalCol = texture2D(decalMap, readUv);
                  decalCol = mapTexelToLinear(decalCol);
                  diffuseColor.rgb = mix(diffuseColor.rgb, decalCol.rgb, decalCol.a);
               }
            }
            #endif
           `
        );
      };
  }

  materialCache[cacheKey] = material;
  return material;
};

// Memoized Dimensions to prevent update loops
const Dimensions = React.memo(({ geometry }: { geometry: THREE.BufferGeometry }) => {
  const showMeasurements = useStore(s => s.showMeasurements);
  const labelSize = useStore(s => s.labelSize);
  const ref = useRef<THREE.Group>(null);
  const [dims, setDims] = React.useState<THREE.Vector3>(new THREE.Vector3());
  const [center, setCenter] = React.useState<THREE.Vector3>(new THREE.Vector3());

  useEffect(() => {
    if (!showMeasurements || !geometry) return;
    
    const box = new THREE.Box3();
    
    if (geometry.boundingBox) {
        box.copy(geometry.boundingBox);
    } else {
        const posAttribute = geometry.getAttribute('position');
        if (posAttribute) {
            box.setFromBufferAttribute(posAttribute as THREE.BufferAttribute);
        } else {
            box.set(new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0));
        }
    }
    
    const size = new THREE.Vector3();
    const c = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(c);
    
    // Use functional state setter to prevent unnecessary re-renders via tolerance checks
    setDims((prev) => {
      if (Math.abs(prev.x - size.x) < 0.0001 && 
          Math.abs(prev.y - size.y) < 0.0001 && 
          Math.abs(prev.z - size.z) < 0.0001) {
        return prev;
      }
      return size;
    });

    setCenter((prev) => {
      if (Math.abs(prev.x - c.x) < 0.0001 && 
          Math.abs(prev.y - c.y) < 0.0001 && 
          Math.abs(prev.z - c.z) < 0.0001) {
        return prev;
      }
      return c;
    });
  }, [geometry, showMeasurements]);

  if (!showMeasurements || !geometry) return null;

  const scale = 100;

  return (
    <group ref={ref} position={[center.x, center.y, center.z]}>
       <mesh>
         <boxGeometry args={[dims.x, dims.y, dims.z]} />
         <meshBasicMaterial visible={false} />
         <Edges color="#3b82f6" threshold={15} />
       </mesh>

       <Html position={[dims.x/2, -dims.y/2, dims.z/2]} zIndexRange={[100, 0]}>
         <div style={{ transform: `scale(${labelSize})`, transformOrigin: 'center' }} className="pointer-events-none">
           <div className="transform translate-x-2 translate-y-2 bg-zinc-900/90 text-white text-[10px] px-2 py-1 rounded border border-red-500/30 whitespace-nowrap flex items-center gap-1 shadow-xl pointer-events-none">
             <span className="text-red-400 font-bold">X</span>
             <span className="font-mono">{(dims.x * scale).toFixed(0)}mm</span>
           </div>
         </div>
       </Html>
       
       <Html position={[-dims.x/2, dims.y/2, dims.z/2]} zIndexRange={[100, 0]}>
         <div style={{ transform: `scale(${labelSize})`, transformOrigin: 'center' }} className="pointer-events-none">
           <div className="transform -translate-x-full -translate-y-full mr-2 mb-2 bg-zinc-900/90 text-white text-[10px] px-2 py-1 rounded border border-green-500/30 whitespace-nowrap flex items-center gap-1 shadow-xl pointer-events-none">
             <span className="text-green-400 font-bold">Y</span>
             <span className="font-mono">{(dims.y * scale).toFixed(0)}mm</span>
           </div>
         </div>
       </Html>
       
       <Html position={[-dims.x/2, -dims.y/2, -dims.z/2]} zIndexRange={[100, 0]}>
         <div style={{ transform: `scale(${labelSize})`, transformOrigin: 'center' }} className="pointer-events-none">
           <div className="transform -translate-x-full translate-y-2 mr-2 bg-zinc-900/90 text-white text-[10px] px-2 py-1 rounded border border-blue-500/30 whitespace-nowrap flex items-center gap-1 shadow-xl pointer-events-none">
             <span className="text-blue-400 font-bold">Z</span>
             <span className="font-mono">{(dims.z * scale).toFixed(0)}mm</span>
           </div>
         </div>
       </Html>
    </group>
  );
});

// --- 3D Label Component for Video Recording & Snapshot ---
const ThreeLabel = ({ data, isSelected }: { data: any, isSelected: boolean }) => {
  const labelSize = useStore((s) => s.labelSize);
  return (
    <Billboard follow={true} lockX={false} lockY={false} lockZ={false} scale={[labelSize, labelSize, 1]}>
        <mesh position={[0, -0.02, -0.01]} renderOrder={999}>
            <planeGeometry args={[0.7, 0.25]} />
            <meshBasicMaterial 
              color={isSelected ? "#1e3a8a" : "#18181b"}
              transparent 
              opacity={0.85} 
              side={THREE.DoubleSide} 
              depthTest={false} // Make overlay-like
            />
            <Edges 
              scale={1.0} 
              threshold={15} 
              color={isSelected ? "#60a5fa" : "#52525b"}
              renderOrder={1000}
            />
        </mesh>
        
        <Text 
            position={[0, 0.045, 0]} 
            fontSize={0.05} 
            color="white" 
            anchorX="center" 
            anchorY="middle"
            fontWeight="bold"
            letterSpacing={0.05}
            outlineWidth={0.002}
            outlineColor="#000000"
            renderOrder={1001}
            depthTest={false}
        >
            {data.title ? data.title.toUpperCase() : ''}
        </Text>
        
        <Text 
            position={[0, -0.04, 0]} 
            fontSize={0.03} 
            color="#d4d4d8"
            anchorX="center" 
            anchorY="middle"
            maxWidth={0.6}
            textAlign="center"
            lineHeight={1.3}
            renderOrder={1001}
            depthTest={false}
        >
            {data.description || ''}
        </Text>
    </Billboard>
  );
};

// Pre-allocated temporary variables for math calculations inside useFrame in AnnotationManager to prevent GC pressure
const _tempMatrix = new THREE.Matrix4();
const _tempWorldPos = new THREE.Vector3();
const _tempCenter = new THREE.Vector3();
const _tempScreenPos = new THREE.Vector3();
const _tempNdc = new THREE.Vector3();
const _tempLocalStart = new THREE.Vector3();
const _tempLocalEnd = new THREE.Vector3();
const _tempCurrentEnd = new THREE.Vector3();

// --- Smart Annotation Manager ---
const AnnotationManager = ({ scene }: { scene: THREE.Group }) => {
  const customParts = useStore(s => s.customParts);
  const partAnnotations = useStore(s => s.partAnnotations);
  const showAnnotations = useStore(s => s.showAnnotations);
  const selectedPart = useStore(s => s.selectedPart);
  const recordingStatus = useStore(s => s.recordingStatus);
  const isSnapshotting = useStore(s => s.isSnapshotting);
  const labelSize = useStore(s => s.labelSize);
  
  const { camera } = useThree();
  
  const progressRefs = useRef<Record<string, number>>({});
  const lastSelectedRef = useRef<string | null>(null);

  const labelGroupsRef = useRef<Record<string, THREE.Group>>({});
  const lineRefs = useRef<Record<string, any>>({}); 
  const groupRef = useRef<THREE.Group>(null);

  // Switch to 3D Labels during recording OR snapshotting
  const use3DLabels = recordingStatus === 'recording' || isSnapshotting;

  const preallocatedPositions = useRef<Record<string, { worldPos: THREE.Vector3, screenPos: THREE.Vector3 }>>({});

  useEffect(() => {
     customParts.forEach(id => {
        if (progressRefs.current[id] === undefined) progressRefs.current[id] = 1;
     });
  }, [customParts]);

  useEffect(() => {
     if (selectedPart && selectedPart !== lastSelectedRef.current) {
        progressRefs.current[selectedPart] = 0; // Reset to start
        lastSelectedRef.current = selectedPart;
     }
  }, [selectedPart]);

  useFrame((state, delta) => {
    if (!showAnnotations) return;

    const active: any[] = [];
    if (groupRef.current) {
      _tempMatrix.copy(groupRef.current.matrixWorld).invert();
    } else {
      _tempMatrix.identity();
    }

    customParts.forEach(id => {
       const data = partAnnotations[id];
       if (!data || (!data.title && !data.description)) return;
       
       const mesh = scene.getObjectByName(id);
       if (!mesh) return;

       mesh.updateMatrixWorld();

       if (progressRefs.current[id] < 1) {
          progressRefs.current[id] = Math.min(progressRefs.current[id] + delta * 3, 1);
       }

       _tempWorldPos.set(0, 0, 0);
       if ((mesh as THREE.Mesh).geometry) {
          if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
          if (mesh.geometry.boundingBox) {
             mesh.geometry.boundingBox.getCenter(_tempCenter);
             _tempWorldPos.copy(_tempCenter).applyMatrix4(mesh.matrixWorld);
          } else {
             mesh.getWorldPosition(_tempWorldPos);
          }
       } else {
          mesh.getWorldPosition(_tempWorldPos);
       }

       _tempScreenPos.copy(_tempWorldPos).project(camera);
       if (_tempScreenPos.z > 1) return;

       if (!preallocatedPositions.current[id]) {
          preallocatedPositions.current[id] = {
             worldPos: new THREE.Vector3(),
             screenPos: new THREE.Vector3()
          };
       }
       const cache = preallocatedPositions.current[id];
       cache.worldPos.copy(_tempWorldPos);
       cache.screenPos.copy(_tempScreenPos);

       active.push({
          id,
          worldPos: cache.worldPos,
          screenPos: cache.screenPos,
          isRight: _tempScreenPos.x >= 0,
          data
       });
    });

    const marginY = 0.2; 
    
    ['left', 'right'].forEach(side => {
       const isRight = side === 'right';
       const group = active.filter(a => a.isRight === isRight);
       group.sort((a, b) => b.screenPos.y - a.screenPos.y);
       
       for (let i = 0; i < group.length - 1; i++) {
          const current = group[i];
          const next = group[i+1];
          if (current.screenPos.y - next.screenPos.y < marginY) {
             next.screenPos.y = current.screenPos.y - marginY;
          }
       }
    });

    active.forEach(item => {
       const sliderVal = item.data.offset || 60;
       const horizontalOffset = 0.4 + (sliderVal / 400); 
       
       const ndcX = item.isRight ? horizontalOffset : -horizontalOffset;
       
       _tempNdc.set(ndcX, item.screenPos.y, item.screenPos.z);
       const labelWorldPos = _tempNdc.unproject(camera);

       _tempLocalStart.copy(item.worldPos).applyMatrix4(_tempMatrix);
       _tempLocalEnd.copy(labelWorldPos).applyMatrix4(_tempMatrix);

       const group = labelGroupsRef.current[item.id];
       if (group) {
          group.position.copy(_tempLocalEnd);
       }

       const line = lineRefs.current[item.id];
       if (line && line.geometry) {
          const p = progressRefs.current[item.id] || 1;
          _tempCurrentEnd.lerpVectors(_tempLocalStart, _tempLocalEnd, p);
          
          if (line.geometry.setPositions) {
             line.geometry.setPositions([
                _tempLocalStart.x, _tempLocalStart.y, _tempLocalStart.z,
                _tempCurrentEnd.x, _tempCurrentEnd.y, _tempCurrentEnd.z
             ]);
          }
       }
    });
  });

  if (!showAnnotations) return null;

  return (
    <group ref={groupRef}>
       {customParts.map(id => {
          const data = partAnnotations[id];
          if (!data || (!data.title && !data.description)) return null;
          
          return (
             <React.Fragment key={id}>
                <Line 
                   ref={(el: any) => (lineRefs.current[id] = el)}
                   points={[[0,0,0], [0,0,0]]} 
                   color="white"
                   lineWidth={2} 
                   transparent
                   opacity={0.6}
                   depthTest={false} // Always on top for 3D overlay
                   renderOrder={998}
                />
                
                 <group ref={(el) => { if(el) labelGroupsRef.current[id] = el; }}>
                   {use3DLabels ? (
                      <ThreeLabel data={data} isSelected={selectedPart === id} />
                   ) : (
                      <Html distanceFactor={8} zIndexRange={[100, 0]} center>
                          <div 
                            className="flex flex-col transition-all duration-300 origin-center"
                            style={{ transform: `scale(${labelSize * (selectedPart === id ? 1.1 : 1.0)})`, transformOrigin: 'center' }}
                          >
                            <div className={`
                                px-3 py-1.5 rounded backdrop-blur-md border shadow-lg flex flex-col gap-0.5
                                ${selectedPart === id ? 'bg-blue-900/80 border-blue-400' : 'bg-zinc-900/80 border-white/20'}
                            `}>
                                {data.title && (
                                  <span className="text-white text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                                      {data.title}
                                  </span>
                                )}
                                {data.description && (
                                  <span className="text-zinc-300 text-[10px] leading-snug max-w-[140px]">
                                      {data.description}
                                  </span>
                                )}
                            </div>
                          </div>
                      </Html>
                   )}
                </group>
             </React.Fragment>
          );
       })}
    </group>
  );
};

const useVideoTexture = (stream: MediaStream | null) => {
  const [videoTexture, setVideoTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!stream) {
      setVideoTexture(null);
      return;
    }

    const vid = document.createElement('video');
    vid.srcObject = stream;
    vid.playsInline = true;
    vid.muted = true;
    vid.loop = true;
    
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    vid.play().catch(e => console.warn("Video play interrupted", e));
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    setVideoTexture(texture);

    let animationFrameId: number;
    let isMounted = true;

    const updateLoop = () => {
      if (!isMounted) return;

      if (vid.readyState >= vid.HAVE_CURRENT_DATA) {
        const vw = vid.videoWidth;
        const vh = vid.videoHeight;
        if (vw > 0 && vh > 0 && ctx) {
          const inputSize = Math.min(vw, vh);
          const sx = (vw - inputSize) / 2;
          const sy = (vh - inputSize) / 2;
          ctx.drawImage(vid, sx, sy, inputSize, inputSize, 0, 0, 512, 512);
          texture.needsUpdate = true;
        }
      }

      animationFrameId = requestAnimationFrame(updateLoop);
    };

    updateLoop();

    return () => {
      isMounted = false;
      cancelAnimationFrame(animationFrameId);
      vid.pause();
      vid.srcObject = null;
      texture.dispose();
      setVideoTexture(null);
    };
  }, [stream]);

  return videoTexture;
};

// --- Individual Shoe Part Component ---
const ShoePartMesh = ({ id, geometry, position, scale, explodeOffset, interactive = true, videoTexture }: any) => {
  // Use Specific Selectors to avoid unnecessary re-renders
  const selectPart = useStore(s => s.selectPart);
  const hoverPart = useStore(s => s.hoverPart);
  const toggleSelectPartMulti = useStore(s => s.toggleSelectPartMulti);
  const materials = useStore(s => s.materials);
  const isExploded = useStore(s => s.isExploded);

  const isVisible = useStore(s => s.partVisibility[id] !== false);
  const matId = useStore(s => s.partMaterials[id]);
  const isSelected = useStore(s => s.selectedPart === id);
  const isHovered = useStore(s => s.hoveredPart === id);
  const config = useStore(s => s.partConfigs[id] || DEFAULT_CONFIG);
  const wireframeEnabled = useStore(s => s.wireframeEnabled);

  // Gizmo actions and settings
  const isTransforming = useStore(s => s.isTransforming);
  const transformMode = useStore(s => s.transformMode);
  const showTransformGizmo = useStore(s => s.showTransformGizmo);
  const transformGizmoSize = useStore(s => s.transformGizmoSize);
  const updatePartConfig = useStore(s => s.updatePartConfig);
  const setIsDragging = useStore(s => s.setIsDragging);
  const isDragging = useStore(s => s.isDragging);

  const meshRef = useRef<THREE.Mesh>(null);
  const isDraggingGizmo = useRef(false);

  const material = useMemo(() => {
    return getThreeMaterial(matId, materials, config, videoTexture, wireframeEnabled);
  }, [matId, materials, videoTexture, config, wireframeEnabled]);

  // Create unique geometry for each part based on its exact scale dimensions
  // This completely eliminates non-uniform scaling / stretching of the selection outline
  const partGeometry = useMemo(() => {
    const s = Array.isArray(scale) ? scale : [scale, scale, scale];
    return new THREE.BoxGeometry(s[0], s[1], s[2]);
  }, [scale]);

  // Clean up geometry on unmount to prevent GPU memory leaks
  useEffect(() => {
    return () => {
      partGeometry.dispose();
    };
  }, [partGeometry]);

  // Capture base scale (uniform [1, 1, 1] since dimensions are baked in geometry)
  const baseScale = useMemo(() => {
     return new THREE.Vector3(1, 1, 1);
  }, []);

  const meshScale = config.meshScale !== undefined ? config.meshScale : 1;
  const currentExpansion = useRef(0);
  const justFinishedDragging = useRef(false);

  const isDraggingMesh = useRef(false);
  const dragPlane = useMemo(() => new THREE.Plane(), []);
  const dragOffset = useMemo(() => new THREE.Vector3(), []);
  const intersection = useMemo(() => new THREE.Vector3(), []);
  const { camera, raycaster } = useThree();

  const onMeshPointerDown = useCallback((e: any) => {
      if (!interactive || !isSelected || transformMode !== 'translate') return;
      e.stopPropagation();
      (e.target as any).setPointerCapture(e.pointerId);
      
      isDraggingMesh.current = true;
      setIsDragging(true);
      
      const normal = new THREE.Vector3();
      camera.getWorldDirection(normal);
      normal.negate();
      
      if (meshRef.current) {
          dragPlane.setFromNormalAndCoplanarPoint(normal, meshRef.current.position);
          if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
              dragOffset.copy(meshRef.current.position).sub(intersection);
          }
      }
      
      const controls = (window as any).controls;
      if (controls) controls.enabled = false;
  }, [isSelected, interactive, transformMode, setIsDragging, camera, raycaster, dragPlane, dragOffset, intersection]);

  const onMeshPointerMove = useCallback((e: any) => {
      if (!isDraggingMesh.current || !meshRef.current) return;
      e.stopPropagation();

      if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
          const newPos = intersection.clone().add(dragOffset);
          meshRef.current.position.copy(newPos);
      }
  }, [dragPlane, dragOffset, intersection, raycaster.ray]);

  const onMeshPointerUp = useCallback((e: any) => {
      if (!isDraggingMesh.current) return;
      isDraggingMesh.current = false;
      setIsDragging(false);
      (e.target as any).releasePointerCapture(e.pointerId);
      
      const controls = (window as any).controls;
      if (controls) controls.enabled = true;

      if (meshRef.current) {
          justFinishedDragging.current = true;
          setTimeout(() => { justFinishedDragging.current = false; }, 100);

          const expansion = currentExpansion.current > 0.05 ? currentExpansion.current : 1.0;
          const newOffset: [number, number, number] = [
              (meshRef.current.position.x - position[0]) / expansion,
              (meshRef.current.position.y - position[1]) / expansion,
              (meshRef.current.position.z - position[2]) / expansion
          ];
          updatePartConfig(id, { explosionOffset: newOffset });
      }
  }, [id, position, setIsDragging, updatePartConfig]);

  useEffect(() => {
    return () => {
      setIsDragging(false);
    };
  }, [setIsDragging]);

  const lastConfigSignature = useRef<string>("");
  const isSettled = useRef(false);

  useFrame((state, delta) => {
    if (meshRef.current) {
       const target = isExploded ? 1 : 0;
       
       const currentSig = `${isExploded}_${config.explosionOffset?.join(',')}_${config.meshScale}_${config.meshRotation?.join(',')}`;
       const isDraggingActive = isDraggingGizmo.current || justFinishedDragging.current;

       if (isSettled.current && currentSig === lastConfigSignature.current && !isDraggingActive) {
          return;
       }

       currentExpansion.current = THREE.MathUtils.lerp(currentExpansion.current, target, delta * 4);
       if (Math.abs(currentExpansion.current - target) < 0.001) {
          currentExpansion.current = target;
       }
       
       // Position - Only set if not actively being dragged by 3D transform cursor
       if (!isDraggingGizmo.current && !justFinishedDragging.current) {
         let finalOffset = explodeOffset;
         if (config.explosionOffset) {
             finalOffset = config.explosionOffset;
         }
         
         if (finalOffset) {
            meshRef.current.position.x = position[0] + (finalOffset[0] * currentExpansion.current);
            meshRef.current.position.y = position[1] + (finalOffset[1] * currentExpansion.current);
            meshRef.current.position.z = position[2] + (finalOffset[2] * currentExpansion.current);
         }
       }
       
       // Scale - Only apply scaling factor when exploded, and only if not dragging
       if (!isDraggingGizmo.current && !justFinishedDragging.current) {
         const currentScaleFactor = THREE.MathUtils.lerp(1, meshScale, currentExpansion.current);
         meshRef.current.scale.copy(baseScale).multiplyScalar(currentScaleFactor);
       }

       // Rotation - Interpolate to saved rotation when exploded, reset otherwise
       if (!isDraggingGizmo.current && !justFinishedDragging.current) {
         const targetRot = config.meshRotation || [0, 0, 0];
         const finalRotX = isExploded ? targetRot[0] : 0;
         const finalRotY = isExploded ? targetRot[1] : 0;
         const finalRotZ = isExploded ? targetRot[2] : 0;

         meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, finalRotX, delta * 6);
         meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, finalRotY, delta * 6);
         meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, finalRotZ, delta * 6);

         if (Math.abs(meshRef.current.rotation.x - finalRotX) < 0.001 &&
             Math.abs(meshRef.current.rotation.y - finalRotY) < 0.001 &&
             Math.abs(meshRef.current.rotation.z - finalRotZ) < 0.001) {
             meshRef.current.rotation.x = finalRotX;
             meshRef.current.rotation.y = finalRotY;
             meshRef.current.rotation.z = finalRotZ;
         }
       }

       const targetRot = config.meshRotation || [0, 0, 0];
       const finalRotX = isExploded ? targetRot[0] : 0;
       const rotationSettled = Math.abs(meshRef.current.rotation.x - finalRotX) < 0.002;

       if (currentExpansion.current === target && rotationSettled && !isDraggingActive) {
          isSettled.current = true;
          lastConfigSignature.current = currentSig;
       } else {
          isSettled.current = false;
       }
    }
  });

  useEffect(() => {
    if (isHovered && !isSelected) {
      material.emissive = new THREE.Color('#333333');
      material.emissiveIntensity = 0.2;
    } else {
      material.emissive = new THREE.Color('#000000');
      material.emissiveIntensity = 0;
    }
  }, [isHovered, isSelected, material]);

  const [mesh, setMesh] = useState<THREE.Mesh | null>(null);

  const setMeshRef = useCallback((node: THREE.Mesh | null) => {
    meshRef.current = node;
    setMesh(node);
  }, []);

  if (isVisible === false) return null;

  const meshElement = (
    <mesh
      ref={setMeshRef}
      name={id}
      geometry={partGeometry}
      material={material}
      onPointerDown={onMeshPointerDown}
      onPointerMove={onMeshPointerMove}
      onPointerUp={onMeshPointerUp}
      onClick={interactive ? (e) => {
        e.stopPropagation();
        if (isDraggingMesh.current) return; // Don't select if we were dragging
        if (e.shiftKey) {
          toggleSelectPartMulti(id);
        } else {
          selectPart(isSelected ? null : id);
        }
      } : undefined}
      onPointerOver={interactive ? (e) => {
        e.stopPropagation();
        hoverPart(id);
        document.body.style.cursor = 'pointer';
      } : undefined}
      onPointerOut={interactive ? (e) => {
        e.stopPropagation();
        hoverPart(null);
        document.body.style.cursor = 'auto';
      } : undefined}
      castShadow
      receiveShadow
    >
      {isSelected && (
        <Edges 
          scale={1.0} 
          threshold={15} 
          color="#ff6600" 
        />
      )}
      {isSelected && <Dimensions geometry={partGeometry} />}
    </mesh>
  );

  return (
    <group>
      {meshElement}
      {isSelected && showTransformGizmo && isExploded && mesh && (
        <TransformControls
          object={mesh}
          mode={transformMode}
          size={transformGizmoSize}
          space="world"
          onMouseDown={() => {
            isDraggingGizmo.current = true;
            setIsDragging(true);
          }}
          onMouseUp={() => {
            isDraggingGizmo.current = false;
            setIsDragging(false);

            if (meshRef.current) {
              justFinishedDragging.current = true;
              setTimeout(() => { justFinishedDragging.current = false; }, 100);

              const posX = meshRef.current.position.x;
              const posY = meshRef.current.position.y;
              const posZ = meshRef.current.position.z;

              const expansion = currentExpansion.current > 0.05 ? currentExpansion.current : 1.0;
              const newOffset: [number, number, number] = [
                (posX - position[0]) / expansion,
                (posY - position[1]) / expansion,
                (posZ - position[2]) / expansion
              ];

              if (transformMode === 'translate') {
                updatePartConfig(id, { explosionOffset: newOffset });
              } else if (transformMode === 'scale') {
                const newScale = (meshRef.current.scale.x / baseScale.x + meshRef.current.scale.y / baseScale.y + meshRef.current.scale.z / baseScale.z) / 3;
                updatePartConfig(id, { meshScale: newScale });
              } else if (transformMode === 'rotate') {
                updatePartConfig(id, { meshRotation: [meshRef.current.rotation.x, meshRef.current.rotation.y, meshRef.current.rotation.z] });
              }
            }
          }}
        />
      )}
    </group>
  );
};

export const useModelLoader = (url: string, isObj: boolean, isUsdz: boolean, resources: any) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);

    const loadModelAsync = async () => {
      let finalUrl = url;
      const isGltf = !isObj && !isUsdz;

      if (isGltf && resources && Object.keys(resources).length > 0) {
        try {
          const response = await fetch(url);
          const text = await response.text();
          try {
            const gltfJson = JSON.parse(text);
            let modified = false;

            if (Array.isArray(gltfJson.buffers)) {
              gltfJson.buffers.forEach((buffer: any) => {
                if (buffer.uri && !buffer.uri.startsWith("data:")) {
                  const filename = buffer.uri.split("/").pop();
                  if (resources[filename]) {
                    buffer.uri = resources[filename];
                    modified = true;
                  } else {
                    const matchKey = Object.keys(resources).find(k => k.toLowerCase() === filename.toLowerCase());
                    if (matchKey) {
                      buffer.uri = resources[matchKey];
                      modified = true;
                    }
                  }
                }
              });
            }

            if (Array.isArray(gltfJson.images)) {
              gltfJson.images.forEach((image: any) => {
                if (image.uri && !image.uri.startsWith("data:")) {
                  const filename = image.uri.split("/").pop();
                  if (resources[filename]) {
                    image.uri = resources[filename];
                    modified = true;
                  } else {
                    const matchKey = Object.keys(resources).find(k => k.toLowerCase() === filename.toLowerCase());
                    if (matchKey) {
                      image.uri = resources[matchKey];
                      modified = true;
                    }
                  }
                }
              });
            }

            if (modified) {
              const updatedBlob = new Blob([JSON.stringify(gltfJson)], { type: "application/json" });
              finalUrl = URL.createObjectURL(updatedBlob);
            }
          } catch {
            // Not JSON (could be binary GLB), skip preprocessing
          }
        } catch (err) {
          console.error("Error pre-resolving GLTF assets:", err);
        }
      }

      if (!active) return;

      const manager = new THREE.LoadingManager();
      manager.setURLModifier((requestUrl: string) => {
        if (!resources) return requestUrl;
        const decodedUrl = decodeURIComponent(requestUrl);
        const matchKey = Object.keys(resources).find((key) => {
          const normalizedKey = key.replace(/^\.\//, "");
          return (
            decodedUrl.endsWith(normalizedKey) ||
            decodedUrl.includes("/" + normalizedKey)
          );
        });
        if (matchKey) {
          return resources[matchKey];
        }
        return requestUrl;
      });

      if (isUsdz) {
        const loader = new USDLoader(manager);
        loader.load(
          finalUrl,
          (loadedData: any) => {
            if (active) {
              setData(loadedData);
              setLoading(false);
            }
          },
          undefined,
          (err: any) => {
            console.error("USD Loader error:", err);
            if (active) {
              setError(err);
              setLoading(false);
            }
          }
        );
        return;
      }

      let loader: any;
      if (isObj) {
        loader = new OBJLoader(manager);
      } else {
        loader = new GLTFLoader(manager);
      }

      loader.load(
        finalUrl,
        (loadedData: any) => {
          if (active) {
            setData(loadedData);
            setLoading(false);
          }
        },
        undefined,
        (err: any) => {
          console.error("Error loading model:", err);
          if (active) {
            setError(err);
            setLoading(false);
          }
        }
      );
    };

    loadModelAsync();

    return () => {
      active = false;
    };
  }, [url, isObj, isUsdz, resources]);

  return { data, loading, error };
};

// --- RESTORED INTERACTIVE MODEL ---
const InteractiveModel = ({ url, isObj, isUsdz, customScale, customPosition, customRotation, interactive, videoTexture }: any) => {
  const setCustomParts = useStore(s => s.setCustomParts);
  const currentModel = useStore(s => s.currentModel);
  const resources = currentModel?.resources;
  
  const { data: scene, loading } = useModelLoader(url, isObj, isUsdz, resources);
  
  // High-robustness model normalization
  let model: any = null;
  if (scene) {
    if (scene.isObject3D) {
      model = scene;
    } else if (scene.scene && scene.scene.isObject3D) {
      model = scene.scene;
    } else if (scene.scenes && scene.scenes[0] && scene.scenes[0].isObject3D) {
      model = scene.scenes[0];
    } else if (typeof scene.traverse === 'function') {
      model = scene;
    } else if (scene.scene && typeof scene.scene.traverse === 'function') {
      model = scene.scene;
    } else {
      model = scene;
    }
  }

  const [sceneRef, setSceneRef] = useState<THREE.Group | null>(null);
  const initialPositions = useRef(new Map<string, THREE.Vector3>());
  const initialRotations = useRef(new Map<string, THREE.Euler>());
  const initialScales = useRef(new Map<string, THREE.Vector3>());
  
  // Auto-scaling state
  const [normalization, setNormalization] = useState({ scale: 1, position: [0, 0, 0] });

  // Parse parts and Calculate Normalization
  useEffect(() => {
    if (!model || typeof model.traverse !== 'function') return;
    const foundParts: string[] = [];
    model.traverse((child: any) => {
      if (child.isMesh) {
         child.castShadow = true;
         child.receiveShadow = true;
         if (!child.name) child.name = `part_${child.id}`;
         foundParts.push(child.name);
         initialPositions.current.set(child.uuid, child.position.clone());
         initialRotations.current.set(child.uuid, child.rotation.clone());
         initialScales.current.set(child.uuid, child.scale.clone());
      }
    });
    const unique = [...new Set(foundParts)];
    
    // Check against current store value before calling setter to avoid triggering store update loops
    const currentParts = useStore.getState().customParts;
    const isDifferent = unique.length !== currentParts.length || !unique.every((u, i) => u === currentParts[i]);
    
    if (isDifferent) {
       setCustomParts(unique);
    }
  }, [model, setCustomParts]);

  // Normalization Layout Effect
  useLayoutEffect(() => {
    if (!model || typeof model.updateMatrixWorld !== 'function') return;

    // We must reset transformations to get true bounding box of geometry
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    
    // Scale standardizer to 2.8 units on the longest dimension
    const maxDim = Math.max(size.x, size.y, size.z) || 1.0;
    const scale = 2.8 / maxDim;
    
    // Align bottom to Y=0 and Center X/Z
    const xOffset = -center.x * scale;
    const yOffset = -box.min.y * scale; 
    const zOffset = -center.z * scale;
    
    setNormalization((prev) => {
      const isScaleSame = Math.abs(prev.scale - scale) < 0.0001;
      const isPosSame = Math.abs(prev.position[0] - xOffset) < 0.0001 &&
                        Math.abs(prev.position[1] - yOffset) < 0.0001 &&
                        Math.abs(prev.position[2] - zOffset) < 0.0001;
      if (isScaleSame && isPosSame) {
        return prev;
      }
      return {
        scale: scale,
        position: [xOffset, yOffset, zOffset]
      };
    });
  }, [model]);

  // Load custom calibration settings for the current custom model
  const calibrations = useStore(s => s.modelCalibrations) || {};
  const calibration = currentModel ? (calibrations[currentModel.id] || {
    scale: 1.0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    positionX: 0,
    positionY: 0,
    positionZ: 0,
  }) : {
    scale: 1.0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    positionX: 0,
    positionY: 0,
    positionZ: 0,
  };

  // Combine auto-normalization with manual calibration overrides
  const finalScaleValue = normalization.scale * calibration.scale;
  const finalScale = [finalScaleValue, finalScaleValue, finalScaleValue];
  const finalPosition = [
    normalization.position[0] + calibration.positionX,
    normalization.position[1] + calibration.positionY,
    normalization.position[2] + calibration.positionZ
  ];
  const finalRotation = [
    calibration.rotationX,
    calibration.rotationY,
    calibration.rotationZ
  ];

  return (
    <group 
      ref={setSceneRef}
      position={finalPosition}
      rotation={finalRotation}
      scale={finalScale}
    >
       <InitialPositionsContext.Provider value={{
         initialPositions: initialPositions.current,
         initialRotations: initialRotations.current,
         initialScales: initialScales.current
       }}>
         <group
           scale={model ? [model.scale.x, model.scale.y, model.scale.z] : [1, 1, 1]}
           position={model ? [model.position.x, model.position.y, model.position.z] : [0, 0, 0]}
           rotation={model ? [model.rotation.x, model.rotation.y, model.rotation.z] : [0, 0, 0]}
         >
           {model && model.children?.map((child: any, i: number) => {
               return (
                 <RecursivePart 
                    key={child.uuid || i} 
                    object={child} 
                    interactive={interactive}
                    videoTexture={videoTexture}
                 />
               );
           })}
         </group>
       </InitialPositionsContext.Provider>
       {sceneRef && <AnnotationManager scene={sceneRef} />}
    </group>
  );
};

// Memoized mesh node component to prevent unnecessary updates
const RecursiveMeshPart = React.memo(({ object, interactive, videoTexture }: any) => {
    const { initialPositions, initialRotations, initialScales } = useContext(InitialPositionsContext);
    const id = object.name || object.uuid;
    
    const isSelected = useStore(s => s.selectedPart === id);
    const isHovered = useStore(s => s.hoveredPart === id);
    const isVisible = useStore(s => s.partVisibility[id] !== false);
    const matId = useStore(s => s.partMaterials[id]);
    const config = useStore(s => s.partConfigs[id] || DEFAULT_CONFIG);
    const materials = useStore(s => s.materials);
    const isExploded = useStore(s => s.isExploded);
    const wireframeEnabled = useStore(s => s.wireframeEnabled);

    const selectPart = useStore(s => s.selectPart);
    const hoverPart = useStore(s => s.hoverPart);
    const toggleSelectPartMulti = useStore(s => s.toggleSelectPartMulti);

    // Gizmo actions and settings
    const isTransforming = useStore(s => s.isTransforming);
    const transformMode = useStore(s => s.transformMode);
    const setIsDragging = useStore(s => s.setIsDragging);
    const showTransformGizmo = useStore(s => s.showTransformGizmo);
    const transformGizmoSize = useStore(s => s.transformGizmoSize);
    const updatePartConfig = useStore(s => s.updatePartConfig);
    const isDragging = useStore(s => s.isDragging);

    const material = useMemo(() => {
        if (!matId && object.material) {
            const baseMat = Array.isArray(object.material) ? object.material[0] : object.material;
            if (baseMat) {
                baseMat.wireframe = wireframeEnabled;
            }
            return object.material;
        }
        return getThreeMaterial(matId, materials, config, videoTexture, wireframeEnabled);
    }, [matId, materials, videoTexture, config, object.material, wireframeEnabled]);

    const meshRef = useRef<THREE.Mesh>(null);
    const isDraggingGizmo = useRef(false);

    const initialPos = initialPositions.get(object.uuid) || object.position.clone();
    const initialRot = initialRotations.get(object.uuid) || object.rotation.clone();
    const initialScl = initialScales.get(object.uuid) || object.scale.clone();

    const originalPosition = useRef(initialPos.clone());
    const originalRotation = useRef(initialRot.clone());
    const originalScale = useRef(initialScl.clone());

    useEffect(() => {
        object.position.copy(initialPos);
        object.rotation.copy(initialRot);
        object.scale.copy(initialScl);
    }, []);

    // Center geometry origin to visual center for better gizmo placement (Idempotent version)
    useLayoutEffect(() => {
        if (object && object.geometry && !object.userData.__pivotCentered) {
            // Force compute initial bounding box
            object.geometry.computeBoundingBox();
            if (!object.geometry.boundingBox) return;

            const center = new THREE.Vector3();
            object.geometry.boundingBox.getCenter(center);

            // If the geometry center is offset from the local origin (0,0,0)
            if (center.length() > 0.001) {
                // Clone geometry to avoid mutating shared assets between instances
                const geo = object.geometry.clone();
                
                // Shift geometry to center its origin
                geo.translate(-center.x, -center.y, -center.z);
                
                // Recompute bounding volumes after translation
                geo.computeBoundingBox();
                geo.computeBoundingSphere();

                // Compensate object position to keep the mesh visually in the same world/parent place
                // We move the object position by the center offset, transformed by the object's own transforms
                const pivotOffset = center.clone().multiply(object.scale).applyQuaternion(object.quaternion);
                object.position.add(pivotOffset);
                
                // Apply the new geometry
                object.geometry = geo;
                
                // Update refs used for animations/explosions
                originalPosition.current.copy(object.position);
            }

            object.userData.__pivotCentered = true;
        }
    }, [object]);
    
    const lastConfigSignature = useRef<string>("");
    const isSettled = useRef(false);

    const currentExpansion = useRef(0);
    const meshScale = config.meshScale !== undefined ? config.meshScale : 1;
    const justFinishedDragging = useRef(false);

    const isDraggingMesh = useRef(false);
    const dragPlane = useMemo(() => new THREE.Plane(), []);
    const dragOffset = useMemo(() => new THREE.Vector3(), []);
    const intersection = useMemo(() => new THREE.Vector3(), []);
    const { camera, raycaster } = useThree();

    const onMeshPointerDown = useCallback((e: any) => {
        if (!interactive || !isSelected || transformMode !== 'translate') return;
        e.stopPropagation();
        (e.target as any).setPointerCapture(e.pointerId);
        
        isDraggingMesh.current = true;
        setIsDragging(true);
        
        const normal = new THREE.Vector3();
        camera.getWorldDirection(normal);
        normal.negate();
        
        if (meshRef.current) {
            dragPlane.setFromNormalAndCoplanarPoint(normal, meshRef.current.position);
            if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
                dragOffset.copy(meshRef.current.position).sub(intersection);
            }
        }
        
        const controls = (window as any).controls;
        if (controls) controls.enabled = false;
    }, [isSelected, interactive, transformMode, setIsDragging, camera, raycaster, dragPlane, dragOffset, intersection]);

    const onMeshPointerMove = useCallback((e: any) => {
        if (!isDraggingMesh.current || !meshRef.current) return;
        e.stopPropagation();

        if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
            const newPos = intersection.clone().add(dragOffset);
            meshRef.current.position.copy(newPos);
        }
    }, [dragPlane, dragOffset, intersection, raycaster.ray]);

    const onMeshPointerUp = useCallback((e: any) => {
        if (!isDraggingMesh.current) return;
        isDraggingMesh.current = false;
        setIsDragging(false);
        (e.target as any).releasePointerCapture(e.pointerId);
        
        const controls = (window as any).controls;
        if (controls) controls.enabled = true;

        if (meshRef.current) {
            justFinishedDragging.current = true;
            setTimeout(() => { justFinishedDragging.current = false; }, 100);

            const expansion = currentExpansion.current > 0.05 ? currentExpansion.current : 1.0;
            const newOffset: [number, number, number] = [
                (meshRef.current.position.x - originalPosition.current.x) / expansion,
                (meshRef.current.position.y - originalPosition.current.y) / expansion,
                (meshRef.current.position.z - originalPosition.current.z) / expansion
            ];
            updatePartConfig(id, { explosionOffset: newOffset });
        }
    }, [id, setIsDragging, updatePartConfig]);

    useEffect(() => {
        return () => {
            setIsDragging(false);
        };
    }, [setIsDragging]);

    useFrame((state, delta) => {
        if (meshRef.current) {
           const target = isExploded ? 1 : 0;
           
           const currentSig = `${isExploded}_${config.explosionOffset?.join(',')}_${config.meshScale}_${config.meshRotation?.join(',')}`;
           const isDraggingActive = isDraggingGizmo.current || justFinishedDragging.current;

           if (isSettled.current && currentSig === lastConfigSignature.current && !isDraggingActive) {
              return;
           }

           currentExpansion.current = THREE.MathUtils.lerp(currentExpansion.current, target, delta * 4);
           if (Math.abs(currentExpansion.current - target) < 0.001) {
              currentExpansion.current = target;
           }
           
           // Position
           if (!isDraggingGizmo.current && !justFinishedDragging.current) {
             let finalOffset = config.explosionOffset || [0,0,0];
             
             if (finalOffset[0] !== 0 || finalOffset[1] !== 0 || finalOffset[2] !== 0) {
                meshRef.current.position.x = originalPosition.current.x + (finalOffset[0] * currentExpansion.current);
                meshRef.current.position.y = originalPosition.current.y + (finalOffset[1] * currentExpansion.current);
                meshRef.current.position.z = originalPosition.current.z + (finalOffset[2] * currentExpansion.current);
             } else {
                meshRef.current.position.x = originalPosition.current.x;
                meshRef.current.position.y = originalPosition.current.y;
                meshRef.current.position.z = originalPosition.current.z;
             }
           }
           
           // Scale - Interpolate between 1.0 (default) and meshScale based on expansion state
           if (!isDraggingGizmo.current && !justFinishedDragging.current) {
               const currentScaleFactor = THREE.MathUtils.lerp(1, meshScale, currentExpansion.current);
               meshRef.current.scale.copy(originalScale.current).multiplyScalar(currentScaleFactor);
           }

           // Rotation - Interpolate to saved rotation when exploded, reset to original otherwise
           if (!isDraggingGizmo.current && !justFinishedDragging.current) {
               const targetRot = config.meshRotation || [originalRotation.current.x, originalRotation.current.y, originalRotation.current.z];
               const finalRotX = isExploded ? targetRot[0] : originalRotation.current.x;
               const finalRotY = isExploded ? targetRot[1] : originalRotation.current.y;
               const finalRotZ = isExploded ? targetRot[2] : originalRotation.current.z;

               meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, finalRotX, delta * 6);
               meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, finalRotY, delta * 6);
               meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, finalRotZ, delta * 6);

               if (Math.abs(meshRef.current.rotation.x - finalRotX) < 0.001 &&
                   Math.abs(meshRef.current.rotation.y - finalRotY) < 0.001 &&
                   Math.abs(meshRef.current.rotation.z - finalRotZ) < 0.001) {
                   meshRef.current.rotation.x = finalRotX;
                   meshRef.current.rotation.y = finalRotY;
                   meshRef.current.rotation.z = finalRotZ;
               }
           }

           const targetRot = config.meshRotation || [originalRotation.current.x, originalRotation.current.y, originalRotation.current.z];
           const finalRotX = isExploded ? targetRot[0] : originalRotation.current.x;
           const rotationSettled = Math.abs(meshRef.current.rotation.x - finalRotX) < 0.002;

           if (currentExpansion.current === target && rotationSettled && !isDraggingActive) {
              isSettled.current = true;
              lastConfigSignature.current = currentSig;
           } else {
              isSettled.current = false;
           }
        }
    });

    const [mesh, setMesh] = useState<THREE.Mesh | null>(null);

    const setMeshRef = useCallback((node: THREE.Mesh | null) => {
        meshRef.current = node;
        setMesh(node);
    }, []);

    if (!isVisible) return null;

    const meshElement = (
      <mesh
          ref={setMeshRef}
          name={id}
          geometry={object.geometry}
          material={material}
          castShadow
          receiveShadow
          onPointerDown={onMeshPointerDown}
          onPointerMove={onMeshPointerMove}
          onPointerUp={onMeshPointerUp}
          onClick={interactive ? (e) => {
              e.stopPropagation();
              if (isDraggingMesh.current) return; // Don't select if we were dragging
              if (e.shiftKey) {
                toggleSelectPartMulti(id);
              } else {
                selectPart(isSelected ? null : id);
              }
          } : undefined}
          onPointerOver={interactive ? (e) => {
              e.stopPropagation();
              hoverPart(id);
              document.body.style.cursor = 'pointer';
          } : undefined}
          onPointerOut={interactive ? (e) => {
              e.stopPropagation();
              hoverPart(null);
              document.body.style.cursor = 'auto';
          } : undefined}
      >
          {isSelected && (
            <Edges 
              scale={1.0} 
              threshold={15} 
              color="#ff6600" 
            />
          )}
          {isSelected && <Dimensions geometry={object.geometry} />}
      </mesh>
    );

    return (
        <group>
          {meshElement}
          {isSelected && showTransformGizmo && isExploded && mesh && (
            <TransformControls
              object={mesh}
              mode={transformMode}
              size={transformGizmoSize}
              space="world"
              onMouseDown={() => {
                isDraggingGizmo.current = true;
                setIsDragging(true);
              }}
              onMouseUp={() => {
                isDraggingGizmo.current = false;
                setIsDragging(false);

                if (meshRef.current) {
                  justFinishedDragging.current = true;
                  setTimeout(() => { justFinishedDragging.current = false; }, 100);

                  const posX = meshRef.current.position.x;
                  const posY = meshRef.current.position.y;
                  const posZ = meshRef.current.position.z;

                  const expansion = currentExpansion.current > 0.05 ? currentExpansion.current : 1.0;
                  const newOffset: [number, number, number] = [
                    (posX - originalPosition.current.x) / expansion,
                    (posY - originalPosition.current.y) / expansion,
                    (posZ - originalPosition.current.z) / expansion
                  ];

                  if (transformMode === 'translate') {
                    updatePartConfig(id, { explosionOffset: newOffset });
                  } else if (transformMode === 'scale') {
                    const newScale = (meshRef.current.scale.x / originalScale.current.x + 
                                      meshRef.current.scale.y / originalScale.current.y + 
                                      meshRef.current.scale.z / originalScale.current.z) / 3;
                    updatePartConfig(id, { meshScale: newScale });
                  } else if (transformMode === 'rotate') {
                    updatePartConfig(id, { meshRotation: [meshRef.current.rotation.x, meshRef.current.rotation.y, meshRef.current.rotation.z] });
                  }
                }
              }}
            />
          )}
        </group>
    );
});

// Helper for InteractiveModel to traverse and render interactive parts
const RecursivePart = ({ object, interactive, videoTexture }: any) => {
    if (!object) return null;

    if (object.isMesh) {
        return (
            <RecursiveMeshPart 
                object={object} 
                interactive={interactive} 
                videoTexture={videoTexture} 
            />
        );
    }

    return (
        <group position={object.position} rotation={object.rotation} scale={object.scale}>
            {object.children?.map((child: any, i: number) => (
                <RecursivePart 
                    key={child.uuid || i} 
                    object={child} 
                    interactive={interactive}
                    videoTexture={videoTexture}
                />
            ))}
        </group>
    );
}

const DefaultShoe = ({ customScale, customPosition, customRotation, interactive, videoTexture }: any) => {
  const setCustomParts = useStore(s => s.setCustomParts);
  const [sceneRef, setSceneRef] = useState<THREE.Group | null>(null);
  
  useEffect(() => {
     setCustomParts(['sole', 'midsole', 'upper', 'heel', 'tongue', 'laces', 'logo']); 
  }, [setCustomParts]);

  const parts = useMemo(() => [
    { id: 'sole',    pos: [0, 0.1, 0],     scale: [1.2, 0.2, 3.0], explode: [0, -0.4, 0] },
    { id: 'midsole', pos: [0, 0.35, 0],    scale: [1.2, 0.3, 3.0], explode: [0, -0.2, 0] },
    { id: 'upper',   pos: [0, 0.8, 0.2],   scale: [1.1, 0.6, 2.0], explode: [0, 0.1, 0.2] },
    { id: 'heel',    pos: [0, 0.9, -1.0],  scale: [1.1, 0.8, 0.8], explode: [0, 0.2, -0.5] },
    { id: 'tongue',  pos: [0, 1.15, 0.5],  scale: [0.9, 0.1, 1.2], explode: [0, 0.6, 0.1] },
    { id: 'laces',   pos: [0, 1.25, 0.5],  scale: [1.0, 0.05, 1.0], explode: [0, 0.7, 0] },
    { id: 'logo',    pos: [0.6, 0.8, 0],   scale: [0.1, 0.4, 1.0], explode: [0.5, 0, 0] },
  ], []);

  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  return (
    <group 
      ref={setSceneRef}
      position={customPosition ? [customPosition[0], customPosition[1], customPosition[2]] : [0,0,0]}
      rotation={customRotation ? [customRotation[0], customRotation[1], customRotation[2]] : [0,0,0]}
      scale={customScale ? [customScale, customScale, customScale] : [1,1,1]}
    >
       {parts.map(p => (
         <ShoePartMesh
           key={p.id}
           id={p.id}
           geometry={geometry}
           position={p.pos}
           scale={p.scale}
           explodeOffset={p.explode}
           interactive={interactive}
           videoTexture={videoTexture}
         />
       ))}
       {sceneRef && <AnnotationManager scene={sceneRef} />}
    </group>
  );
};

export const ShoeModel = ({ interactive = true, customScale, customPosition, customRotation }: any) => {
  const currentModel = useStore(s => s.currentModel);
  const activeVideoStream = useStore(s => s.activeVideoStream);
  const videoTexture = useVideoTexture(activeVideoStream);

  if (!currentModel) {
    return null; // STARTUP BLANK
  }

  if (currentModel.id === 'demo-shoe') {
     return (
       <DefaultShoe 
         customScale={customScale}
         customPosition={customPosition}
         customRotation={customRotation}
         interactive={interactive}
         videoTexture={videoTexture}
       />
     );
  }

  const isObj = currentModel.extension === 'obj';
  const isUsdz = currentModel.extension === 'usdz';
  return (
    <InteractiveModel 
      url={currentModel.url} 
      isObj={isObj} 
      isUsdz={isUsdz}
      customScale={customScale}
      customPosition={customPosition}
      customRotation={customRotation}
      interactive={interactive} 
      videoTexture={videoTexture}
    />
  );
};