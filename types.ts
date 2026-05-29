

export interface Material {
  id: string;
  name: string;
  color: string;
  textureUrl?: string; // Base Color / Albedo
  normalMapUrl?: string;
  roughnessMapUrl?: string;
  metalnessMapUrl?: string;
  aoMapUrl?: string;
  displacementMapUrl?: string;
  roughness: number;
  metalness: number;
  type: 'leather' | 'fabric' | 'rubber' | 'metallic' | 'ai-generated' | 'video';
  group?: string; // Stores the source prompt for AI materials
}

export interface ShoePart {
  id: string;
  name: string;
  meshName: string; // Internal mesh name
}

export interface UploadedAsset {
  id: string;
  url: string;
  name: string;
  extension: string; // 'glb' | 'gltf' | 'obj'
  resources?: Record<string, string>; // Filename -> BlobURL map for textures/bins
}

export interface EnvironmentAsset {
  id: string;
  url: string;
  name: string;
  extension: string; // 'hdr' | 'exr' | 'jpg' | 'png'
}

export interface EnvironmentSettings {
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  height: number;
  radius: number;
  scale: number;
  intensity: number;
}

export interface TextureConfig {
  scale: number;
  normalScale: number;
  roughness: number;
  displacementScale: number;
  explosionOffset?: [number, number, number]; // New: Custom explosion vector
  meshScale?: number; // New: Manual scale adjustment for the part
  projectedImageUrl?: string; // New: custom image projected URL
  projectionOffsetX?: number;
  projectionOffsetY?: number;
  projectionScaleX?: number;
  projectionScaleY?: number;
  projectionRotation?: number;
  projectionRepeat?: boolean;
}

export interface Annotation {
  title: string;
  description: string;
  offset?: number; // Distance in pixels from the object center
}

export interface SavedVariant {
  id: string;
  name: string;
  timestamp: number;
  thumbnail: string; // Data URL
  materials: Record<string, string>; // The configuration
  textureScales: Record<string, number>;
  partConfigs: Record<string, TextureConfig>;
  partAnnotations: Record<string, Annotation>; // New: Saved text
}

export interface TurntableSettings {
  duration: number; // seconds
  fps: number;
  direction: 'clockwise' | 'counter-clockwise';
  useCurrentView: boolean;
}

export interface AIStyleConfig {
  partId: string;
  color: string;
  roughness: number;
  metalness: number;
  materialName: string;
  texturePrompt: string; // New: Description for image generator
  textureUrl?: string; // New: Resulting image URL
}

export type LightingPreset = 'studio' | 'sunset' | 'dawn' | 'warehouse' | 'forest' | 'night' | 'custom';
export type FloorType = 'studio' | 'street' | 'sand';

export type RecordingStatus = 'idle' | 'recording' | 'review';

export interface AppState {
  isMobile: boolean; // New: responsive state

  selectedPart: string | null;
  hoveredPart: string | null;
  partMaterials: Record<string, string>; // partId -> materialId
  partVisibility: Record<string, boolean>; // partId -> visible
  partTextureScales: Record<string, number>; // Legacy support, prefer partConfigs
  partConfigs: Record<string, TextureConfig>; // New: Detailed config per part
  partAnnotations: Record<string, Annotation>; // New: User text per part
  
  materials: Material[];
  
  uploadedAssets: UploadedAsset[]; // List of uploaded model metadata
  currentModel: UploadedAsset | null; // Currently loaded custom model
  customParts: string[]; // List of part IDs found in custom model
  modelResetCounter: number; // Increment to force remount/reset of custom model

  savedVariants: SavedVariant[]; // Saved designs
  
  // Selection Logic for Variants
  isSelectionMode: boolean;
  selectedVariantIds: string[];

  history: Record<string, string>[];
  historyIndex: number;
  isGenerating: boolean;
  isProcessingMaterial: boolean; // New state for PBR generation
  
  // Snapshot logic
  snapshotRequest: number; // Increment to trigger snapshot
  snapshotMode: 'download' | 'save'; // 'download' to disk or 'save' to dashboard
  isSnapshotting: boolean; // New: Indicates a snapshot is being prepared (renders 3D UI)

  // Turntable & Recording
  isTurntableActive: boolean; // Continuous rotation view mode
  recordingStatus: RecordingStatus; // 'idle' | 'recording' | 'review'
  recordedUrl: string | null; // Blob URL of the recorded video
  recordingRequest: number; // Increment to trigger video recording
  
  // Turntable Settings
  isRecordingSettingsOpen: boolean;
  turntableSettings: TurntableSettings;
  turntableSpeed: number; // New: Speed for live view auto-rotation

  // Logic states
  isSingleMode: boolean;
  isExploded: boolean; // New: Exploded view state
  isWalking: boolean; // New: Mannequin walking mode
  walkSpeed: number; // New: Speed of the walking animation
  baseShoeType: 'left' | 'right'; // New: Defines orientation of source model
  cameraRequest: { position: [number, number, number], target: [number, number, number] } | null;
  currentView: 'default' | 'left' | 'right' | 'back' | 'free';
  showMeasurements: boolean;
  showAnnotations: boolean; // New: Toggle annotation visibility
  showFloor: boolean; // New: Toggle floor visibility
  showHelp: boolean;
  currentLighting: LightingPreset;
  customEnvironment: EnvironmentAsset | null; // New: Custom environment file
  environmentSettings: EnvironmentSettings; // New: Calibration settings
  currentFloor: FloorType;
  
  // Camera / Video
  activeVideoStream: MediaStream | null;

  // Actions
  setIsMobile: (isMobile: boolean) => void;
  selectPart: (partId: string | null) => void;
  hoverPart: (partId: string | null) => void;
  setMaterial: (partId: string, materialId: string) => void;
  setTextureScale: (partId: string, scale: number) => void; // Legacy
  updatePartConfig: (partId: string, config: Partial<TextureConfig>) => void; // New
  setAnnotation: (partId: string, annotation: Annotation) => void; // New
  addMaterial: (material: Material) => void;
  removeMaterial: (materialId: string) => void; 
  removeMaterialGroup: (groupName: string) => void; // New Action: Delete all materials in a group
  setGenerating: (loading: boolean) => void;
  undo: () => void;
  redo: () => void;
  
  // New Features
  hidePart: () => void; 
  singlePart: () => void;
  showAllParts: () => void; 
  toggleExploded: () => void; // New
  toggleFloor: () => void; // New
  resetPart: (partId: string) => void;
  resetAllParts: () => void; // Reset entire model to default
  
  triggerSnapshot: (mode?: 'download' | 'save') => void;
  saveVariantFromSnapshot: (thumbnail: string) => void; // Callback called by canvas
  loadVariant: (variantId: string) => void;
  deleteVariant: (variantId: string) => void;

  // Selection Actions
  setSelectionMode: (enabled: boolean) => void;
  toggleVariantSelection: (id: string) => void;
  selectAllVariants: () => void;
  clearSelection: () => void;

  toggleTurntable: () => void;
  setTurntableSpeed: (speed: number) => void; // New
  toggleWalking: () => void; // New
  setWalkSpeed: (speed: number) => void; // New
  setBaseShoeType: (type: 'left' | 'right') => void; // New
  
  openRecordingSettings: () => void;
  closeRecordingSettings: () => void;
  setTurntableSettings: (settings: Partial<TurntableSettings>) => void;
  triggerRecording: () => void;
  cancelRecording: () => void;
  finishRecording: (url: string) => void;
  discardRecording: () => void;

  uploadAsset: (asset: UploadedAsset) => void;
  removeAsset: (assetId: string) => void;
  uploadMaterial: (file: File) => void;
  uploadEnvironment: (file: File) => void; // New
  updateEnvironmentSettings: (settings: Partial<EnvironmentSettings>) => void; // New
  createPBRMaterial: (file: File) => void; 

  setCurrentModel: (asset: UploadedAsset | null) => void;
  setCustomParts: (parts: string[]) => void;
  toggleMeasurements: () => void;
  toggleAnnotations: () => void; // New
  toggleHelp: () => void;
  setLighting: (preset: LightingPreset) => void;
  setFloor: (floor: FloorType) => void;
  setVideoStream: (stream: MediaStream | null) => void;
  
  // Camera
  setCameraView: (view: 'default' | 'left' | 'right' | 'back') => void;

  // Firebase Auth
  user: any | null;
  authLoading: boolean;
  isAdmin: boolean;
  setUser: (user: any | null) => void;
  setAuthLoading: (loading: boolean) => void;
  setIsAdmin: (isAdmin: boolean) => void;

  // AI
  generateFullDesign: (prompt: string) => Promise<void>; // New Main Action
  applyAIStyle: (styles: AIStyleConfig[], sourcePrompt: string) => void;
}