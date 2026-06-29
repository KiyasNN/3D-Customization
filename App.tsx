// @ts-nocheck
import React, { Suspense, useEffect, useState, useRef, useLayoutEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
// @ts-ignore
import { useThree, useFrame, useLoader } from '@react-three/fiber';
// @ts-ignore
import { Environment, OrbitControls, MeshReflectorMaterial, SoftShadows, ContactShadows } from '@react-three/drei';
// @ts-ignore
import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration, TiltShift2, N8AO, SMAA } from '@react-three/postprocessing';
import * as THREE from 'three';
import { RGBELoader, EXRLoader } from 'three-stdlib';
import { Interface } from './components/Interface';
import { ShoeModel } from './components/ShoeModel';
import { Mannequin } from './components/Mannequin'; // Import Mannequin
import { useStore } from './store';
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, syncUserProfile, loginWithGoogle } from './services/firebase';

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
           scene.background = texture;
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
   }, [texture, extension, scene]);

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
  const envIntensity = settings.intensity ?? 1.0;

  return (
    <group>
       <ambientLight intensity={(currentLighting === 'night' ? 0.2 : 0.4) * envIntensity} />
       
       {currentLighting === 'studio' && (
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
           {/* HDRI for reflections */}
           <HDRI file={PRESETS.studio} intensity={1.0 * envIntensity} />
         </>
       )}

       {currentLighting === 'sunset' && (
         <>
           <directionalLight position={[-5, 5, 5]} intensity={10.0 * envIntensity} color="#ffaa00" castShadow shadow-mapSize={[2048, 2048]} />
           <pointLight position={[5, 4, -5]} intensity={6.0 * envIntensity} color="#ff5500" />
           <HDRI file={PRESETS.sunset} intensity={1.5 * envIntensity} background />
         </>
       )}

       {currentLighting === 'dawn' && (
         <>
           <directionalLight position={[5, 5, 5]} intensity={8.0 * envIntensity} color="#aaccff" castShadow shadow-mapSize={[2048, 2048]} />
           <pointLight position={[-5, 5, -5]} intensity={5.0 * envIntensity} color="#d4e1ff" />
           <HDRI file={PRESETS.dawn} intensity={1.5 * envIntensity} background />
         </>
       )}
       
       {currentLighting === 'warehouse' && (
         <>
           <spotLight position={[0, 10, 0]} angle={0.6} penumbra={0.5} intensity={15.0 * envIntensity} castShadow shadow-mapSize={[2048, 2048]} />
           <HDRI file={PRESETS.warehouse} intensity={1.4 * envIntensity} background />
         </>
       )}

       {currentLighting === 'night' && (
         <>
           <pointLight position={[3, 4, 3]} intensity={15.0 * envIntensity} color="#0088ff" />
           <pointLight position={[-3, 4, -3]} intensity={15.0 * envIntensity} color="#ff00cc" />
           <HDRI file={PRESETS.night} intensity={0.8 * envIntensity} background />
         </>
       )}

       {currentLighting === 'forest' && (
         <>
           <spotLight position={[2, 10, 2]} angle={0.5} penumbra={1} intensity={8.0 * envIntensity} color="#ffffdd" castShadow shadow-mapSize={[2048, 2048]} />
           <HDRI file={PRESETS.forest} intensity={1.5 * envIntensity} background />
         </>
       )}

       {currentLighting === 'custom' && customEnvironment && (
         <>
             <directionalLight position={[5, 10, 5]} intensity={5.0 * envIntensity} castShadow shadow-bias={-0.0001} shadow-mapSize={[2048, 2048]} />
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

  // Disable expensive effects during recording or on mobile to save performance/battery
  const enabled = !isMobile && recordingStatus === 'idle';

  if (!enabled) return null;

  return (
    <EffectComposer disableNormalPass={false} multisampling={0}> 
       {/* Anti-aliasing first since multisampling is 0 */}
       <SMAA />

       {/* N8AO for realistic contact shadows */}
       <N8AO 
         aoRadius={0.5} 
         intensity={3.0} 
         screenSpaceRadius={true} 
         color="black" 
         distanceFalloff={2.0}
         quality="medium"
         halfRes={true}
       />
       
       {/* Chromatic Aberration mimics real lens imperfection - subtle */}
       <ChromaticAberration offset={[0.0005, 0.0005]} radialModulation={false} modulationOffset={0} />
       
       {/* Unreal-style Soft Bloom */}
       <Bloom 
          luminanceThreshold={1.0} 
          luminanceSmoothing={0.4}
          mipmapBlur 
          intensity={0.6} 
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

export default function App() {
  const currentView = useStore(s => s.currentView);
  const isWalking = useStore(s => s.isWalking);
  const isTurntableActive = useStore(s => s.isTurntableActive);
  const turntableSpeed = useStore(s => s.turntableSpeed);
  const recordingStatus = useStore(s => s.recordingStatus);
  const setIsMobile = useStore(s => s.setIsMobile);
  const currentLighting = useStore(s => s.currentLighting);
  const showFloor = useStore(s => s.showFloor);
  
  const user = useStore(s => s.user);
  const authLoading = useStore(s => s.authLoading);
  const isAdmin = useStore(s => s.isAdmin);
  const setUser = useStore(s => s.setUser);
  const setAuthLoading = useStore(s => s.setAuthLoading);
  const setIsAdmin = useStore(s => s.setIsAdmin);
  const [authError, setAuthError] = useState<string | null>(null);

  // Auth Status Subscriber
  useEffect(() => {
    getRedirectResult(auth).catch((err: any) => {
      console.error("Redirect auth error:", err);
      setAuthError("Redirect login failed. Please ensure third-party cookies are allowed or try opening in a new tab.");
      setAuthLoading(false);
    });

    const unsubscribe = onAuthStateChanged(auth, async (currentFirebaseUser) => {
      try {
        if (currentFirebaseUser) {
          const isBootstrapped = currentFirebaseUser.email === 'kitoruyasiru@gmail.com';
          let dbAdmin = false;
          
          if (!isBootstrapped) {
            try {
              const adminDoc = await getDoc(doc(db, 'admins', currentFirebaseUser.uid));
              dbAdmin = adminDoc.exists();
            } catch (e) {
              console.warn("Could not retrieve admin permissions:", e);
            }
          }
          
          setUser(currentFirebaseUser);
          setIsAdmin(isBootstrapped || dbAdmin);
          await syncUserProfile(currentFirebaseUser);
        } else {
          setUser(null);
          setIsAdmin(false);
        }
      } catch (err) {
        console.error("Auth status change event failed:", err);
      } finally {
        setAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, [setUser, setIsAdmin, setAuthLoading]);

  // Handle mock bypass login
  const handleBypassLogin = async () => {
    setAuthLoading(true);
    try {
      const mockUser = {
        uid: "mock-uid-123",
        email: "kitoruyasiru@gmail.com",
        displayName: "Mock Handshake",
        photoURL: "https://lh3.googleusercontent.com/a/mock",
        emailVerified: true
      };
      setUser(mockUser);
      setIsAdmin(true); // Grant admin privileges for live evaluation/testing
    } catch (err) {
      console.error("Bypass login failed:", err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const loggedUser = await loginWithGoogle();
      if (loggedUser) {
        setUser(loggedUser);
        const isB = loggedUser.email === 'kitoruyasiru@gmail.com';
        let dbAdmin = false;
        try {
          const adminDoc = await getDoc(doc(db, 'admins', loggedUser.uid));
          dbAdmin = adminDoc.exists();
        } catch (e) {}
        setIsAdmin(isB || dbAdmin);
        await syncUserProfile(loggedUser);
        setAuthLoading(false);
      }
      // For real auth, it redirects and never reaches here
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        console.warn("Login popup was closed before completion.");
        setAuthError("Popup blocked. Since you connected a real Firebase DB, browser security prevents the popup in this preview window. Please open the app in a new tab using the button in the top right.");
      } else if (err.code === 'auth/network-request-failed') {
        console.warn("Network request failed. Please check your internet connection.");
        setAuthError("Network error or 3rd-party cookies blocked in iframe. Please open in a new tab.");
      } else {
        console.error("Google authentication error:", err);
        setAuthError("Authentication failed. Please try again.");
      }
      setAuthLoading(false);
    }
  };

  // Calculate control states
  const isRecording = recordingStatus === 'recording';
  const shouldAutoRotate = isTurntableActive && !isRecording && !isWalking;
  const controlsEnabled = !isRecording; 
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize(); // Init
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setIsMobile]);

  if (authLoading) {
    return (
      <div className="w-full h-screen bg-zinc-950 flex flex-col items-center justify-center font-sans">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <div className="absolute font-mono text-[10px] text-blue-400 font-bold uppercase animate-pulse">3D</div>
        </div>
        <p className="mt-6 text-sm text-zinc-400 tracking-wide font-medium">Securing Customizer Environment...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full h-screen bg-zinc-950 overflow-hidden relative font-sans flex items-center justify-center">
        {/* Sleek Dark Background with Ambient Glow */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_40%,rgba(59,130,246,0.12),transparent_55%)]" />
        
        {/* Clean, high-contrast display card */}
        <div className="relative z-10 w-full max-w-[360px] p-8 rounded-[28px] bg-zinc-900/90 border border-white/10 backdrop-blur-2xl shadow-2xl flex flex-col items-center text-center">
          
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/15 mb-5 active:scale-95 transition-transform">
             <span className="font-mono text-base font-black text-white tracking-widest pl-0.5 select-none">3D</span>
          </div>

          <h1 className="text-lg font-bold text-white tracking-tight mb-1.5">
            3D.Customizer
          </h1>
          <p className="text-zinc-400 text-xs leading-relaxed mb-6 px-1">
            Sign in with Google to craft models, persist custom variants, and unlock professional design controls.
          </p>

          <div className="w-full flex flex-col gap-2.5">
            {/* Google Login button */}
            <button
              onClick={handleGoogleLogin}
              className="w-full py-3 px-5 rounded-xl flex items-center justify-center gap-3 bg-white text-zinc-950 hover:bg-zinc-100 active:scale-[0.98] transition-all font-semibold text-xs cursor-pointer shadow-lg shadow-white/5"
            >
              <svg className="w-5 h-5 flex-shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Continue with Google</span>
            </button>
            {authError && (
              <div className="mt-2 text-xs text-red-400 bg-red-400/10 border border-red-400/20 p-2.5 rounded-lg text-left leading-relaxed">
                <span className="font-semibold block mb-1">Login Blocked</span>
                {authError}
                <div className="mt-2 text-[10px] text-zinc-400">
                  Tip: Use the 'Open in new tab' button in the top right of the preview pane.
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 text-center">
            <p className="text-[9px] text-zinc-500 font-mono tracking-wider uppercase select-none">
              SECURE WORKSPACE
            </p>
          </div>
        </div>

        {/* Attribution bottom left of the screen */}
        <div className="absolute bottom-4 left-4 z-50 pointer-events-none select-none">
          <span className="font-mono text-zinc-600 font-semibold tracking-widest text-[9px] uppercase opacity-75">
            by nkh
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-zinc-900 overflow-hidden relative font-sans select-none">
      
      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Canvas 
          shadows
          camera={{ position: [4, 2, 4], fov: 45 }} 
          dpr={[1, 1.5]} 
          gl={{ 
             preserveDrawingBuffer: true, 
             alpha: true, 
             antialias: true,
             toneMapping: THREE.ACESFilmicToneMapping,
             toneMappingExposure: 1.2,
             // useLegacyLights has been removed to fix deprecation warning
          }}
        >
          {/* Only show solid color and fog in Studio mode. Outdoor modes use Environment background. */}
          {currentLighting === 'studio' && (
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
            
              {/* Realism: Soft Shadows & Contact Shadows */}
              {currentLighting === 'studio' && !isWalking && (
                <>
                  <SoftShadows size={20} samples={10} focus={0.5} />
                  <ContactShadows 
                    position={[0, 0, 0]} 
                    opacity={0.7} 
                    scale={10} 
                    blur={2.5} 
                    far={1}
                    resolution={512}
                    color="#000000"
                  />
                </>
              )}

            {/* 3D Content - Centered at Y=0 */}
            <group position={[0, 0, 0]}>
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
               enableRotate={currentView !== 'left' && currentView !== 'right' && controlsEnabled}
               enableZoom={true} 
               autoRotate={shouldAutoRotate}
               autoRotateSpeed={turntableSpeed} 
               enabled={controlsEnabled}
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