import { create } from 'zustand';
import { 
  AppState, 
  Material, 
  UploadedAsset, 
  SavedVariant, 
  TextureConfig, 
  TurntableSettings, 
  EnvironmentAsset 
} from './types';
import { 
  SHOE_PARTS, 
  INITIAL_MATERIALS, 
  INITIAL_STATE, 
  INITIAL_VISIBILITY 
} from './constants';
import { generateShoeConfig, generateTexture } from './services/geminiService';
import { processPBRMaps } from './services/materialEngine';

export const DEMO_ASSET: UploadedAsset = {
  id: "demo-shoe",
  url: "",
  name: "Demo Shoe",
  extension: "demo",
};

const getGroupParts = (state: any, partId: string): string[] => {
  const group = Object.values(state.partGroups || {}).find((parts: any) => parts.includes(partId)) as string[] | undefined;
  return group || [partId];
};

export const useStore = create<AppState>((set, get) => ({
  isMobile: false,

  selectedPart: null,
  selectedParts: [], // Init empty list of multi-selected parts
  hoveredPart: null,
  partMaterials: { ...INITIAL_STATE },
  partVisibility: { ...INITIAL_VISIBILITY },
  partTextureScales: {},
  partConfigs: {},
  partGroups: {}, // Init empty part groups
  partAnnotations: {}, // Init empty
  materials: [...INITIAL_MATERIALS],
  uploadedAssets: [],
  currentModel: DEMO_ASSET,
  customParts: [],
  modelResetCounter: 0,
  savedVariants: [],
  
  isSelectionMode: false,
  selectedVariantIds: [],
  
  history: [{ ...INITIAL_STATE }],
  historyIndex: 0,
  isGenerating: false,
  isProcessingMaterial: false,
  
  snapshotRequest: 0,
  snapshotMode: 'download',
  isSnapshotting: false,
  
  isTurntableActive: false,
  turntableSpeed: 4.0, // Default to 4.0 (quite fast)

  isWalking: false, // Initial walking state
  walkSpeed: 0.7, // Default reduced to 0.7
  reverseWalk: false, // New: Toggle reverse walk orientation
  baseShoeType: 'right', // Default
  recordingStatus: 'idle',
  recordedUrl: null,
  recordingRequest: 0,
  
  isRecordingSettingsOpen: false,
  turntableSettings: {
    duration: 4,
    fps: 60,
    direction: 'clockwise',
    useCurrentView: true // Default to true to frame fixed view to object
  },

  isSingleMode: false,
  isExploded: false,
  isDragging: false,
  cameraRequest: null,
  fitRequest: 0,
  currentView: 'default',
  showMeasurements: false,
  showAnnotations: true, // Default to visible
  labelSize: 1.0, // Default label size scale multiplier
  showFloor: false, // Default floor off
  showHelp: false,
  lightingEnabled: false, // Default flat virtual lights to OFF for beautiful contrast
  wireframeEnabled: false, // Default wireframe mode to OFF
  showEnvironmentBackground: false, // Default environment background to OFF
  currentLighting: 'studio',
  customEnvironment: null,
  environmentSettings: {
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    height: 2.5,
    radius: 120,
    scale: 100,
    intensity: 0.6, // Default to 0.6
    preset: 'studio'
  },
  effectsSettings: {
    postProcessingEnabled: false,
    bloomIntensity: 0.6,
    toneMapping: 'ACESFilmic',
    exposure: 1.0,
    aoEnabled: false,
    aoQuality: 'medium'
  },
  currentFloor: 'studio',
  
  isTransforming: false,
  showTransformGizmo: true, // Default to true so transform gizmo shows up automatically
  transformGizmoSize: 0.35, // Default size for the gizmo
  transformMode: 'translate',
  
  activeVideoStream: null,

  setIsMobile: (isMobile) => set({ isMobile }),
  setIsDragging: (isDragging) => set({ isDragging }),

  selectPart: (partId) => set((state) => {
    // Prevent selection if recording
    if (state.recordingStatus === 'recording') return {};

    if (state.isSingleMode && partId) {
       const partsList = state.currentModel ? state.customParts : SHOE_PARTS.map(p => p.id);
       const newVisibility: Record<string, boolean> = {};
       partsList.forEach(id => {
         newVisibility[id] = id === partId;
       });
       return { selectedPart: partId, selectedParts: partId ? [partId] : [], partVisibility: newVisibility, isDragging: false };
    }
    return { selectedPart: partId, selectedParts: partId ? [partId] : [], isDragging: false };
  }),

  hoverPart: (partId) => set({ hoveredPart: partId }),

  setMaterial: (partId, materialId) => set((state) => {
    const partsToUpdate = getGroupParts(state, partId);
    const newMaterials = { ...state.partMaterials };
    partsToUpdate.forEach(id => {
      newMaterials[id] = materialId;
    });
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(newMaterials);
    return {
      partMaterials: newMaterials,
      history: newHistory,
      historyIndex: newHistory.length - 1
    };
  }),

  setTextureScale: (partId, scale) => set((state) => {
    // Keep legacy sync but also update new config
    const currentConfig = state.partConfigs[partId] || { scale: 2, normalScale: 1, roughness: 0.5, displacementScale: 0 };
    return {
      partTextureScales: { ...state.partTextureScales, [partId]: scale },
      partConfigs: { ...state.partConfigs, [partId]: { ...currentConfig, scale } }
    };
  }),

  updatePartConfig: (partId, config) => set((state) => {
    const partsToUpdate = getGroupParts(state, partId);
    const newPartConfigs = { ...state.partConfigs };
    const newTextureScales = { ...state.partTextureScales };
    
    partsToUpdate.forEach(id => {
      const current = newPartConfigs[id] || { scale: 2, normalScale: 1, roughness: 0.5, displacementScale: 0 };
      newPartConfigs[id] = { ...current, ...config };
      if (config.scale) {
        newTextureScales[id] = config.scale;
      }
    });

    return {
      partConfigs: newPartConfigs,
      ...(config.scale ? { partTextureScales: newTextureScales } : {})
    };
  }),

  setAnnotation: (partId, annotation) => set((state) => ({
    partAnnotations: { ...state.partAnnotations, [partId]: annotation }
  })),

  addMaterial: (material) => set((state) => ({ 
    materials: [material, ...state.materials] 
  })),

  removeMaterial: (materialId) => set((state) => {
    // Filter out the material
    const newMaterials = state.materials.filter(m => m.id !== materialId);
    
    // Check if any parts are currently using this material and reset them
    const newPartMaterials = { ...state.partMaterials };
    let materialsChanged = false;

    Object.keys(newPartMaterials).forEach(partId => {
       if (newPartMaterials[partId] === materialId) {
          // Revert to default or white if not found in initial state
          newPartMaterials[partId] = (INITIAL_STATE as any)[partId] || 'mat-leather-white';
          materialsChanged = true;
       }
    });

    // Update history if we changed assignments
    let newHistory = state.history;
    let newHistoryIndex = state.historyIndex;

    if (materialsChanged) {
       newHistory = state.history.slice(0, state.historyIndex + 1);
       newHistory.push(newPartMaterials);
       newHistoryIndex = newHistory.length - 1;
    }

    return {
      materials: newMaterials,
      partMaterials: materialsChanged ? newPartMaterials : state.partMaterials,
      history: materialsChanged ? newHistory : state.history,
      historyIndex: materialsChanged ? newHistoryIndex : state.historyIndex
    };
  }),

  removeMaterialGroup: (groupName) => set((state) => {
    // Filter out all materials belonging to this group
    const newMaterials = state.materials.filter(m => m.group !== groupName);
    const materialsToRemove = state.materials.filter(m => m.group === groupName).map(m => m.id);
    
    // Reset parts using these materials
    const newPartMaterials = { ...state.partMaterials };
    let materialsChanged = false;

    Object.keys(newPartMaterials).forEach(partId => {
       if (materialsToRemove.includes(newPartMaterials[partId])) {
          newPartMaterials[partId] = (INITIAL_STATE as any)[partId] || 'mat-leather-white';
          materialsChanged = true;
       }
    });

    let newHistory = state.history;
    let newHistoryIndex = state.historyIndex;

    if (materialsChanged) {
       newHistory = state.history.slice(0, state.historyIndex + 1);
       newHistory.push(newPartMaterials);
       newHistoryIndex = newHistory.length - 1;
    }

    return {
      materials: newMaterials,
      partMaterials: materialsChanged ? newPartMaterials : state.partMaterials,
      history: materialsChanged ? newHistory : state.history,
      historyIndex: materialsChanged ? newHistoryIndex : state.historyIndex
    };
  }),

  setGenerating: (loading) => set({ isGenerating: loading }),

  undo: () => set((state) => {
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      return {
        historyIndex: newIndex,
        partMaterials: state.history[newIndex]
      };
    }
    return {};
  }),

  redo: () => set((state) => {
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      return {
        historyIndex: newIndex,
        partMaterials: state.history[newIndex]
      };
    }
    return {};
  }),

  hidePart: () => set((state) => {
    if (!state.selectedPart) return {};
    const partsToUpdate = getGroupParts(state, state.selectedPart);
    const newVisibility = { ...state.partVisibility };
    partsToUpdate.forEach(id => {
      newVisibility[id] = false;
    });
    return {
      partVisibility: newVisibility
    };
  }),

  singlePart: () => set((state) => {
    if (!state.selectedPart) return {};
    const partsList = state.currentModel ? state.customParts : SHOE_PARTS.map(p => p.id);
    
    if (state.isSingleMode) {
      // Restore all
      const newVisibility: Record<string, boolean> = {};
      partsList.forEach(id => {
        newVisibility[id] = true;
      });
      return { partVisibility: newVisibility, isSingleMode: false };
    } else {
      // Isolate selected
      const newVisibility: Record<string, boolean> = {};
      partsList.forEach(id => {
        newVisibility[id] = id === state.selectedPart;
      });
      return { partVisibility: newVisibility, isSingleMode: true };
    }
  }),

  showAllParts: () => set((state) => {
    const partsList = state.currentModel ? state.customParts : SHOE_PARTS.map(p => p.id);
    const newVisibility: Record<string, boolean> = {};
    partsList.forEach(id => {
      newVisibility[id] = true;
    });
    return { partVisibility: newVisibility, isSingleMode: false };
  }),

  resetAllExplode: () => set((state) => {
    const newConfigs = { ...state.partConfigs };
    const selectedParts = state.selectedParts || [];
    const selectedPart = state.selectedPart;
    
    let partsToReset: string[] = [];
    if (selectedParts.length > 0) {
      const allSelectedWithGroups = new Set<string>();
      selectedParts.forEach((partId: string) => {
        getGroupParts(state, partId).forEach(id => allSelectedWithGroups.add(id));
      });
      partsToReset = Array.from(allSelectedWithGroups);
    } else if (selectedPart) {
      partsToReset = getGroupParts(state, selectedPart);
    } else {
      partsToReset = Object.keys(newConfigs);
    }

    partsToReset.forEach(key => {
      newConfigs[key] = {
        ...newConfigs[key],
        explosionOffset: undefined,
        meshScale: undefined,
        meshRotation: undefined
      };
    });
    return { partConfigs: newConfigs };
  }),

  toggleExploded: () => set((state) => ({ isExploded: !state.isExploded })),

  toggleFloor: () => set((state) => ({ showFloor: !state.showFloor })),

  resetPart: (partId) => set((state) => {
    const partsToUpdate = getGroupParts(state, partId);
    const newMaterials = { ...state.partMaterials };
    partsToUpdate.forEach(id => {
      const defaultMat = (INITIAL_STATE as any)[id] || 'mat-leather-white';
      newMaterials[id] = defaultMat;
    });
    return { partMaterials: newMaterials };
  }),

  resetAllParts: () => set((state) => {
    let newMaterials = { ...state.partMaterials };
    let resetCounter = state.modelResetCounter;

    if (state.currentModel) {
       // For custom models, clear overrides to revert to original file
       state.customParts.forEach(p => delete newMaterials[p]);
       // Increment counter to force InteractiveModel to remount/reset
       resetCounter += 1;
     } else {
        // For default shoe, revert to specific initial configuration
        newMaterials = { ...INITIAL_STATE };
     }

     const newHistory = state.history.slice(0, state.historyIndex + 1);
     newHistory.push(newMaterials);

     return { 
       partMaterials: newMaterials,
       modelResetCounter: resetCounter,
       history: newHistory,
       historyIndex: newHistory.length - 1,
       partAnnotations: {}, // Clear annotations on reset
       selectedPart: null,
       selectedParts: []
     };
  }),

  triggerSnapshot: (mode = 'download') => {
    // 1. Enable Snapshot Mode (Forces 3D UI render)
    set({ isSnapshotting: true });
    
    // 2. Wait for React Render Cycle (UI -> 3D Mesh)
    setTimeout(() => {
        // 3. Trigger Screenshot Handler (Runs synchronously in App.tsx effect)
        set((state) => ({ 
            snapshotRequest: state.snapshotRequest + 1,
            snapshotMode: mode
        }));

        // 4. Cleanup after capture
        setTimeout(() => {
            set({ isSnapshotting: false });
        }, 500); 
    }, 200); 
  },

  saveVariantFromSnapshot: (thumbnail) => set((state) => {
    // Deep clone to prevent reference issues with nested objects
    const deepCloneConfigs = JSON.parse(JSON.stringify(state.partConfigs));
    const deepCloneAnnotations = JSON.parse(JSON.stringify(state.partAnnotations));

    const newVariant: SavedVariant = {
      id: `variant-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: `Design ${state.savedVariants.length + 1}`,
      timestamp: Date.now(),
      thumbnail: thumbnail,
      materials: { ...state.partMaterials },
      textureScales: { ...state.partTextureScales },
      partConfigs: deepCloneConfigs,
      partAnnotations: deepCloneAnnotations
    };

    return { savedVariants: [newVariant, ...state.savedVariants] };
  }),

  loadVariant: (variantId) => set((state) => {
    const variant = state.savedVariants.find(v => v.id === variantId);
    if (variant) {
      return {
        partMaterials: { ...variant.materials },
        partTextureScales: { ...variant.textureScales },
        // Deep clone on load to prevent mutating the saved variant later
        partConfigs: JSON.parse(JSON.stringify(variant.partConfigs)),
        partAnnotations: JSON.parse(JSON.stringify(variant.partAnnotations))
      };
    }
    return {};
  }),

  deleteVariant: (variantId) => set((state) => {
    return {
      savedVariants: state.savedVariants.filter(v => v.id !== variantId),
      selectedVariantIds: state.selectedVariantIds.filter(id => id !== variantId)
    };
  }),

  // Selection Logic Actions
  setSelectionMode: (enabled) => set({ isSelectionMode: enabled, selectedVariantIds: [] }),
  
  toggleVariantSelection: (id) => set((state) => {
    if (state.selectedVariantIds.includes(id)) {
      return { selectedVariantIds: state.selectedVariantIds.filter(vid => vid !== id) };
    } else {
      return { selectedVariantIds: [...state.selectedVariantIds, id] };
    }
  }),
  
  selectAllVariants: () => set((state) => ({
    selectedVariantIds: state.savedVariants.map(v => v.id)
  })),
  
  clearSelection: () => set({ selectedVariantIds: [] }),

  toggleTurntable: () => set((state) => ({ isTurntableActive: !state.isTurntableActive, isWalking: false })),
  setTurntableSpeed: (speed) => set({ turntableSpeed: speed }),
  toggleWalking: () => set((state) => ({ isWalking: !state.isWalking, isTurntableActive: false })),
  toggleReverseWalk: () => set((state) => ({ reverseWalk: !state.reverseWalk })),
  setWalkSpeed: (speed) => set({ walkSpeed: speed }),
  setBaseShoeType: (type) => set({ baseShoeType: type }),
  
  openRecordingSettings: () => set({ isRecordingSettingsOpen: true }),
  closeRecordingSettings: () => set({ isRecordingSettingsOpen: false }),
  setTurntableSettings: (settings) => set((state) => ({ 
    turntableSettings: { ...state.turntableSettings, ...settings } 
  })),

  triggerRecording: () => set((state) => ({ 
    recordingStatus: 'recording',
    recordingRequest: state.recordingRequest + 1,
    isRecordingSettingsOpen: false 
  })),
  
  finishRecording: (url) => set({ recordingStatus: 'review', recordedUrl: url }),
  
  cancelRecording: () => set({ recordingStatus: 'idle', recordedUrl: null }),
  
  discardRecording: () => set((state) => {
    if (state.recordedUrl) URL.revokeObjectURL(state.recordedUrl);
    return { recordingStatus: 'idle', recordedUrl: null };
  }),

  uploadAsset: (asset: UploadedAsset) => set((state) => ({
    uploadedAssets: [...state.uploadedAssets, asset],
    currentModel: asset,
    selectedPart: null,
    customParts: []
  })),

  removeAsset: (assetId) => set((state) => {
    const newAssets = state.uploadedAssets.filter(a => a.id !== assetId);
    // If the removed asset is currently active, switch back to Demo
    const isActive = state.currentModel?.id === assetId;
    const newCurrent = isActive ? DEMO_ASSET : state.currentModel;
    
    // Revoke URL if possible to free memory
    const assetToRemove = state.uploadedAssets.find(a => a.id === assetId);
    if (assetToRemove?.url?.startsWith('blob:')) {
       URL.revokeObjectURL(assetToRemove.url);
    }

    return {
       uploadedAssets: newAssets,
       currentModel: newCurrent,
       ...(isActive ? { selectedPart: null, customParts: [] } : {})
    };
  }),

  clearScene: () => set((state) => {
    state.uploadedAssets.forEach(asset => {
      if (asset.url?.startsWith('blob:')) {
        URL.revokeObjectURL(asset.url);
      }
    });
    return {
      uploadedAssets: [],
      currentModel: DEMO_ASSET,
      selectedPart: null,
      customParts: []
    };
  }),

  setCurrentModel: (asset) => set((state) => {
    if (state.currentModel?.id !== asset?.id) {
      return { 
        currentModel: asset,
        selectedPart: null,
        customParts: []
      };
    }
    return { currentModel: asset };
  }),
  
  setCustomParts: (parts) => set((state) => {
    // CRITICAL FIX: Prevent infinite loop by checking if parts are actually different
    if (
      parts.length === state.customParts.length && 
      parts.every((p, i) => p === state.customParts[i])
    ) {
      return {}; 
    }

    const newVisibility = { ...state.partVisibility };
    parts.forEach(p => newVisibility[p] = true);
    return { customParts: parts, partVisibility: newVisibility };
  }),

  uploadMaterial: (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const newMat: Material = {
          id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: file.name.replace(/\.[^/.]+$/, ""),
          color: '#ffffff',
          roughness: 0.5,
          metalness: 0.0,
          type: 'fabric',
          textureUrl: e.target.result as string
        };
        get().addMaterial(newMat);
      }
    };
    reader.readAsDataURL(file);
  },

  uploadEnvironment: (file: File) => set((state) => {
    // Cleanup old if exists (Safe check for url)
    if (state.customEnvironment?.url?.startsWith('blob:')) {
      URL.revokeObjectURL(state.customEnvironment.url);
    }
    
    const url = URL.createObjectURL(file);
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    
    return {
      customEnvironment: {
        id: `env-${Date.now()}`,
        url,
        name: file.name,
        extension
      },
      currentLighting: 'custom'
    };
  }),

  updateEnvironmentSettings: (settings) => set((state) => ({
    environmentSettings: { ...state.environmentSettings, ...settings }
  })),

  updateEffectsSettings: (settings) => set((state) => ({
    effectsSettings: { ...state.effectsSettings, ...settings }
  })),

  createPBRMaterial: async (file: File) => {
    const reader = new FileReader();
    set({ isProcessingMaterial: true });
    
    reader.onload = async (e) => {
       if (e.target?.result) {
          const base64 = e.target.result as string;
          
          try {
             // Generate maps
             const maps = await processPBRMaps(base64);
             
             const newMat: Material = {
                id: `pbr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                name: `PBR: ${file.name.replace(/\.[^/.]+$/, "").substring(0, 10)}`,
                color: '#ffffff',
                roughness: 1.0, 
                metalness: 0.0,
                type: 'fabric',
                textureUrl: base64,
                normalMapUrl: maps.normalMapUrl,
                roughnessMapUrl: maps.roughnessMapUrl,
                displacementMapUrl: maps.displacementMapUrl,
                aoMapUrl: maps.aoMapUrl
             };
             
             get().addMaterial(newMat);
          } catch (err) {
             console.error("PBR Generation failed", err);
          } finally {
             set({ isProcessingMaterial: false });
          }
       }
    };
    reader.readAsDataURL(file);
  },

  generateFullDesign: async (prompt: string) => {
    const state = get();
    set({ isGenerating: true });
    
    // Get list of current part IDs
    const currentPartIds = state.currentModel ? state.customParts : SHOE_PARTS.map(p => p.id);
    
    // 1. Get the plan (JSON)
    const styles = await generateShoeConfig(prompt, currentPartIds);
    
    if (styles && styles.length > 0) {
      // 2. Identify unique texture prompts to avoid duplicate API calls
      const uniqueTexturePrompts = [...new Set(styles.map(s => s.texturePrompt).filter(p => !!p))];
      const textureMap: Record<string, string> = {};

      // 3. Generate textures in parallel
      await Promise.all(uniqueTexturePrompts.map(async (texturePrompt) => {
         try {
           const materialResult = await generateTexture(texturePrompt);
           if (materialResult && materialResult.textureUrl) {
              textureMap[texturePrompt] = materialResult.textureUrl;
           }
         } catch (e) {
           console.error("Failed to generate texture for prompt:", texturePrompt, e);
         }
      }));

      // 4. Hydrate styles with texture URLs
      const hydratedStyles = styles.map(style => ({
         ...style,
         textureUrl: textureMap[style.texturePrompt] // will be undefined if generation failed or no prompt
      }));

      // 5. Apply
      get().applyAIStyle(hydratedStyles, prompt);
    }

    set({ isGenerating: false });
  },

  applyAIStyle: (styles, sourcePrompt) => set((state) => {
     const newMaterials = [...state.materials];
     const newPartMaterials = { ...state.partMaterials };
     
     styles.forEach((style, index) => {
        // Create new unique material for this part's style
        // Use random string to ensure uniqueness even if loop runs instantly
        const matId = `ai-style-${style.partId}-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`;
        
        const newMat: Material = {
            id: matId,
            name: style.materialName,
            color: style.color,
            roughness: style.roughness,
            metalness: style.metalness,
            type: 'ai-generated',
            group: sourcePrompt, // Store grouping info
            textureUrl: style.textureUrl // Apply generated texture if available
        };
        newMaterials.push(newMat);
        
        // Apply to part if it exists (check customParts or default SHOE_PARTS)
        if (state.customParts.includes(style.partId) || SHOE_PARTS.some(p => p.id === style.partId)) {
             newPartMaterials[style.partId] = matId;
        }
     });

     const newHistory = state.history.slice(0, state.historyIndex + 1);
     newHistory.push(newPartMaterials);

     return {
        materials: newMaterials,
        partMaterials: newPartMaterials,
        history: newHistory,
        historyIndex: newHistory.length - 1
     };
  }),

  toggleMeasurements: () => set((state) => ({ showMeasurements: !state.showMeasurements })),
  
  toggleAnnotations: () => set((state) => ({ showAnnotations: !state.showAnnotations })),

  setLabelSize: (size) => set({ labelSize: size }),

  toggleHelp: () => set((state) => ({ showHelp: !state.showHelp })),

  setLightingEnabled: (enabled) => set({ lightingEnabled: enabled }),
  setWireframeEnabled: (enabled) => set({ wireframeEnabled: enabled }),
  setShowEnvironmentBackground: (enabled) => set({ showEnvironmentBackground: enabled }),
  setIsTransforming: (isTransforming) => set({ isTransforming, isDragging: false }),
  setShowTransformGizmo: (showTransformGizmo) => set({ showTransformGizmo }),
  setTransformGizmoSize: (transformGizmoSize) => set({ transformGizmoSize }),
  setTransformMode: (transformMode) => set({ transformMode }),

  setLighting: (preset) => set({ currentLighting: preset }),
  resetEnvironmentSettings: () => set({
    lightingEnabled: false,
    wireframeEnabled: false,
    showEnvironmentBackground: false,
    currentLighting: 'studio',
    environmentSettings: {
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
      height: 2.5,
      radius: 120,
      scale: 100,
      intensity: 0.6,
      preset: 'studio'
    },
    effectsSettings: {
      postProcessingEnabled: false,
      bloomIntensity: 0.6,
      toneMapping: 'ACESFilmic',
      exposure: 1.0,
      aoEnabled: false,
      aoQuality: 'medium'
    }
  }),
  groupPart: (partId, groupName) => set((state) => {
    const newGroups = { ...state.partGroups };
    
    // First, remove partId from any existing group
    Object.keys(newGroups).forEach((name) => {
      newGroups[name] = newGroups[name].filter((id) => id !== partId);
      if (newGroups[name].length === 0) {
        delete newGroups[name];
      }
    });

    // Add to the new group
    if (!newGroups[groupName]) {
      newGroups[groupName] = [];
    }
    if (!newGroups[groupName].includes(partId)) {
      newGroups[groupName].push(partId);
    }

    return { partGroups: newGroups };
  }),

  groupParts: (partIds, groupName) => set((state) => {
    const newGroups = { ...state.partGroups };
    
    // First, remove each partId from any existing group
    partIds.forEach(partId => {
      Object.keys(newGroups).forEach((name) => {
        newGroups[name] = newGroups[name].filter((id) => id !== partId);
        if (newGroups[name].length === 0) {
          delete newGroups[name];
        }
      });
    });

    // Add them to the new group
    if (!newGroups[groupName]) {
      newGroups[groupName] = [];
    }
    partIds.forEach(partId => {
      if (!newGroups[groupName].includes(partId)) {
        newGroups[groupName].push(partId);
      }
    });

    return { partGroups: newGroups, selectedParts: [] };
  }),

  renameGroup: (oldName, newName) => set((state) => {
    const newGroups = { ...state.partGroups };
    if (newGroups[oldName] && oldName !== newName && newName.trim() !== "") {
      newGroups[newName] = newGroups[oldName];
      delete newGroups[oldName];
    }
    return { partGroups: newGroups };
  }),

  releasePartFromGroup: (partId) => set((state) => {
    const newGroups = { ...state.partGroups };
    
    Object.keys(newGroups).forEach((name) => {
      newGroups[name] = newGroups[name].filter((id) => id !== partId);
      if (newGroups[name].length === 0) {
        delete newGroups[name];
      }
    });

    return { partGroups: newGroups };
  }),

  ungroupGroup: (groupName) => set((state) => {
    const newGroups = { ...state.partGroups };
    delete newGroups[groupName];
    return { partGroups: newGroups };
  }),

  toggleSelectPartMulti: (partId) => set((state) => {
    const selectedParts = state.selectedParts || [];
    const isAlreadySelected = selectedParts.includes(partId);
    let newSelectedParts: string[];
    
    if (isAlreadySelected) {
      newSelectedParts = selectedParts.filter((id) => id !== partId);
    } else {
      newSelectedParts = [...selectedParts, partId];
    }
    
    // Sync single-selectedPart to keep the gizmo on the latest active selected part
    let newSelectedPart = state.selectedPart;
    if (!isAlreadySelected) {
      newSelectedPart = partId;
    } else if (state.selectedPart === partId) {
      newSelectedPart = newSelectedParts.length > 0 ? newSelectedParts[newSelectedParts.length - 1] : null;
    }
    
    return { 
      selectedParts: newSelectedParts,
      selectedPart: newSelectedPart
    };
  }),

  setSelectedParts: (partIds) => set({ selectedParts: partIds }),
  clearSelectedParts: () => set({ selectedParts: [] }),
  setFloor: (floor) => set({ currentFloor: floor }),
  
  setVideoStream: (stream) => set({ activeVideoStream: stream }),

  setCameraView: (view) => {
    let position: [number, number, number] = [4, 2, 4];
    const target: [number, number, number] = [0, 0.5, 0]; // Lowered target to center on volume
    
    switch (view) {
      case 'left':
        position = [-4.5, 0.5, 0];
        break;
      case 'right':
        position = [4.5, 0.5, 0];
        break;
      case 'back':
        position = [0, 1, -4.5];
        break;
      case 'default':
      default:
        position = [4, 2, 4];
        break;
    }
    set({ cameraRequest: { position, target }, currentView: view });
  },

  // New action to frame specific bounds
  setCustomCamera: (position: [number, number, number], target: [number, number, number]) => set({ cameraRequest: { position, target }, currentView: 'free' }),
  triggerFitView: () => set((state) => ({ fitRequest: state.fitRequest + 1 })),
}));