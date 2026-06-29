import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, useProgress } from '@react-three/drei';
import * as THREE from 'three';
// @ts-ignore - Ignore missing types if they don't exist for USDLoader
import { USDLoader } from 'three/examples/jsm/loaders/USDLoader.js';

interface USDZModelProps {
  url: string;
}

export const USDZModel: React.FC<USDZModelProps> = ({ url }) => {
  const [scene, setScene] = useState<THREE.Group | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loader = new USDLoader();

    console.log(`Starting to load USDZ file from: ${url}`);
    
    loader.load(
      url,
      (usdGroup: THREE.Group) => {
        if (isMounted) {
          console.log(`Successfully loaded USDZ file: ${url}`);
          setScene(usdGroup);
        }
      },
      (progressEvent: ProgressEvent) => {
        if (progressEvent.lengthComputable) {
          const percentComplete = (progressEvent.loaded / progressEvent.total) * 100;
          console.log(`Loading USDZ... ${percentComplete.toFixed(2)}%`);
        } else {
          console.log(`Loading USDZ... ${progressEvent.loaded} bytes loaded`);
        }
      },
      (error: ErrorEvent | any) => {
        if (isMounted) {
          console.error(`Error loading USDZ file from ${url}:`, error);
          setError(error instanceof Error ? error : new Error('Failed to load USDZ file'));
        }
      }
    );

    return () => {
      isMounted = false;
    };
  }, [url]);

  if (error) {
    return (
      <Html center>
        <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded text-sm text-center">
          <p className="font-semibold">Error Loading Model</p>
          <p className="opacity-80">{error.message}</p>
        </div>
      </Html>
    );
  }

  if (!scene) {
    return null; // The Canvas suspense/fallback or HTML loader handles this visually
  }

  return <primitive object={scene} />;
};

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-zinc-700 border-t-white rounded-full animate-spin"></div>
        <p className="text-white text-sm font-medium">{progress.toFixed(0)}% Loaded</p>
      </div>
    </Html>
  );
}

interface Viewer3DProps {
  url: string;
  className?: string;
}

export const ThreeDViewer: React.FC<Viewer3DProps> = ({ url, className = '' }) => {
  return (
    <div className={`w-full h-full relative bg-zinc-950 ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        className="w-full h-full"
      >
        <color attach="background" args={['#09090b']} />
        
        {/* Light Setup */}
        <ambientLight intensity={0.5} />
        <directionalLight 
          position={[5, 10, 5]} 
          intensity={1.5} 
          castShadow
        />
        <directionalLight 
          position={[-5, 5, -5]} 
          intensity={0.8} 
        />
        
        {/* Model & Controls */}
        <React.Suspense fallback={<Loader />}>
          <USDZModel url={url} />
        </React.Suspense>
        
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          makeDefault
        />
      </Canvas>
    </div>
  );
};

export default ThreeDViewer;
