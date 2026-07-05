import React, { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { useStore } from "../store";
import { INITIAL_STATE } from "../constants";
import * as THREE from "three";

export const CanvasDragDropHandler = () => {
  const { camera, scene, gl, raycaster } = useThree();
  const setMaterial = useStore((s) => s.setMaterial);
  const hoverPart = useStore((s) => s.hoverPart);

  useEffect(() => {
    const canvasEl = gl.domElement;

    const isPartValid = (name: string) => {
      const customParts = useStore.getState().customParts || [];
      const keys = Object.keys(INITIAL_STATE);
      return keys.includes(name) || customParts.includes(name);
    };

    const getPartFromIntersection = (event: DragEvent): string | null => {
      const rect = canvasEl.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      const mouse = new THREE.Vector2(x, y);
      raycaster.setFromCamera(mouse, camera);

      // Intersect with all objects in the scene
      const intersects = raycaster.intersectObjects(scene.children, true);

      for (const hit of intersects) {
        let current: THREE.Object3D | null = hit.object;
        while (current && current !== scene) {
          if (current.name && isPartValid(current.name)) {
            return current.name;
          }
          current = current.parent;
        }
      }
      return null;
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy";
      }

      const hoveredPartId = getPartFromIntersection(e);
      if (hoveredPartId) {
        hoverPart(hoveredPartId);
      } else {
        hoverPart(null);
      }
    };

    const handleDragLeave = () => {
      hoverPart(null);
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      hoverPart(null);

      // Get dragged material ID
      const materialId = e.dataTransfer?.getData("text/plain");
      if (!materialId) return;

      const droppedPartId = getPartFromIntersection(e);
      if (droppedPartId) {
        setMaterial(droppedPartId, materialId);
      }
    };

    canvasEl.addEventListener("dragover", handleDragOver);
    canvasEl.addEventListener("dragleave", handleDragLeave);
    canvasEl.addEventListener("drop", handleDrop);

    return () => {
      canvasEl.removeEventListener("dragover", handleDragOver);
      canvasEl.removeEventListener("dragleave", handleDragLeave);
      canvasEl.removeEventListener("drop", handleDrop);
    };
  }, [camera, scene, gl, raycaster, setMaterial, hoverPart]);

  return null;
};
