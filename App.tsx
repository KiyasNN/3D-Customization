// @ts-nocheck
import React, { Suspense, useEffect, useState, useRef, useLayoutEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
// @ts-ignore
import { useThree, useFrame, useLoader } from '@react-three/fiber';
// @ts-ignore
import { Environment, OrbitControls, MeshReflectorMaterial, ContactShadows, Stage, PerspectiveCamera, TransformControls, Outlines } from '@react-three/drei';
// @ts-ignore
import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration, TiltShift2, N8AO, SMAA } from '@react-three/postprocessing';
import * as THREE from 'three';
import { RGBELoader, EXRLoader } from 'three-stdlib';
import { Interface } from './components/Interface';
import { ShoeModel } from './components/ShoeModel';
import { Mannequin } from './components/Mannequin'; // Import Mannequin
import { useStore } from './store';

// Fix for Three.js r165+ deprecation warning in three-stdlib
if (THREE.LoaderUtils && typeof TextDecoder !== 'undefined') {
  THREE.LoaderUtils.decodeText = (array: any) => new TextDecoder().decode(array);
}

// Component to handle snapshot taking inside Canvas context
const ScreenshotHandler = () => {
  const snapshotRequest = useStore(s => s.snapshotRequest);
  const snapshotMode = useStore(s => s.snapshotMode);
  const saveVariantFromSnapshot = useStore(s => s.saveVariantFromSnapshot);
  
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    if (snapshotRequest > 0) {
      // 1. Save Original State (Visuals)
      const originalBackground = scene.background;
      const originalFog = scene.fog;
      const floor = scene.getObjectByName('studio-floor');
      const originalFloorVisible = floor ? floor.visible : true;

      // 2. Save Original Resolution State
      const originalSize = new THREE.Vector2();
      gl.getSize(originalSize);
      const originalAspect = (camera as THREE.PerspectiveCamera).aspect;

      // 3. Prepare for Snapshot 
      // Force 16:9 High Resolution (e.g. 1920x1080) for PDF consistency
      // regardless of user screen size.
      const TARGET_WIDTH = 1920;
      const TARGET_HEIGHT = 1080;
      const TARGET_ASPECT = TARGET_WIDTH / TARGET_HEIGHT;

      gl.setSize(TARGET_WIDTH, TARGET_HEIGHT);
      (camera as THREE.PerspectiveCamera).aspect = TARGET_ASPECT;
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();

      // Clear background for transparency
      scene.background = null;
      scene.fog = null;
      if (floor) floor.visible = false;

      // 4. Render
      gl.render(scene, camera);
      const data = gl.domElement.toDataURL('image/png');

      // 5. Restore State
      gl.setSize(originalSize.x, originalSize.y);
      (camera as THREE.PerspectiveCamera).aspect = originalAspect;
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();

      scene.background = originalBackground;
      scene.fog = originalFog;
      if (floor) floor.visible = originalFloorVisible;
      
      // 6. Handle Data
      if (snapshotMode === 'download') {
        const link = document.createElement('a');
        link.setAttribute('download', 'nk-3d-design.png');
        link.setAttribute('href', data);
        link.click();
      } else if (snapshotMode === 'save') {
        saveVariantFromSnapshot(data);
      }
    }
  }, [snapshotRequest, snapshotMode, gl, scene, camera, saveVariantFromSnapshot]);

  return null;
};

// Manager for scene interactions
const SceneManager = ({ setControlsSize, sceneRef }: any) => {
  useFrame(() => {
    if (sceneRef.current) {
        const box = new THREE.Box3().setFromObject(sceneRef.current);
        const size = box.getSize(new THREE.Vector3()).length();
        setControlsSize(Math.max(0.5, size / 5));
    }
  });
  return null;
}

// Controls the camera animation based on store state
const CameraRig = () => {
  const cameraRequest = useStore(s => s.cameraRequest);
  const { camera, controls } = useThree();
  const vec = new THREE.Vector3();
  const [isAnimating, setIsAnimating] = useState(false);

  // When a new camera request comes in, start animating
  useEffect(() => {
    if (cameraRequest) {
      setIsAnimating(true);
    }
  }, [cameraRequest]);

  useFrame(() => {
    if (isAnimating && cameraRequest) {
      // Smoothly interpolate camera position
      const targetPos = new THREE.Vector3(...cameraRequest.position);
      camera.position.lerp(targetPos, 0.1); 
      
      // Update controls target
      const orbitControls = (controls as any);
      if (orbitControls) {
         vec.set(...cameraRequest.target);
         orbitControls.target.lerp(vec, 0.1);
         orbitControls.update();
      }

      // Stop animating when we are close enough
      if (camera.position.distanceTo(targetPos) < 0.05) {
        setIsAnimating(false);
      }
    }
  });

  return null;
}

// Handles video recording of a 360 turntable
const VideoRecorder = () => {
  const recordingRequest = useStore(s => s.recordingRequest);
  const recordingStatus = useStore(s => s.recordingStatus);
  const finishRecording = useStore(s => s.finishRecording);
  const cancelRecording = useStore(s => s.cancelRecording);
  const turntableSettings = useStore(s => s.turntableSettings);

  const { gl, camera } = useThree();
  const recordingRef = useRef<{ 
    recorder: MediaRecorder | null, 
    stream: MediaStream | null,
    chunks: Blob[]
  } | null>(null);
  
  // State to track initial orbit parameters
  const [initialState, setInitialState] = useState<{ radius: number, startAngle: number } | null>(null);
  const [activeFrame, setActiveFrame] = useState(0);
  
  // Calculate total frames based on settings
  const TOTAL_FRAMES = turntableSettings.duration * turntableSettings.fps;

  // Listen for Escape key to cancel recording
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && useStore.getState().recordingStatus === 'recording') {
        // Stop recorder if active
        if (recordingRef.current?.recorder && recordingRef.current.recorder.state === 'recording') {
           recordingRef.current.recorder.stop();
        }
        cancelRecording();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelRecording]);

  useEffect(() => {
    if (recordingRequest > 0 && recordingStatus === 'recording') {
      // Start Recording Sequence
      setActiveFrame(0);

      if (turntableSettings.useCurrentView) {
        // Calculate radius and current angle from camera position
        const radius = Math.sqrt(camera.position.x ** 2 + camera.position.z ** 2);
        const startAngle = Math.atan2(camera.position.x, camera.position.z);
        setInitialState({ radius, startAngle });
      } else {
        // Default position
        camera.position.set(4, 2, 4);
        camera.lookAt(0, 0.5, 0); // Center on shoe
        setInitialState({ radius: 5.65, startAngle: Math.PI / 4 }); // radius ~sqrt(4^2+4^2), angle 45deg
      }

      try {
        const stream = gl.domElement.captureStream(turntableSettings.fps); 
        // Try to get mp4, fallback to webm
        let mimeType = 'video/webm';
        if (MediaRecorder.isTypeSupported('video/mp4')) {
          mimeType = 'video/mp4';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
           mimeType = 'video/webm;codecs=h264';
        }
        
        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5000000 });
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          // If cancelled (status went to idle), do nothing with the data
          if (useStore.getState().recordingStatus !== 'recording') return;

          const blob = new Blob(chunks, { type: mimeType });
          const url = URL.createObjectURL(blob);
          finishRecording(url);
          // Clean up recorder refs
          recordingRef.current = null;
        };

        recorder.start();
        recordingRef.current = { recorder, stream, chunks };

      } catch (e) {
        console.error("Recording failed", e);
        cancelRecording();
        alert("Screen recording not supported in this browser.");
      }
    }
  }, [recordingRequest, gl, camera, finishRecording, cancelRecording, recordingStatus, turntableSettings.fps, turntableSettings.useCurrentView]);

  useFrame(() => {
    if (useStore.getState().recordingStatus === 'recording' && recordingRef.current && initialState) {
       // Animate Turntable
       if (activeFrame < TOTAL_FRAMES) {
         let angleDelta = (activeFrame / TOTAL_FRAMES) * Math.PI * 2;
         
         if (turntableSettings.direction === 'counter-clockwise') {
            angleDelta = -angleDelta;
         }

         const currentAngle = initialState.startAngle + angleDelta;
         
         // Rotate camera around center (0,0,0) preserving Y height if custom view, else default logic could override y
         camera.position.x = Math.sin(currentAngle) * initialState.radius;
         camera.position.z = Math.cos(currentAngle) * initialState.radius;
         
         // Ensure we look at center
         camera.lookAt(0, 0.5, 0); 
         
         setActiveFrame(activeFrame + 1);
       } else {
         // Finished Animation
         if (recordingRef.current.recorder?.state === 'recording') {
            recordingRef.current.recorder.stop();
         }
       }
    }
  });

  return null;
};

// PolyHaven URLs
const PRESETS = {
  studio: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/empty_warehouse_01_1k.hdr",
  sunset: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/venice_sunset_1k.hdr",
  dawn: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kiara_1_dawn_1k.hdr",
  warehouse: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/empty_warehouse_01_1k.hdr",
  night: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/dikhololo_night_1k.hdr",
  forest: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/forest_slope_1k.hdr",
};

// Helper component to safely load HDRIs with standard 'files' prop
const HDRI = ({ file, background = false, intensity = 1 }: { file: string, background?: boolean, intensity?: number }) => {
  // Use array for files to avoid ambiguity in drei Environment component
  return <Environment files={[file]} background={background} environmentIntensity={intensity} />;
};

// Sub-component to load custom environment texture with appropriate loader
const CustomEnv = ({ url, extension }: { url: string, extension: string }) => {
   const settings = useStore(s => s.environmentSettings);
   const showEnvironmentBackground = useStore(s => s.showEnvironmentBackground);
   const { scene } = useThree();
   
   // Determine correct loader based on extension
   const loader = useMemo(() => {
     if (extension === 'exr') return EXRLoader;
     if (extension === 'hdr') return RGBELoader;
     return THREE.TextureLoader;
   }, [extension]);

   const texture = useLoader(loader, url);
   
   // Imperative update of scene environment to avoid Environment component bugs with Data URIs
   useLayoutEffect(() => {
       if (texture) {
           texture.mapping = THREE.EquirectangularReflectionMapping;
           
           // Handle color space for standard images vs HDR/EXR
           if (extension === 'hdr' || extension === 'exr') {
               // For HDR/EXR, keep Linear to prevent washed out look
               texture.colorSpace = THREE.LinearSRGBColorSpace;
               // LinearFilter usually looks better for environment maps without mipmaps
               texture.minFilter = THREE.LinearFilter;
               texture.magFilter = THREE.LinearFilter;
               texture.generateMipmaps = false;
           } else {
               // For standard JPG/PNG, use SRGB
               texture.colorSpace = THREE.SRGBColorSpace;
           }
           
           texture.needsUpdate = true;

           // Apply directly to scene
           scene.environment = texture;
           scene.background = showEnvironmentBackground ? texture : null;
       }
       
       return () => {
           scene.environment = null;
           scene.background = null;
           // Reset rotation on cleanup - safe check for property
           if (scene.environmentRotation && typeof scene.environmentRotation.set === 'function') {
               scene.environmentRotation.set(0, 0, 0);
           }
           if (scene.backgroundRotation && typeof scene.backgroundRotation.set === 'function') {
               scene.backgroundRotation.set(0, 0, 0);
           }
       };
   }, [texture, extension, scene, showEnvironmentBackground]);

   // Apply rotation updates without reloading texture
   useLayoutEffect(() => {
        if (scene.environmentRotation && typeof scene.environmentRotation.set === 'function') {
            scene.environmentRotation.set(settings.rotationX, settings.rotationY, settings.rotationZ);
        }
        if (scene.backgroundRotation && typeof scene.backgroundRotation.set === 'function') {
            scene.backgroundRotation.set(settings.rotationX, settings.rotationY, settings.rotationZ);
        }
   }, [scene, settings.rotationX, settings.rotationY, settings.rotationZ]);

   return null;
};

const SceneLighting = () => {
  const currentLighting = useStore(s => s.currentLighting);
  const customEnvironment = useStore(s => s.customEnvironment);
  const settings = useStore(s => s.environmentSettings);
  const lightingEnabled = useStore(s => s.lightingEnabled);
  const showEnvironmentBackground = useStore(s => s.showEnvironmentBackground);
  const envIntensity = settings.intensity ?? 1.0;

  return (
    <group>
       {/* Environment - IBL */}
       <Environment 
          preset={settings.preset as any} 
          intensity={envIntensity} 
       />
       {lightingEnabled && <ambientLight intensity={(currentLighting === 'night' ? 0.2 : 0.4) * envIntensity} />}
       
       {currentLighting === 'studio' && (
         <>
           {lightingEnabled && (
             <>
               {/* Key Light - Warm & Strong for Contrast */}
               <spotLight 
                 position={[5, 6, 5]} 
                 angle={0.5} 
                 penumbra={0.5} 
                 intensity={25.0 * envIntensity} 
                 castShadow 
                 shadow-bias={-0.0001} 
                 shadow-mapSize={[2048, 2048]} 
                 color="#ffffff"
               />
               {/* Fill Light - Cooler & Softer */}
               <pointLight position={[-4, 3, -4]} intensity={6.0 * envIntensity} color="#dceeff" />
               {/* Back Rim Light - Intense & Cool for separation (Hero Effect) */}
               <spotLight 
                 position={[0, 4, -6]} 
                 angle={0.6} 
                 penumbra={0.4} 
                 intensity={35.0 * envIntensity} 
                 color="#eef2ff" 
                 castShadow
                 shadow-mapSize={[1024, 1024]}
               />
             </>
           )}
           {/* HDRI for reflections */}
           <HDRI file={PRESETS.studio} intensity={1.0 * envIntensity} background={showEnvironmentBackground} />
         </>
       )}

       {currentLighting === 'sunset' && (
         <>
           {lightingEnabled && (
             <>
               <directionalLight position={[-5, 5, 5]} intensity={10.0 * envIntensity} color="#ffaa00" castShadow shadow-mapSize={[2048, 2048]} />
               <pointLight position={[5, 4, -5]} intensity={6.0 * envIntensity} color="#ff5500" />
             </>
           )}
           <HDRI file={PRESETS.sunset} intensity={1.5 * envIntensity} background={showEnvironmentBackground} />
         </>
       )}

       {currentLighting === 'dawn' && (
         <>
           {lightingEnabled && (
             <>
               <directionalLight position={[5, 5, 5]} intensity={8.0 * envIntensity} color="#aaccff" castShadow shadow-mapSize={[2048, 2048]} />
               <pointLight position={[-5, 5, -5]} intensity={5.0 * envIntensity} color="#d4e1ff" />
             </>
           )}
           <HDRI file={PRESETS.dawn} intensity={1.5 * envIntensity} background={showEnvironmentBackground} />
         </>
       )}
       
       {currentLighting === 'warehouse' && (
         <>
           {lightingEnabled && (
             <spotLight position={[0, 10, 0]} angle={0.6} penumbra={0.5} intensity={15.0 * envIntensity} castShadow shadow-mapSize={[2048, 2048]} />
           )}
           <HDRI file={PRESETS.warehouse} intensity={1.4 * envIntensity} background={showEnvironmentBackground} />
         </>
       )}

       {currentLighting === 'night' && (
         <>
           {lightingEnabled && (
             <>
               <pointLight position={[3, 4, 3]} intensity={15.0 * envIntensity} color="#0088ff" />
               <pointLight position={[-3, 4, -3]} intensity={15.0 * envIntensity} color="#ff00cc" />
             </>
           )}
           <HDRI file={PRESETS.night} intensity={0.8 * envIntensity} background={showEnvironmentBackground} />
         </>
       )}

       {currentLighting === 'forest' && (
         <>
           {lightingEnabled && (
             <spotLight position={[2, 10, 2]} angle={0.5} penumbra={1} intensity={8.0 * envIntensity} color="#ffffdd" castShadow shadow-mapSize={[2048, 2048]} />
           )}
           <HDRI file={PRESETS.forest} intensity={1.5 * envIntensity} background={showEnvironmentBackground} />
         </>
       )}

       {currentLighting === 'custom' && customEnvironment && (
         <>
           {lightingEnabled && (
             <directionalLight position={[5, 10, 5]} intensity={5.0 * envIntensity} castShadow shadow-bias={-0.0001} shadow-mapSize={[2048, 2048]} />
           )}
           {/* Key ensures component remounts when environment asset changes, preventing loader conflicts */}
           <CustomEnv key={customEnvironment.id} url={customEnvironment.url} extension={customEnvironment.extension} />
         </>
       )}
    </group>
  );
};

// Replaced failed texture loaders with stable procedural materials (colors)
const StreetFloor = () => {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
         <planeGeometry args={[100, 100]} /> 
         <meshStandardMaterial color="#1a1a1a" roughness={0.8} metalness={0.2} />
    </mesh>
  );
};

const SandFloor = () => {
    return (
       <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
         <planeGeometry args={[100, 100]} />
         <meshStandardMaterial color="#d4b483" roughness={1.0} metalness={0.0} />
       </mesh>
    );
};

const Floor = () => {
  const currentFloor = useStore(s => s.currentFloor);
  const isWalking = useStore(s => s.isWalking);
  const isMobile = useStore(s => s.isMobile);
  const currentLighting = useStore(s => s.currentLighting);
  
  // Custom Environment Mode: Use Shadow Catcher to blend object with HDRI ground
  if (currentLighting === 'custom') {
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
         <planeGeometry args={[100, 100]} />
         <shadowMaterial transparent opacity={0.6} color="#000000" />
      </mesh>
    );
  }

  if (currentFloor === 'street') {
    return <StreetFloor />;
  }
  
  if (currentFloor === 'sand') {
    return <SandFloor />;
  }

  // OPTIMIZATION:
  // If walking animation is active, disable the MeshReflectorMaterial.
  // The reflector renders the scene a 2nd time every frame to generate reflections.
  // With moving geometry (walking), this is extremely heavy on the GPU.
  if (isWalking) {
    return (
      <mesh name="studio-floor" rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
         <planeGeometry args={[50, 50]} />
         <meshStandardMaterial color="#151515" roughness={0.7} metalness={0.5} />
      </mesh>
    );
  }

  // Default Studio with Reflection (Static mode)
  // High quality settings for "Unreal Engine" look
  return (
    <mesh name="studio-floor" rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
       <planeGeometry args={[50, 50]} />
       <MeshReflectorMaterial
          blur={isMobile ? [100, 100] : [250, 100]}
          resolution={isMobile ? 256 : 1024}
          mixBlur={1.0}
          mixStrength={40} // Reduced slightly for realism
          roughness={0.4} // Sharper reflections
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#151515"
          metalness={0.5}
          mirror={0.7}
       />
    </mesh>
  );
}

const Effects = () => {
  const isMobile = useStore(s => s.isMobile);
  const recordingStatus = useStore(s => s.recordingStatus);
  const effectsSettings = useStore(s => s.effectsSettings);
  const bloomIntensity = effectsSettings?.bloomIntensity ?? 0.6;

  // Disable expensive effects during recording or on mobile to save performance/battery
  const enabled = !isMobile && recordingStatus === 'idle';

  if (!enabled) return null;

  return (
    <EffectComposer disableNormalPass={false} multisampling={0}> 
       {/* Anti-aliasing first since multisampling is 0 */}
       <SMAA />

       {/* N8AO for realistic contact shadows */}
       {effectsSettings?.aoEnabled !== false && (
         <N8AO 
           aoRadius={0.5} 
           intensity={3.0} 
           screenSpaceRadius={true} 
           color="black" 
           distanceFalloff={2.0}
           quality={effectsSettings?.aoQuality || "medium"}
           halfRes={true}
         />
       )}
       
       {/* Chromatic Aberration mimics real lens imperfection - subtle */}
       <ChromaticAberration offset={[0.0005, 0.0005]} radialModulation={false} modulationOffset={0} />
       
       {/* Unreal-style Soft Bloom */}
       <Bloom 
          luminanceThreshold={1.0} 
          luminanceSmoothing={0.4}
          mipmapBlur 
          intensity={bloomIntensity} 
          radius={0.5}
       />
       
       {/* Film Grain */}
       <Noise opacity={0.03} />
       
       {/* Cinematic Vignette */}
       <Vignette eskil={false} offset={0.1} darkness={0.7} />

       {/* TiltShift gives a 'miniature/product' macro photography look - keep subtle */}
       <TiltShift2 blur={0.05} />
    </EffectComposer>
  );
}

// Dynamically adjusts Three.js renderer settings (tone mapping, exposure) based on store state
const RendererConfig = () => {
  const { gl } = useThree();
  const effectsSettings = useStore(s => s.effectsSettings);

  useLayoutEffect(() => {
    let mapping = THREE.ACESFilmicToneMapping;
    if (effectsSettings?.toneMapping === 'AgX') {
      mapping = THREE.AgXToneMapping;
    } else if (effectsSettings?.toneMapping === 'Linear') {
      mapping = THREE.LinearToneMapping;
    } else if (effectsSettings?.toneMapping === 'None') {
      mapping = THREE.NoToneMapping;
    }
    
    gl.toneMapping = mapping;
    gl.toneMappingExposure = effectsSettings?.exposure ?? 1.0;
    gl.needsUpdate = true;
  }, [gl, effectsSettings?.toneMapping, effectsSettings?.exposure]);

  return null;
};

export default function App() {
  const currentView = useStore(s => s.currentView);
  const isWalking = useStore(s => s.isWalking);
  const isTurntableActive = useStore(s => s.isTurntableActive);
  const turntableSpeed = useStore(s => s.turntableSpeed);
  const recordingStatus = useStore(s => s.recordingStatus);
  const setIsMobile = useStore(s => s.setIsMobile);
  const currentLighting = useStore(s => s.currentLighting);
  const showFloor = useStore(s => s.showFloor);
  const showEnvironmentBackground = useStore(s => s.showEnvironmentBackground);
  const showTransformGizmo = useStore(s => s.showTransformGizmo);
  const isDragging = useStore(s => s.isDragging);
  const setIsDragging = useStore(s => s.setIsDragging);
  const isExploded = useStore(s => s.isExploded);
  const [controlsSize, setControlsSize] = useState(1);
  const sceneRef = useRef<THREE.Group>(null);
  
  // Calculate control states
  const isRecording = recordingStatus === 'recording';
  const shouldAutoRotate = isTurntableActive && !isRecording && !isWalking && !showTransformGizmo;
  const controlsEnabled = !isRecording; 
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize(); // Init
    window.addEventListener('resize', handleResize);

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [setIsMobile, setIsDragging]);

  return (
    <div className="w-full h-screen bg-zinc-900 overflow-hidden relative font-sans select-none">
      
      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
         <Canvas 
           shadows={{ type: THREE.PCFShadowMap }}
           dpr={[1, 2]} 
           gl={{ 
              preserveDrawingBuffer: true, 
              alpha: true, 
              antialias: true,
           }}
         >
           <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={50} />
           <SceneManager setControlsSize={setControlsSize} sceneRef={sceneRef} />
           <RendererConfig />
          {/* Apply background color and fog if environment background is disabled. */}
          {!showEnvironmentBackground && (
            <>
              <color attach="background" args={['#080808']} />
              <fog attach="fog" args={['#080808', 8, 30]} />
            </>
          )}
          
          <Suspense fallback={null}>
             {/* Snapshot Listener */}
             <ScreenshotHandler />
             
             {/* Camera Animation Rig */}
             <CameraRig />
             
             {/* Video Recording Logic */}
             <VideoRecorder />

             {/* Dynamic Lighting */}
             <SceneLighting />
            
              {/* Realism: Contact Shadows */}
              {currentLighting === 'studio' && !isWalking && showFloor && (
                <ContactShadows 
                  position={[0, 0, 0]} 
                  opacity={0.7} 
                  scale={10} 
                  blur={2.5} 
                  far={1}
                  resolution={512}
                  color="#000000"
                />
              )}

             {/* 3D Content - Centered at Y=0 */}
             <group ref={sceneRef} position={[0, 0, 0]}>
                {isWalking ? (
                  <group scale={12} position={[0, 0, 0]}>
                     <Mannequin />
                  </group>
                ) : (
                  <ShoeModel />
                )}
             </group>

            {/* Dynamic Floor - At Y=-0.01 (Just below shoe) */}
            {showFloor && <Floor />}

            {/* Post Processing */}
            <Effects />

            {/* Camera Controls */}
            <OrbitControls 
               makeDefault 
               minPolarAngle={0} 
               maxPolarAngle={Math.PI} // Allow full rotation to see bottom
               enablePan={false}
               enableRotate={controlsEnabled}
               enableZoom={true} 
               autoRotate={shouldAutoRotate}
               autoRotateSpeed={turntableSpeed} 
               enabled={controlsEnabled && !isDragging}
               target={[0, 0.5, 0]} // Lowered target to center on volume
            />
          </Suspense>
        </Canvas>
      </div>

      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(50,50,60,0.05),rgba(5,5,8,0.4))]" />

      <div className="absolute inset-0 z-10 pointer-events-none">
        <Interface />
      </div>
    </div>
  );
}