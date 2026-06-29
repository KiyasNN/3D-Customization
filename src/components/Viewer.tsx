// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { USDZLoader as USDLoader } from 'three/examples/jsm/loaders/USDZLoader.js';

interface ModelData {
  type: string;
  url: string;
}

interface ViewerProps {
  modelData: ModelData;
  onLoad?: () => void;
}

export const Viewer: React.FC<ViewerProps> = ({ modelData, onLoad }) => {
  const [scene, setScene] = useState<any>(null);

  useEffect(() => {
    if (modelData && modelData.type === 'usdz') {
      const loader = new USDLoader();
      loader.load(modelData.url, (group) => {
        setScene(group); // Set the loaded 3D group to the React state
        if (onLoad) onLoad(); // Trigger callbacks (such as fitting the camera)
      }, undefined, (error) => {
        console.error('Error loading USD:', error);
      });
    }
  }, [modelData, onLoad]);

  return (
    scene ? <primitive object={scene} /> : null
  );
};
