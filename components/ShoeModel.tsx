// @ts-nocheck
import React, { useRef, useMemo, useEffect, useState, useLayoutEffect } from 'react';
// @ts-ignore
import { Html, Outlines, Edges, Line, Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
// @ts-ignore
import { useLoader, useFrame, useThree } from '@react-three/fiber';
import { OBJLoader } from 'three-stdlib';
import { GLTFLoader } from 'three-stdlib';
import { useStore } from '../store';
import { SHOE_PARTS } from '../constants';
import { Material, TextureConfig } from '../types';

// Texture Cache to prevent reloading same URL
const textureCache: Record<string, THREE.Texture> = {};
const clonedTextureCache: Record<string, THREE.Texture> = {};

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
  videoTexture?: THREE.Texture | null
) => {
  const matDef = allMaterials?.find(m => m.id === matId);
  if (!matDef) return new THREE.MeshStandardMaterial({ color: '#cccccc' });

  const params: THREE.MeshStandardMaterialParameters = {
    color: matDef.color,
    roughness: config.roughness,
    metalness: matDef.metalness,
  };

  const scale = config.scale;

  const loadMap = (url: string) => {
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
    clone.needsUpdate = true;
    clonedTextureCache[cacheKey] = clone;
    return clone;
  };

  if (matDef.type === 'video' && videoTexture) {
     videoTexture.repeat.set(scale, scale);
     videoTexture.wrapS = THREE.RepeatWrapping;
     videoTexture.wrapT = THREE.RepeatWrapping;
     params.map = videoTexture;
     params.color = new THREE.Color('#ffffff');
  } else if (matDef.textureUrl) {
     params.map = loadMap(matDef.textureUrl);
  }
  
  if (matDef.normalMapUrl) {
     params.normalMap = loadMap(matDef.normalMapUrl);
     params.normalScale = new THREE.Vector2(config.normalScale, config.normalScale);
  }
  
  if (matDef.roughnessMapUrl) params.roughnessMap = loadMap(matDef.roughnessMapUrl);
  if (matDef.metalnessMapUrl) params.metalnessMap = loadMap(matDef.metalnessMapUrl);
  if (matDef.aoMapUrl) {
     params.aoMap = loadMap(matDef.aoMapUrl);
     params.aoMapIntensity = 1.0;
  }
  
  if (matDef.displacementMapUrl) {
    params.displacementMap = loadMap(matDef.displacementMapUrl);
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

  return material;
};

// Memoized Dimensions to prevent update loops
const Dimensions = React.memo(({ geometry }: { geometry: THREE.BufferGeometry }) => {
  const showMeasurements = useStore(s => s.showMeasurements);
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
    
    setDims(size);
    setCenter(c);
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
         <div className="transform translate-x-2 translate-y-2 bg-zinc-900/90 text-white text-[10px] px-2 py-1 rounded border border-blue-500/30 whitespace-nowrap flex items-center gap-1 shadow-xl pointer-events-none">
           <span className="text-blue-400 font-bold">X</span>
           <span className="font-mono">{(dims.x * scale).toFixed(0)}mm</span>
         </div>
       </Html>
       
       <Html position={[-dims.x/2, dims.y/2, dims.z/2]} zIndexRange={[100, 0]}>
         <div className="transform -translate-x-full -translate-y-full mr-2 mb-2 bg-zinc-900/90 text-white text-[10px] px-2 py-1 rounded border border-green-500/30 whitespace-nowrap flex items-center gap-1 shadow-xl pointer-events-none">
           <span className="text-green-400 font-bold">Y</span>
           <span className="font-mono">{(dims.y * scale).toFixed(0)}mm</span>
         </div>
       </Html>
       
       <Html position={[-dims.x/2, -dims.y/2, -dims.z/2]} zIndexRange={[100, 0]}>
         <div className="transform -translate-x-full translate-y-2 mr-2 bg-zinc-900/90 text-white text-[10px] px-2 py-1 rounded border border-red-500/30 whitespace-nowrap flex items-center gap-1 shadow-xl pointer-events-none">
           <span className="text-red-400 font-bold">Z</span>
           <span className="font-mono">{(dims.z * scale).toFixed(0)}mm</span>
         </div>
       </Html>
    </group>
  );
});

// --- 3D Label Component for Video Recording & Snapshot ---
const ThreeLabel = ({ data, isSelected }: { data: any, isSelected: boolean }) => {
  return (
    <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
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
  
  const { camera } = useThree();
  
  const progressRefs = useRef<Record<string, number>>({});
  const lastSelectedRef = useRef<string | null>(null);

  const labelGroupsRef = useRef<Record<string, THREE.Group>>({});
  const lineRefs = useRef<Record<string, any>>({}); 
  const groupRef = useRef<THREE.Group>(null);

  // Switch to 3D Labels during recording OR snapshotting
  const use3DLabels = recordingStatus === 'recording' || isSnapshotting;

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

       active.push({
          id,
          worldPos: _tempWorldPos.clone(),
          screenPos: _tempScreenPos.clone(),
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
                          <div className={`flex flex-col ${selectedPart === id ? 'scale-110' : 'scale-100'} transition-transform duration-300 origin-center`}>
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
  const selectedPart = useStore(s => s.selectedPart);
  const selectPart = useStore(s => s.selectPart);
  const hoverPart = useStore(s => s.hoverPart);
  const hoveredPart = useStore(s => s.hoveredPart);
  const partMaterials = useStore(s => s.partMaterials);
  const materials = useStore(s => s.materials);
  const partVisibility = useStore(s => s.partVisibility);
  const partConfigs = useStore(s => s.partConfigs);
  const isExploded = useStore(s => s.isExploded);

  const isVisible = partVisibility[id];
  const matId = partMaterials[id];
  const isSelected = selectedPart === id;
  const isHovered = hoveredPart === id;
  const config = partConfigs[id] || DEFAULT_CONFIG;

  const meshRef = useRef<THREE.Mesh>(null);

  const material = useMemo(() => {
    return getThreeMaterial(matId, materials, config, videoTexture);
  }, [matId, materials, videoTexture, config]);

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

  useFrame((state, delta) => {
    if (meshRef.current) {
       const target = isExploded ? 1 : 0;
       currentExpansion.current = THREE.MathUtils.lerp(currentExpansion.current, target, delta * 4);
       
       // Position
       let finalOffset = explodeOffset;
       if (config.explosionOffset) {
           finalOffset = config.explosionOffset;
       }
       
       if (finalOffset) {
          meshRef.current.position.x = position[0] + (finalOffset[0] * currentExpansion.current);
          meshRef.current.position.y = position[1] + (finalOffset[1] * currentExpansion.current);
          meshRef.current.position.z = position[2] + (finalOffset[2] * currentExpansion.current);
       }
       
       // Scale - Only apply scaling factor when exploded
       const currentScaleFactor = THREE.MathUtils.lerp(1, meshScale, currentExpansion.current);
       meshRef.current.scale.copy(baseScale).multiplyScalar(currentScaleFactor);
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

  if (isVisible === false) return null;

  return (
    <group>
      <mesh
        ref={meshRef}
        name={id}
        geometry={partGeometry}
        material={material}
        position={position}
        scale={baseScale} // Initial scale, useFrame updates it
        onClick={interactive ? (e) => {
          e.stopPropagation();
          selectPart(isSelected ? null : id);
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
    </group>
  );
};

// --- RESTORED INTERACTIVE MODEL ---
const InteractiveModel = ({ url, isObj, customScale, customPosition, customRotation, interactive, videoTexture }: any) => {
  const setCustomParts = useStore(s => s.setCustomParts);
  const partMaterials = useStore(s => s.partMaterials);
  const materials = useStore(s => s.materials);
  const partVisibility = useStore(s => s.partVisibility);
  const partConfigs = useStore(s => s.partConfigs);
  
  const scene = useLoader(isObj ? OBJLoader : GLTFLoader, url);
  const model = isObj ? scene : scene.scene;
  const [sceneRef, setSceneRef] = useState<THREE.Group | null>(null);
  
  // Auto-scaling state
  const [normalization, setNormalization] = useState({ scale: 1, position: [0, 0, 0] });

  // Parse parts and Calculate Normalization
  useEffect(() => {
    if (!model) return;
    const foundParts: string[] = [];
    model.traverse((child: any) => {
      if (child.isMesh) {
         child.castShadow = true;
         child.receiveShadow = true;
         if (!child.name) child.name = `part_${child.id}`;
         foundParts.push(child.name);
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
    if (!model) return;

    // We must reset transformations to get true bounding box of geometry
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    
    const maxDim = Math.max(size.x, size.y, size.z);
    
    // Target size to match default shoe (approx 3.5 units long)
    const TARGET_SIZE = 3.5;
    let scale = 1;
    if (maxDim > 0) {
       scale = TARGET_SIZE / maxDim;
    }
    
    // Align bottom to Y=0 and Center X/Z
    const xOffset = -center.x * scale;
    const yOffset = -box.min.y * scale; 
    const zOffset = -center.z * scale;
    
    setNormalization({
       scale: scale,
       position: [xOffset, yOffset, zOffset]
    });
  }, [model]);

  // Use props if provided, else use normalization
  const finalScale = customScale ? [customScale, customScale, customScale] : [normalization.scale, normalization.scale, normalization.scale];
  const finalPosition = customPosition 
      ? [customPosition[0], customPosition[1], customPosition[2]] 
      : normalization.position;
  const finalRotation = customRotation ? [customRotation[0], customRotation[1], customRotation[2]] : [0,0,0];

  return (
    <group 
      ref={setSceneRef}
      position={finalPosition}
      rotation={finalRotation}
      scale={finalScale}
    >
       {model && model.children.map((child: any, i: number) => {
           return (
             <RecursivePart 
                key={child.uuid || i} 
                object={child} 
                interactive={interactive}
                partMaterials={partMaterials}
                materials={materials}
                partVisibility={partVisibility}
                partConfigs={partConfigs}
                videoTexture={videoTexture}
             />
           );
       })}
       {sceneRef && <AnnotationManager scene={sceneRef} />}
    </group>
  );
};

// Helper for InteractiveModel to traverse and render interactive parts
const RecursivePart = ({ object, interactive, partMaterials, materials, partVisibility, partConfigs, videoTexture }: any) => {
    const selectedPart = useStore(s => s.selectedPart);
    const selectPart = useStore(s => s.selectPart);
    const hoverPart = useStore(s => s.hoverPart);
    const hoveredPart = useStore(s => s.hoveredPart);
    const isExploded = useStore(s => s.isExploded);

    if (!object) return null;

    if (object.isMesh) {
        const id = object.name;
        const isVisible = partVisibility[id] !== false;
        const matId = partMaterials[id];
        const isSelected = selectedPart === id;
        const isHovered = hoveredPart === id;
        const config = partConfigs[id] || DEFAULT_CONFIG;
        
        const material = useMemo(() => {
            return getThreeMaterial(matId, materials, config, videoTexture);
        }, [matId, materials, videoTexture, config]);

        const meshRef = useRef<THREE.Mesh>(null);
        const originalPosition = useRef(object.position.clone());
        const originalScale = useRef(object.scale.clone());
        const currentExpansion = useRef(0);
        
        const meshScale = config.meshScale !== undefined ? config.meshScale : 1;

        useFrame((state, delta) => {
            if (meshRef.current) {
               const target = isExploded ? 1 : 0;
               currentExpansion.current = THREE.MathUtils.lerp(currentExpansion.current, target, delta * 4);
               
               // Position
               let finalOffset = config.explosionOffset || [0,0,0];
               
               if (finalOffset[0] !== 0 || finalOffset[1] !== 0 || finalOffset[2] !== 0) {
                  meshRef.current.position.x = originalPosition.current.x + (finalOffset[0] * currentExpansion.current);
                  meshRef.current.position.y = originalPosition.current.y + (finalOffset[1] * currentExpansion.current);
                  meshRef.current.position.z = originalPosition.current.z + (finalOffset[2] * currentExpansion.current);
               }
               
               // Scale - Interpolate between 1.0 (default) and meshScale based on expansion state
               const currentScaleFactor = THREE.MathUtils.lerp(1, meshScale, currentExpansion.current);
               meshRef.current.scale.copy(originalScale.current).multiplyScalar(currentScaleFactor);
            }
        });

        if (!isVisible) return null;

        return (
            <mesh
                ref={meshRef}
                name={id}
                geometry={object.geometry}
                material={material}
                position={object.position}
                rotation={object.rotation}
                scale={object.scale} // Initial scale, updated in useFrame
                castShadow
                receiveShadow
                onClick={interactive ? (e) => {
                    e.stopPropagation();
                    selectPart(isSelected ? null : id);
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
    }

    return (
        <group position={object.position} rotation={object.rotation} scale={object.scale}>
            {object.children.map((child: any, i: number) => (
                <RecursivePart 
                    key={child.uuid || i} 
                    object={child} 
                    interactive={interactive}
                    partMaterials={partMaterials}
                    materials={materials}
                    partVisibility={partVisibility}
                    partConfigs={partConfigs}
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
  return (
    <InteractiveModel 
      url={currentModel.url} 
      isObj={isObj} 
      customScale={customScale}
      customPosition={customPosition}
      customRotation={customRotation}
      interactive={interactive} 
      videoTexture={videoTexture}
    />
  );
};