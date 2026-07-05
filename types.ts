

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
  isPremium?: boolean; // Premium SaaS tier flag
  // Camera captured crop / warp metadata
  capturedTempImage?: string | null;
  cropWarpMode?: 'square' | 'perspective';
  cornerTL?: { x: number; y: number };
  cornerTR?: { x: number; y: number };
  cornerBL?: { x: number; y: number };
  cornerBR?: { x: number; y: number };
  cropX?: number;
  cropY?: number;
  cropSize?: number;
  blendAmount?: number;
  mirrorMode?: boolean;
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
  extension: string; // 'glb' | 'gltf' | 'obj' | 'usdz'
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
  preset?: string;
}

export interface EffectsSettings {
  postProcessingEnabled?: boolean;
  bloomIntensity: number;
  toneMapping?: 'ACESFilmic' | 'AgX' | 'Linear' | 'None';
  exposure?: number;
  aoEnabled?: boolean;
  aoQuality?: 'low' | 'medium' | 'high';
}

export interface TextureConfig {
  scale: number;
  normalScale: number;
  roughness: number;
  displacementScale: number;
  explosionOffset?: [number, number, number]; // New: Custom explosion vector
  meshScale?: number; // New: Manual scale adjustment for the part
  meshRotation?: [number, number, number]; // New: Manual rotation adjustment for the part
  projectionType?: 'planar' | 'box' | 'cylindrical' | 'uv';
  uvScale?: number;
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

export interface HistoryEntry {
  partMaterials: Record<string, string>;
  partVisibility: Record<string, boolean>;
  partConfigs: Record<string, TextureConfig>;
  partTextureScales: Record<string, number>;
  isSingleMode: boolean;
  selectedPart: string | null;
  selectedParts: string[];
}

export interface SaaSConfig {
  appName: string;
  themeColor: string; // 'blue' | 'purple' | 'emerald' | 'indigo' | 'rose'
  enabledFeatures: {
    aiGen: boolean;
    pbrGen: boolean;
    measurements: boolean;
    videoCapture: boolean;
  };
  pricingTiers: {
    freeLimit: number;
    proPrice: number;
  };
  metrics: {
    totalRevenue: number;
    activeUsers: number;
    customizationsCreated: number;
    conversions: number;
  };
  tenants: {
    id: string;
    name: string;
    tier: 'Free' | 'Pro' | 'Enterprise';
    status: 'Active' | 'Suspended';
    joined: string;
  }[];
}

export interface UserProfile {
  uid: string;
  email: string;
  status: 'pending' | 'approved' | 'blocked';
  requestedAt: number;
}

export interface AppState {
  isMobile: boolean; // New: responsive state
  user: { email: string | null; uid: string } | null; // Firebase user state
  setUser: (user: { email: string | null; uid: string } | null) => void;
  userProfile: UserProfile | null; // User authorization/approval status
  setUserProfile: (profile: UserProfile | null) => void;

  selectedPart: string | null;
  selectedParts: string[]; // New: list of multi-selected parts
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

  history: HistoryEntry[];
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
  reverseWalk: boolean; // New: Toggle reverse walk orientation
  baseShoeType: 'left' | 'right'; // New: Defines orientation of source model
  cameraRequest: { position: [number, number, number], target: [number, number, number] } | null;
  fitRequest: number;
  fitWithDefaultDirection: boolean;
  currentView: 'default' | 'left' | 'right' | 'back' | 'free';
  showMeasurements: boolean;
  showAnnotations: boolean; // New: Toggle annotation visibility
  labelSize: number; // New: Global label size scale multiplier
  showFloor: boolean; // New: Toggle floor visibility
  showHelp: boolean;
  lightingEnabled: boolean; // New: Toggle standard virtual lights
  wireframeEnabled: boolean; // New: Toggle material wireframe mode
  showEnvironmentBackground: boolean; // New: Toggle HDRI environment background
  currentLighting: LightingPreset;
  customEnvironment: EnvironmentAsset | null; // New: Custom environment file
  environmentSettings: EnvironmentSettings; // New: Calibration settings
  effectsSettings: EffectsSettings; // New: Postprocessing effect settings
  currentFloor: FloorType;
  
  // Dragging / Gizmo states
  isTransforming: boolean; // True when actively transforming a part in 3D using the gizmo
  showTransformGizmo: boolean; // Toggles the 3D transform cursor/gizmo
  transformGizmoSize: number; // Controls the size of the 3D transform cursor/gizmo
  transformMode: 'translate' | 'rotate' | 'scale';
  isDragging: boolean;
  isModelLoading: boolean; // New: is currently loading custom 3D model
  modelLoadingProgress: number; // New: progress percentage of model loading
  
  // Part Groups
  partGroups: Record<string, string[]>; // Map of groupName -> list of partIds in that group
  
  // Camera / Video
  activeVideoStream: MediaStream | null;

  // Actions
  setIsMobile: (isMobile: boolean) => void;
  setIsDragging: (isDragging: boolean) => void;
  setIsModelLoading: (loading: boolean) => void;
  setModelLoadingProgress: (progress: number) => void;
  setTransformMode: (mode: 'translate' | 'rotate' | 'scale') => void;
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
  togglePartVisibility: (partId: string) => void;
  singlePart: () => void;
  showAllParts: () => void; 
  toggleExploded: () => void; // New
  resetAllExplode: () => void; // New
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
  toggleReverseWalk: () => void; // New: Toggle reverse walk orientation
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
  clearScene: () => void;
  uploadMaterial: (file: File) => void;
  uploadEnvironment: (file: File) => void; // New
  updateEnvironmentSettings: (settings: Partial<EnvironmentSettings>) => void; // New
  updateEffectsSettings: (settings: Partial<EffectsSettings>) => void; // New
  createPBRMaterial: (file: File) => void; 

  setCurrentModel: (asset: UploadedAsset | null) => void;
  setCustomParts: (parts: string[]) => void;
  toggleMeasurements: () => void;
  toggleAnnotations: () => void; // New
  setLabelSize: (size: number) => void; // New
  toggleHelp: () => void;
  setLightingEnabled: (enabled: boolean) => void; // New
  setWireframeEnabled: (enabled: boolean) => void; // New
  setShowEnvironmentBackground: (enabled: boolean) => void; // New
  setIsTransforming: (isTransforming: boolean) => void; // New
  setShowTransformGizmo: (showTransformGizmo: boolean) => void; // New
  setTransformGizmoSize: (size: number) => void; // New
  setLighting: (preset: LightingPreset) => void;
  resetEnvironmentSettings: () => void; // New: Reset environment to defaults
  groupPart: (partId: string, groupName: string) => void; // New: Add selected part to a group
  groupParts: (partIds: string[], groupName: string) => void; // New: Add multiple selected parts to a group
  renameGroup: (oldName: string, newName: string) => void; // New: Rename a group
  releasePartFromGroup: (partId: string) => void; // New: Remove selected part from its group
  ungroupGroup: (groupName: string) => void; // New: Dissolve the entire group
  toggleSelectPartMulti: (partId: string) => void; // New: Toggle part in multi-select list
  setSelectedParts: (partIds: string[]) => void; // New: Set multi-selected parts directly
  clearSelectedParts: () => void; // New: Clear multi-selection list
  setFloor: (floor: FloorType) => void;
  setVideoStream: (stream: MediaStream | null) => void;
  
  // Camera
  setCameraView: (view: 'default' | 'left' | 'right' | 'back') => void;
  triggerFitView: (forceDefaultDirection?: boolean) => void;

  // AI
  generateFullDesign: (prompt: string) => Promise<void>; // New Main Action
  applyAIStyle: (styles: AIStyleConfig[], sourcePrompt: string) => void;

  // Custom Model Calibration
  modelCalibrations: Record<string, {
    scale: number;
    rotationX: number;
    rotationY: number;
    rotationZ: number;
    positionX: number;
    positionY: number;
    positionZ: number;
  }>;
  updateModelCalibration: (modelId: string, calibration: Partial<{
    scale: number;
    rotationX: number;
    rotationY: number;
    rotationZ: number;
    positionX: number;
    positionY: number;
    positionZ: number;
  }>) => void;

  // SaaS & Admin Panel State & Actions
  isAdminPanelOpen: boolean;
  saasConfig: SaaSConfig;
  setAdminPanelOpen: (isOpen: boolean) => void;
  updateSaasConfig: (config: Partial<SaaSConfig>) => void;
  toggleSaasFeature: (feature: 'aiGen' | 'pbrGen' | 'measurements' | 'videoCapture') => void;
  addSaasTenant: (tenant: { name: string; tier: 'Free' | 'Pro' | 'Enterprise' }) => void;
  deleteSaasTenant: (id: string) => void;
}