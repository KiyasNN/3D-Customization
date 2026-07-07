// @ts-nocheck
import React, { Suspense, useEffect, useState, useRef, useLayoutEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
// @ts-ignore
import { useThree, useFrame, useLoader } from '@react-three/fiber';
// @ts-ignore
import { Environment, OrbitControls, MeshReflectorMaterial, ContactShadows, Stage, PerspectiveCamera, TransformControls, Outlines, GizmoHelper, GizmoViewport } from '@react-three/drei';
// @ts-ignore
import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration, TiltShift2, N8AO, SMAA } from '@react-three/postprocessing';
import * as THREE from 'three';
import { RGBELoader, EXRLoader } from 'three-stdlib';
import { Interface } from './components/Interface';
import { ShoeModel } from './components/ShoeModel';
import { Mannequin } from './components/Mannequin'; // Import Mannequin
import { useStore } from './store';
import { LoadingOverlay } from './components/LoadingOverlay';
import { CanvasDragDropHandler } from './components/CanvasDragDropHandler';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, getUserProfile, signOut, signInWithGoogle, handleGoogleRedirectResult, signInLocalDev } from './services/firebase';
import { LockKeyhole, Sparkles, Mail, Lock, ArrowRight, ShieldAlert, Clock, RefreshCw, LogOut } from 'lucide-react';

// Fix for Three.js r165+ deprecation warning in three-stdlib
if (THREE.LoaderUtils && typeof TextDecoder !== 'undefined') {
  THREE.LoaderUtils.decodeText = (array: any) => new TextDecoder().decode(array);
}

const debugLog = (...args: any[]) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};

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
const SceneManager = () => {
  return null;
}

// Controls the camera animation based on store state
const CameraRig = ({ sceneRef }: { sceneRef: React.RefObject<THREE.Group> }) => {
  const cameraRequest = useStore(s => s.cameraRequest);
  const fitRequest = useStore(s => s.fitRequest);
  const fitWithDefaultDirection = useStore(s => s.fitWithDefaultDirection);
  const { camera, controls } = useThree();
  
  const targetPos = useRef<THREE.Vector3 | null>(null);
  const targetTarget = useRef<THREE.Vector3 | null>(null);
  const isAnimating = useRef(false);

  // When a new camera request comes in, start animating
  useEffect(() => {
    if (cameraRequest) {
      targetPos.current = new THREE.Vector3(...cameraRequest.position);
      targetTarget.current = new THREE.Vector3(...cameraRequest.target);
      isAnimating.current = true;
    }
  }, [cameraRequest]);

  // When a fit request comes in, calculate bounds of all objects and frame them
  useEffect(() => {
    if (fitRequest > 0 && sceneRef.current) {
      const group = sceneRef.current;
      const box = new THREE.Box3().setFromObject(group);
      
      // If bounding box is empty/invalid, skip
      if (box.isEmpty()) return;

      const center = new THREE.Vector3();
      box.getCenter(center);
      
      const size = new THREE.Vector3();
      box.getSize(size);
      
      const maxDim = Math.max(size.x, size.y, size.z);
      
      // Calculate fov in radians
      const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
      
      // Calculate distance to fit the object nicely
      let distance = maxDim / (2 * Math.tan(fov / 2)) * 1.35;
      
      // Put a safe guard on distance
      distance = Math.max(1.5, Math.min(distance, 15.0));
      
      // Maintain the camera's current viewing angle or use default
      const direction = new THREE.Vector3();
      if (fitWithDefaultDirection) {
        // Default direction pointing towards the center [0, 0.5, 0] from [4, 2, 4]
        // Which is: [4, 1.5, 4] normalized
        direction.set(4, 1.5, 4).normalize();
      } else {
        camera.getWorldDirection(direction);
        direction.negate().normalize();
      }
      
      // Fallback direction if camera is somehow at center
      if (direction.length() < 0.01) {
        direction.set(1, 0.5, 1).normalize();
      }
      
      const nextCameraPos = center.clone().add(direction.multiplyScalar(distance));
      
      targetPos.current = nextCameraPos;
      targetTarget.current = center;
      isAnimating.current = true;
    }
  }, [fitRequest, fitWithDefaultDirection, camera, sceneRef]);

  useFrame(() => {
    if (isAnimating.current && targetPos.current && targetTarget.current) {
      // Smoothly interpolate camera position
      camera.position.lerp(targetPos.current, 0.1); 
      
      // Update controls target
      const orbitControls = (controls as any);
      if (orbitControls) {
         orbitControls.target.lerp(targetTarget.current, 0.1);
         orbitControls.update();
      }

      // Stop animating when we are close enough
      if (camera.position.distanceTo(targetPos.current) < 0.05) {
        isAnimating.current = false;
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
  const envSettings = useStore(s => s.environmentSettings);
  const rotation: [number, number, number] = [envSettings.rotationX, envSettings.rotationY, envSettings.rotationZ];
  // Use array for files to avoid ambiguity in drei Environment component
  return <Environment files={[file]} background={background} environmentIntensity={intensity} environmentRotation={rotation} backgroundRotation={rotation} />;
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
  const enabled = !isMobile && recordingStatus === 'idle' && effectsSettings?.postProcessingEnabled;

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
  const user = useStore(s => s.user);
  const setUser = useStore(s => s.setUser);
  const userProfile = useStore(s => s.userProfile);
  const setUserProfile = useStore(s => s.setUserProfile);
  
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [refreshingProfile, setRefreshingProfile] = useState(false);

  useEffect(() => {
    handleGoogleRedirectResult().catch((err) => {
      console.warn("Google redirect result error:", err);
    });
  }, []);

  useEffect(() => {
    debugLog("DEBUG App useEffect: setting up auth listener");
    const unsubscribe = onAuthStateChanged(async (usr) => {
      try {
        debugLog("DEBUG onAuthStateChanged:", usr);
        setUser(usr);
        if (usr) {
          try {
            debugLog("DEBUG onAuthStateChanged: loading profile for", usr.uid);
            const profile = await getUserProfile(usr.uid, usr.email || "");
            debugLog("DEBUG onAuthStateChanged: profile loaded", profile);
            setUserProfile(profile);
          } catch (e: any) {
            console.error("Error loading profile:", e.stack || e);
          }
        } else {
          setUserProfile(null);
        }
        setCheckingAuth(false);
      } catch (err: any) {
        console.error("CRITICAL error in App.tsx onAuthStateChanged callback:", err.stack || err);
      }
    });
    return () => unsubscribe();
  }, [setUser, setUserProfile]);

  const handleRefreshProfile = async () => {
    if (!user) return;
    setRefreshingProfile(true);
    try {
      const profile = await getUserProfile(user.uid, user.email || "");
      setUserProfile(profile);
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshingProfile(false);
    }
  };

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
  const turntableSettings = useStore(s => s.turntableSettings);
  const currentModel = useStore(s => s.currentModel);
  const sceneRef = useRef<THREE.Group>(null);
  
  // Calculate control states
  const isRecording = recordingStatus === 'recording';
  const shouldAutoRotate = isTurntableActive && !isRecording && !isWalking && !(isExploded && showTransformGizmo);
  const computedTurntableSpeed = turntableSettings.direction === 'clockwise' ? turntableSpeed : -turntableSpeed;
  const controlsEnabled = !isRecording; 
  
  const mouseButtons = useMemo(() => ({
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.PAN,
    RIGHT: THREE.MOUSE.ROTATE
  }), []);
  
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

  if (checkingAuth) {
    return (
      <div className="w-full h-screen bg-[#09090b] flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-bold text-white tracking-widest uppercase">3D Studio</span>
            <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider animate-pulse">Biasanya gak lama kok hehehe...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full h-screen bg-[#09090b] flex items-center justify-center font-sans relative overflow-hidden select-none">
        {/* Abstract Background Accents */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(79,70,229,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
        
        <div className="relative w-full max-w-md mx-4 z-10 pointer-events-auto">
          <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col gap-6">
            
            {/* Logo Header */}
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
                <LockKeyhole size={24} className="animate-pulse" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight mt-2 flex items-center gap-2">
                3D Customizer
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-[280px]">
                Please authorize your session to access the 3D Customization Workspace.
              </p>
            </div>

            {/* Error Message */}
            {authError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold leading-relaxed">
                {authError}
              </div>
            )}

            {/* Auth Form */}
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                setAuthError("");
                setAuthLoading(true);
                try {
                  let user;
                  const normalizedEmail = authEmail.trim().toLowerCase();
                  if (authMode === "login") {
                    if (normalizedEmail === "eggplosion") {
                      user = await signInLocalDev(authEmail, authPassword);
                    } else {
                      user = await signInWithEmailAndPassword(authEmail, authPassword);
                    }
                  } else {
                    if (normalizedEmail === "eggplosion") {
                      throw new Error("Local dev account 'eggplosion' is already registered.");
                    }
                    user = await createUserWithEmailAndPassword(authEmail, authPassword);
                  }
                  setUser(user);
                  const profile = await getUserProfile(user.uid, user.email || "");
                  setUserProfile(profile);
                } catch (err: any) {
                  console.error(err);
                  setAuthError(err.message || "Failed to authenticate. Please check your credentials.");
                } finally {
                  setAuthLoading(false);
                }
              }}
              className="flex flex-col gap-4"
            >
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Email or Username</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500 font-sans">
                    <Mail size={14} />
                  </span>
                  <input
                    type="text"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="name@company.com or username"
                    className="w-full bg-zinc-950/50 border border-white/10 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium font-sans"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500 font-sans">
                    <Lock size={14} />
                  </span>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-950/50 border border-white/10 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium font-sans"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 font-sans cursor-pointer"
              >
                {authLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{authMode === "login" ? "Enter Workspace" : "Register & Enter"}</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-1">
              <div className="h-[1px] flex-1 bg-white/5" />
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">or continue with</span>
              <div className="h-[1px] flex-1 bg-white/5" />
            </div>

            {/* Google Sign-In Actions */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={async () => {
                  setAuthError("");
                  setAuthLoading(true);
                  try {
                    await signInWithGoogle();
                  } catch (err: any) {
                    console.error(err);
                    const errMsg = err?.code || err?.message || "";
                    if (errMsg.includes("popup-closed-by-user")) {
                      setAuthError("The Google sign-in window was closed. Please try again and keep the window open to select your account.");
                    } else if (errMsg.includes("popup-blocked")) {
                      setAuthError("The sign-in popup was blocked by your browser. Please allow popups for this site and try again.");
                    } else {
                      setAuthError(err.message || "Failed to authenticate with Google. Popups might be blocked by your browser.");
                    }
                  } finally {
                    setAuthLoading(false);
                  }
                }}
                disabled={authLoading}
                className="w-full bg-white hover:bg-zinc-100 text-zinc-950 font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer font-sans"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5.04c1.67 0 3.17.58 4.35 1.71l3.25-3.25C17.63 1.63 14.97 1 12 1 7.33 1 3.32 3.68 1.39 7.61l3.85 3C6.15 7.6 8.83 5.04 12 5.04z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.39-4.87 3.39-8.49z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.24 14.39C4.99 13.65 4.85 12.85 4.85 12s.14-1.65.39-2.39l-3.85-3C.51 8.16 0 10.02 0 12s.51 3.84 1.39 5.39l3.85-3z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.66-2.84c-1.01.68-2.3 1.08-4.3 1.08-3.17 0-5.85-2.56-6.81-5.57l-3.85 3C3.32 20.32 7.33 23 12 23z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>

            {/* Form Toggle */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === "login" ? "signup" : "login");
                  setAuthError("");
                }}
                className="text-xs text-zinc-400 hover:text-white hover:underline transition-colors font-medium font-sans cursor-pointer"
              >
                {authMode === "login" 
                  ? "Don't have an account yet? Create one" 
                  : "Already registered? Sign back in"}
              </button>
            </div>

          </div>
        </div>
      </div>
    );
  }

  if (user && !userProfile) {
    return (
      <div className="w-full h-screen bg-[#09090b] flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-bold text-white tracking-widest uppercase">3D Studio</span>
            <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider animate-pulse">Biasanya gak lama kok hehehe...</span>
          </div>
        </div>
      </div>
    );
  }

  if (user && userProfile && userProfile.status !== 'approved') {
    const isBlocked = userProfile.status === 'blocked';
    return (
      <div className="w-full h-screen bg-[#09090b] flex items-center justify-center font-sans relative overflow-hidden select-none">
        {/* Background Accents */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(79,70,229,0.1),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        
        <div className="relative w-full max-w-md mx-4 z-10 pointer-events-auto">
          <div className="bg-zinc-900/95 border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col gap-6 text-center items-center">
            
            {/* Icon */}
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
              isBlocked 
                ? "bg-red-500/10 border border-red-500/20 text-red-400" 
                : "bg-amber-500/10 border border-amber-500/20 text-amber-400 animate-pulse"
            }`}>
              {isBlocked ? <ShieldAlert size={28} /> : <Clock size={28} />}
            </div>

            {/* Content */}
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                {isBlocked ? "Access Suspended" : "Access Request Pending"}
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed px-2">
                {isBlocked 
                  ? "Your workspace access has been blocked or suspended by an administrator." 
                  : "Your account is registered! To secure this customizer, an administrator must approve your access request before you can design shoe models."}
              </p>
              {!isBlocked && (
                <div className="mt-2 text-[10px] bg-indigo-500/10 text-indigo-300 py-1.5 px-3 rounded-lg border border-indigo-500/20 font-semibold self-center">
                  Registration Email: {user.email}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="w-full flex flex-col gap-3 pt-2">
              <button
                onClick={handleRefreshProfile}
                disabled={refreshingProfile}
                className="w-full bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all border border-white/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={14} className={refreshingProfile ? "animate-spin" : ""} />
                <span>{refreshingProfile ? "Checking..." : "Refresh Access Status"}</span>
              </button>

              <button
                onClick={() => signOut()}
                className="w-full bg-zinc-950 hover:bg-zinc-900 active:scale-95 text-zinc-400 hover:text-red-400 font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all border border-white/5 flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut size={14} />
                <span>Sign Out of Account</span>
              </button>
            </div>

            {/* Note about admin */}
            <div className="text-[10px] text-zinc-500 leading-relaxed border-t border-white/5 pt-4 w-full">
              Need immediate entry? Log in with admin credentials to configure authorization parameters.
            </div>

          </div>
        </div>
      </div>
    );
  }

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
           <SceneManager />
           <RendererConfig />
          {/* Apply background color and fog if environment background is disabled. */}
          {!showEnvironmentBackground && (
            <>
              <color attach="background" args={['#080808']} />
              <fog attach="fog" args={['#080808', 8, 30]} />
            </>
          )}
          
          <Suspense fallback={null}>
             {/* Drag and Drop Material Texture Handler */}
             <CanvasDragDropHandler />

             {/* Snapshot Listener */}
             <ScreenshotHandler />
             
             {/* Camera Animation Rig */}
             <CameraRig sceneRef={sceneRef} />
             
             {/* Video Recording Logic */}
             <VideoRecorder />

             {/* Dynamic Lighting */}
             <SceneLighting />
            
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
               enablePan={true}
               mouseButtons={mouseButtons}
               enableRotate={controlsEnabled}
               enableZoom={true} 
               autoRotate={shouldAutoRotate}
               autoRotateSpeed={computedTurntableSpeed} 
               enabled={controlsEnabled && !isDragging}
               target={[0, 0.5, 0]} // Lowered target to center on volume
            />

            {/* Bottom-left Axis Guide */}
            <GizmoHelper
               alignment="bottom-left"
               margin={[80, 80]}
            >
               <GizmoViewport 
                  axisColors={['#ef4444', '#22c55e', '#3b82f6']} // Match custom dimensions: Red (X), Green (Y), Blue (Z)
                  labelColor="white" 
               />
            </GizmoHelper>
          </Suspense>
        </Canvas>
      </div>

      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(50,50,60,0.05),rgba(5,5,8,0.4))]" />

      <div className="absolute inset-0 z-10 pointer-events-none">
        <Interface />
      </div>

      <LoadingOverlay />

    </div>
  );
}