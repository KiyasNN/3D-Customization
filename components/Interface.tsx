import React, { useState, useRef, useEffect } from "react";
import { useStore, DEMO_ASSET } from "../store";
import { GuidedTour } from "./GuidedTour";
import { Search } from "lucide-react";
import { SHOE_PARTS, INITIAL_MATERIALS, MATERIAL_PRESETS } from "../constants";
import { generatePDF } from "../services/pdfService";
import { Material, UploadedAsset } from "../types";
import {
  Layers,
  Undo2,
  Redo2,
  Camera,
  Box,
  Bot,
  Sparkles,
  Download,
  CheckCircle,
  ChevronRight,
  Loader2,
  Plus,
  Minus,
  Upload,
  RotateCcw,
  ArrowLeftFromLine,
  ArrowRightFromLine,
  Ruler,
  HelpCircle,
  X,
  Sun,
  Moon,
  Cloud,
  Sunset,
  Warehouse,
  Aperture,
  Video,
  StopCircle,
  LayoutDashboard,
  Trash2,
  Repeat,
  Clapperboard,
  Wand2,
  Lightbulb,
  LightbulbOff,
  Eraser,
  Sliders,
  Clock,
  Settings2,
  RotateCw,
  Eye,
  EyeOff,
  CheckSquare,
  Square,
  List,
  RefreshCw,
  Palette,
  ChevronDown,
  Footprints,
  Save,
  FileText,
  Library,
  PanelLeftClose,
  PanelLeftOpen,
  Image as ImageIcon,
  Move,
  Maximize2,
  Minimize2,
  Type as TypeIcon,
  Tag,
  Grid3X3,
} from "lucide-react";

// Reusable Slider Component
const SliderControl = ({
  label,
  value,
  onChange,
  min,
  max,
  step,
  displayValue,
}: any) => {
  const stepVal = parseFloat(step);
  const minVal = parseFloat(min);
  const maxVal = parseFloat(max);

  const handleStep = (direction: -1 | 1) => {
    let next = value + stepVal * direction;
    // Clamp
    next = Math.max(minVal, Math.min(maxVal, next));

    // Fix float precision (e.g. 0.1 + 0.2 = 0.30000004) based on step decimals
    const stepStr = step.toString();
    const decimals = stepStr.includes(".") ? stepStr.split(".")[1].length : 0;
    next = parseFloat(next.toFixed(decimals));

    onChange(next);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-medium text-zinc-400">{label}</span>
        <span className="text-[10px] text-zinc-500 font-mono">
          {displayValue !== undefined ? displayValue : value}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleStep(-1)}
          className="w-6 h-6 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors border border-white/5 active:bg-white/20"
          title="Decrease"
        >
          <Minus size={10} />
        </button>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-1 accent-blue-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
        />
        <button
          onClick={() => handleStep(1)}
          className="w-6 h-6 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors border border-white/5 active:bg-white/20"
          title="Increase"
        >
          <Plus size={10} />
        </button>
      </div>
    </div>
  );
};

// Top Toolbar Button Component
const TopButton = ({
  icon,
  label,
  onClick,
  active,
  disabled,
  color = "zinc",
}: any) => {
  const baseColors = {
    zinc: active
      ? "bg-zinc-600 text-white shadow-lg"
      : "text-zinc-400 hover:text-white hover:bg-white/5",
    blue: active
      ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
      : "text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10",
    red: active
      ? "bg-red-600 text-white shadow-lg shadow-red-900/20 animate-pulse"
      : "text-zinc-400 hover:text-red-400 hover:bg-red-500/10",
    orange: active
      ? "bg-orange-600 text-white shadow-lg shadow-orange-900/20"
      : "text-zinc-400 hover:text-orange-400 hover:bg-orange-500/10",
  };

  const colorClass = (baseColors as any)[color] || baseColors.zinc;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex flex-col items-center justify-center p-2 rounded-lg transition-all min-w-[3.5rem] gap-1.5 border border-transparent flex-shrink-0
        ${disabled ? "opacity-30 cursor-not-allowed" : ""}
        ${colorClass}
        ${active ? "border-white/10" : ""}
      `}
      title={label}
    >
      {React.cloneElement(icon as React.ReactElement<any>, { size: 18 })}
      <span className="text-[9px] font-medium tracking-tight whitespace-nowrap">
        {label}
      </span>
    </button>
  );
};



// Preset Colors with Names
const PRESET_COLORS = [
  { hex: "#ffffff", name: "Titanium White" },
  { hex: "#000000", name: "Midnight Black" },
  { hex: "#ef4444", name: "Racing Red" },
  { hex: "#22c55e", name: "Neon Green" },
  { hex: "#3b82f6", name: "Electric Blue" },
  { hex: "#eab308", name: "Lemon Yellow" },
  { hex: "#d946ef", name: "Magenta Power" },
  { hex: "#06b6d4", name: "Cyan Future" },
  { hex: "#64748b", name: "Slate Grey" },
  { hex: "#575c44", name: "Olive Drab" },
  { hex: "#d97706", name: "Burnt Amber" },
  { hex: "#a855f7", name: "Royal Purple" },
  { hex: "#ec4899", name: "Hot Pink" },
  { hex: "#14b8a6", name: "Teal" },
  { hex: "#6366f1", name: "Indigo" },
  { hex: "#f43f5e", name: "Rose" },
  { hex: "#84cc16", name: "Lime" },
  { hex: "#10b981", name: "Emerald" },
  { hex: "#f97316", name: "Orange" },
  { hex: "#78716c", name: "Stone" },
];

const TopToolbar = ({
  onWalkClick,
  onRecordingClick,
  setShowLeftPanel,
  showLeftPanel,
}: any) => {
  const setCameraView = useStore((s) => s.setCameraView);
  const toggleTurntable = useStore((s) => s.toggleTurntable);
  const isTurntableActive = useStore((s) => s.isTurntableActive);
  const isWalking = useStore((s) => s.isWalking);
  const isExploded = useStore((s) => s.isExploded);
  const toggleExploded = useStore((s) => s.toggleExploded);
  const resetAllExplode = useStore((s) => s.resetAllExplode);
  const showFloor = useStore((s) => s.showFloor);
  const toggleFloor = useStore((s) => s.toggleFloor);
  const hidePart = useStore((s) => s.hidePart);
  const selectedPart = useStore((s) => s.selectedPart);
  const singlePart = useStore((s) => s.singlePart);
  const isSingleMode = useStore((s) => s.isSingleMode);
  const toggleMeasurements = useStore((s) => s.toggleMeasurements);
  const showMeasurements = useStore((s) => s.showMeasurements);
  const toggleAnnotations = useStore((s) => s.toggleAnnotations);
  const showAnnotations = useStore((s) => s.showAnnotations);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const resetPart = useStore((s) => s.resetPart);
  const selectPart = useStore((s) => s.selectPart);
  const resetAllParts = useStore((s) => s.resetAllParts);
  const triggerSnapshot = useStore((s) => s.triggerSnapshot);
  const recordingStatus = useStore((s) => s.recordingStatus);
  const isRecordingSettingsOpen = useStore((s) => s.isRecordingSettingsOpen);
  const savedVariants = useStore((s) => s.savedVariants);
  const materials = useStore((s) => s.materials);

  const handleClear = () => {
    if (selectedPart) {
      resetPart(selectedPart);
    } else {
      selectPart(null);
    }
  };

  return (
    <div
      className={`w-full p-4 flex justify-center items-start relative z-40 pointer-events-none transition-opacity ${recordingStatus === "recording" ? "opacity-0" : "opacity-100"}`}
    >
      <div 
        id="tour-top-toolbar"
        className="pointer-events-auto bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-2 flex items-center shadow-2xl overflow-x-auto custom-scrollbar max-w-full"
      >
        <div className="flex items-center gap-3 px-3 border-r border-white/10 shrink-0">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider hidden xl:block">
            View
          </span>
          <div className="flex gap-2">
            <TopButton
              icon={<RotateCcw />}
              label="Default"
              onClick={() => setCameraView("default")}
            />
            <TopButton
              icon={<ArrowRightFromLine />}
              label="Left"
              onClick={() => setCameraView("left")}
            />
            <TopButton
              icon={<ArrowLeftFromLine />}
              label="Right"
              onClick={() => setCameraView("right")}
            />
            <TopButton
              icon={<Repeat />}
              label="Turntable"
              onClick={toggleTurntable}
              active={isTurntableActive}
              color="blue"
            />
            <TopButton
              icon={<Footprints />}
              label="Walk"
              onClick={onWalkClick}
              active={isWalking}
              color="blue"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 px-3 border-r border-white/10 shrink-0">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider hidden xl:block">
            Visibility
          </span>
          <div className="flex gap-2">
            {/* Mobile toggle for parts list */}
            <TopButton
              icon={showLeftPanel ? <PanelLeftClose /> : <PanelLeftOpen />}
              label="Layers"
              onClick={() => setShowLeftPanel(!showLeftPanel)}
              active={showLeftPanel}
            />

            <TopButton
              icon={isExploded ? <Minimize2 /> : <Maximize2 />}
              label="Explode"
              onClick={toggleExploded}
              active={isExploded}
              color="orange"
            />

            <TopButton
              icon={<Grid3X3 />}
              label="Floor"
              onClick={toggleFloor}
              active={showFloor}
              color="blue"
            />

            <TopButton
              icon={<LightbulbOff />}
              label="Hide"
              onClick={hidePart}
              disabled={!selectedPart}
            />
            <TopButton
              icon={<Lightbulb />}
              label="Single"
              onClick={singlePart}
              active={isSingleMode}
              color="orange"
              disabled={!selectedPart}
            />
            <TopButton
              icon={<Tag />}
              label="Info"
              onClick={toggleAnnotations}
              active={showAnnotations}
              color="blue"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 px-3 border-r border-white/10 shrink-0">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider hidden xl:block">
            Edit
          </span>
          <div className="flex gap-2">
            <TopButton icon={<Undo2 />} label="Undo" onClick={undo} />
            <TopButton icon={<Redo2 />} label="Redo" onClick={redo} />
            <TopButton icon={<Eraser />} label="Clear" onClick={handleClear} />
            <TopButton
              icon={<RefreshCw />}
              label="Reset"
              onClick={resetAllParts}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 px-3 border-r border-white/10 shrink-0">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider hidden xl:block">
            Capture
          </span>
          <div className="flex gap-2">
            <TopButton
              icon={<Camera />}
              label="Snap"
              onClick={() => triggerSnapshot("download")}
            />
            <TopButton
              icon={
                recordingStatus === "recording" ? (
                  <Loader2 className="animate-spin text-red-500" />
                ) : (
                  <Clapperboard />
                )
              }
              label={recordingStatus === "recording" ? "Rec..." : "MP4"}
              onClick={onRecordingClick}
              disabled={recordingStatus === "recording"}
              active={
                recordingStatus === "recording" || isRecordingSettingsOpen
              }
              color="red"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 px-3 shrink-0">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider hidden xl:block">
            Project
          </span>
          <div className="flex gap-2">
            <TopButton
              icon={<Save />}
              label="Save"
              onClick={() => triggerSnapshot("save")}
            />
            <TopButton
              icon={<FileText />}
              label="PDF"
              onClick={() => {
                if (savedVariants.length === 0) {
                  alert(
                    "Please save at least one variant to the dashboard first.",
                  );
                } else {
                  generatePDF(savedVariants, materials);
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Material Physical Properties
const MaterialTuning = () => {
  const { selectedPart, partConfigs, updatePartConfig } = useStore();

  const currentConfig = selectedPart
    ? partConfigs[selectedPart] || {
        scale: 2,
        normalScale: 1,
        roughness: 0.5,
        displacementScale: 0,
      }
    : null;

  if (!selectedPart || !currentConfig) return null;

  return (
    <div className="p-3 border border-white/10 rounded-lg flex flex-col gap-3 bg-white/5 animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2 mb-1 pb-2 border-b border-white/5">
        <Sliders size={14} className="text-zinc-400" />
        <span className="text-xs font-bold text-zinc-300">Material Tuning</span>
      </div>

      <SliderControl
        label="Texture Tiling (Scale)"
        value={currentConfig.scale}
        min="0.1"
        max="20"
        step="0.01"
        displayValue={`${currentConfig.scale.toFixed(2)}x`}
        onChange={(v: number) => updatePartConfig(selectedPart, { scale: v })}
      />

      <SliderControl
        label="Normal Strength (Bump)"
        value={currentConfig.normalScale}
        min="0"
        max="5"
        step="0.01"
        onChange={(v: number) =>
          updatePartConfig(selectedPart, { normalScale: v })
        }
      />

      <SliderControl
        label="Roughness"
        value={currentConfig.roughness}
        min="0"
        max="1"
        step="0.01"
        onChange={(v: number) =>
          updatePartConfig(selectedPart, { roughness: v })
        }
      />

      <SliderControl
        label="Displacement"
        value={currentConfig.displacementScale}
        min="0"
        max="1.0"
        step="0.01"
        onChange={(v: number) =>
          updatePartConfig(selectedPart, { displacementScale: v })
        }
      />
    </div>
  );
};

// Image Projection Tuning Component
const ImageProjectionTuning = () => {
  const { selectedPart, partConfigs, updatePartConfig } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const currentConfig = selectedPart
    ? partConfigs[selectedPart] || {
        scale: 2,
        normalScale: 1,
        roughness: 0.5,
        displacementScale: 0,
      }
    : null;

  if (!selectedPart || !currentConfig) return null;

  const hasProjectedImage = !!currentConfig.projectedImageUrl;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === "image/png" || file.type === "image/jpeg")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          updatePartConfig(selectedPart, {
            projectedImageUrl: event.target.result as string,
            projectionOffsetX: 0,
            projectionOffsetY: 0,
            projectionScaleX: 1,
            projectionScaleY: 1,
            projectionRotation: 0,
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === "image/png" || file.type === "image/jpeg")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          updatePartConfig(selectedPart, {
            projectedImageUrl: event.target.result as string,
            projectionOffsetX: 0,
            projectionOffsetY: 0,
            projectionScaleX: 1,
            projectionScaleY: 1,
            projectionRotation: 0,
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const clearProjectedImage = () => {
    updatePartConfig(selectedPart, {
      projectedImageUrl: undefined,
      projectionOffsetX: undefined,
      projectionOffsetY: undefined,
      projectionScaleX: undefined,
      projectionScaleY: undefined,
      projectionRotation: undefined,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const offsetX =
    currentConfig.projectionOffsetX !== undefined
      ? currentConfig.projectionOffsetX
      : 0;
  const offsetY =
    currentConfig.projectionOffsetY !== undefined
      ? currentConfig.projectionOffsetY
      : 0;
  const scaleX =
    currentConfig.projectionScaleX !== undefined
      ? currentConfig.projectionScaleX
      : 1;
  const scaleY =
    currentConfig.projectionScaleY !== undefined
      ? currentConfig.projectionScaleY
      : 1;
  const rotation =
    currentConfig.projectionRotation !== undefined
      ? currentConfig.projectionRotation
      : 0;
  const repeat = currentConfig.projectionRepeat !== false;

  return (
    <div className="p-3 border border-white/10 rounded-lg flex flex-col gap-3 bg-white/5 mt-3 animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between mb-1 pb-2 border-b border-white/5 border-dashed">
        <div className="flex items-center gap-2">
          <ImageIcon size={14} className="text-blue-400" />
          <span className="text-xs font-bold text-zinc-300">
            Project Image (Logo/Decal)
          </span>
        </div>
        {hasProjectedImage && (
          <button
            onClick={clearProjectedImage}
            className="text-[10px] bg-red-950/40 hover:bg-red-900/60 text-red-400 px-2 py-0.5 rounded border border-red-500/20 flex items-center gap-1 transition-colors"
          >
            <Trash2 size={10} />
            Clear
          </button>
        )}
      </div>

      {!hasProjectedImage ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer border border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-2 transition-all ${
            dragActive
              ? "border-blue-500 bg-blue-500/10"
              : "border-white/10 hover:border-white/20 hover:bg-white/5"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg"
            onChange={handleFileChange}
            className="hidden"
          />
          <Upload
            className="text-zinc-500 group-hover:text-zinc-300"
            size={18}
          />
          <div className="text-center">
            <p className="text-[10px] font-medium text-zinc-300">
              Drag & drop or Click to Upload
            </p>
            <p className="text-[9px] text-zinc-500 mt-0.5">
              Supports PNG & JPG files
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 bg-black/20 p-2 rounded border border-white/5">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={currentConfig.projectedImageUrl}
                alt="Projected preview"
                className="w-10 h-10 object-contain rounded bg-zinc-950 border border-white/10"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-blue-400 truncate animate-pulse">
                  Projected Image Active
                </p>
                <p className="text-[9px] text-zinc-400">
                  Position on selected part
                </p>
              </div>
            </div>

            {/* Elegant Toggle tile/repeat on/off */}
            <div className="flex items-center gap-2 border-l border-white/10 pl-3">
              <div className="text-right">
                <p className="text-[9px] font-bold text-zinc-300">Tiling</p>
                <p className="text-[8px] text-zinc-500">
                  {repeat ? "ON" : "OFF"}
                </p>
              </div>
              <button
                onClick={() =>
                  updatePartConfig(selectedPart, { projectionRepeat: !repeat })
                }
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${repeat ? "bg-blue-500" : "bg-zinc-700"}`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${repeat ? "translate-x-4" : "translate-x-0"}`}
                />
              </button>
            </div>
          </div>

          <SliderControl
            label="Horizontal Offset (X)"
            value={offsetX}
            min="-3"
            max="3"
            step="0.01"
            displayValue={offsetX.toFixed(2)}
            onChange={(v: number) =>
              updatePartConfig(selectedPart, { projectionOffsetX: v })
            }
          />

          <SliderControl
            label="Vertical Offset (Y)"
            value={offsetY}
            min="-3"
            max="3"
            step="0.01"
            displayValue={offsetY.toFixed(2)}
            onChange={(v: number) =>
              updatePartConfig(selectedPart, { projectionOffsetY: v })
            }
          />

          <SliderControl
            label="Scale X (Width)"
            value={scaleX}
            min="0.1"
            max="10"
            step="0.05"
            displayValue={`${scaleX.toFixed(2)}x`}
            onChange={(v: number) =>
              updatePartConfig(selectedPart, { projectionScaleX: v })
            }
          />

          <SliderControl
            label="Scale Y (Height)"
            value={scaleY}
            min="0.1"
            max="10"
            step="0.05"
            displayValue={`${scaleY.toFixed(2)}x`}
            onChange={(v: number) =>
              updatePartConfig(selectedPart, { projectionScaleY: v })
            }
          />

          <SliderControl
            label="Rotation Angle"
            value={rotation}
            min="-180"
            max="180"
            step="1"
            displayValue={`${rotation}°`}
            onChange={(v: number) =>
              updatePartConfig(selectedPart, { projectionRotation: v })
            }
          />
        </div>
      )}
    </div>
  );
};

// Part Annotation & Info Panel (Now in Left Panel Side)
const PartProperties = () => {
  const {
    selectedPart,
    partAnnotations,
    setAnnotation,
    partConfigs,
    updatePartConfig,
    isExploded,
    toggleExploded,
    resetAllExplode,
    showTransformGizmo,
    setShowTransformGizmo,
    transformGizmoSize,
    setTransformGizmoSize,
    transformMode,
    setTransformMode,
    showAnnotations,
    toggleAnnotations,
  } = useStore();

  // Logic to determine defaults if annotation doesn't exist yet
  const getDisplayName = (id: string) => {
    const preset = SHOE_PARTS.find((p) => p.id === id);
    if (preset) return preset.name;
    // Fallback: beautify ID
    return id
      .replace(/[_-]/g, " ")
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  const savedAnnotation = selectedPart ? partAnnotations[selectedPart] : null;
  const defaultTitle = selectedPart ? getDisplayName(selectedPart) : "";

  // Use saved title if exists, otherwise default. Use '' if user explicitly cleared it (saved but empty).
  const titleValue = savedAnnotation ? savedAnnotation.title : defaultTitle;
  const descValue = savedAnnotation ? savedAnnotation.description : "";
  const offsetValue = savedAnnotation?.offset || 60;

  const handleUpdate = (field: string, value: any) => {
    if (!selectedPart) return;
    setAnnotation(selectedPart, {
      title: titleValue,
      description: descValue,
      offset: offsetValue,
      [field]: value,
    });
  };

  const currentConfig = selectedPart
    ? partConfigs[selectedPart] || { explosionOffset: [0, 0, 0], meshScale: 1 }
    : null;
  const [ex, ey, ez] = currentConfig?.explosionOffset || [0, 0, 0];
  const meshScale =
    currentConfig?.meshScale !== undefined ? currentConfig.meshScale : 1;

  const updateExplosion = (index: number, val: number) => {
    if (!selectedPart) return;
    const newOffset = [...(currentConfig?.explosionOffset || [0, 0, 0])] as [
      number,
      number,
      number,
    ];
    newOffset[index] = val;
    updatePartConfig(selectedPart, { explosionOffset: newOffset });
  };

  const updateScale = (val: number) => {
    if (!selectedPart) return;
    updatePartConfig(selectedPart, { meshScale: val });
  };

  if (!selectedPart) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-white/5 bg-white/5 backdrop-blur-xl flex items-center gap-2 shrink-0">
        <TypeIcon size={14} className="text-blue-400" />
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Annotation & Transform
        </span>
      </div>
      <div className="p-3 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
        <div className="flex flex-col gap-3">
          <div>
            <span className="text-[10px] font-medium text-zinc-400 block mb-1">
              Title
            </span>
            <input
              type="text"
              value={titleValue}
              onChange={(e) => handleUpdate("title", e.target.value)}
              placeholder="Part Name"
              className="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div>
            <span className="text-[10px] font-medium text-zinc-400 block mb-1">
              Description
            </span>
            <textarea
              value={descValue}
              onChange={(e) => handleUpdate("description", e.target.value)}
              placeholder="Details..."
              rows={3}
              className="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50 resize-none"
            />
          </div>
          <SliderControl
            label="Label Distance"
            value={offsetValue}
            min="20"
            max="200"
            step="5"
            onChange={(v: number) => handleUpdate("offset", v)}
          />
          <button
            onClick={toggleAnnotations}
            className={`w-full py-1.5 mt-1 border rounded text-center transition-colors flex items-center justify-center gap-2 group ${
              showAnnotations 
                ? "bg-blue-500/20 border-blue-500/30 hover:bg-blue-500/30 text-blue-400" 
                : "bg-zinc-900/50 border-white/5 hover:bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            {showAnnotations ? <EyeOff size={12} /> : <Eye size={12} />}
            <span className="text-[10px]">
              {showAnnotations ? "Hide Global Annotations" : "Show Global Annotations"}
            </span>
          </button>
        </div>

        <div className="h-px bg-white/10 w-full" />

        {/* Transform Section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <Move size={12} className="text-orange-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Part Transform
            </span>
          </div>

          <div className="flex gap-1 mb-2">
            {(['translate', 'rotate', 'scale'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setTransformMode(mode)}
                className={`flex-1 py-1.5 rounded flex items-center justify-center transition-all ${
                  transformMode === mode 
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/20' 
                    : 'bg-zinc-900/50 text-zinc-500 hover:text-zinc-300 border border-white/5'
                }`}
                title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode`}
              >
                {mode === 'translate' && <Move size={12} />}
                {mode === 'rotate' && <RotateCw size={12} />}
                {mode === 'scale' && <Maximize2 size={12} />}
              </button>
            ))}
          </div>

          {/* Scale Control - Only visible when exploded */}
          {isExploded ? (
            <SliderControl
              label="Scale (Exploded)"
              value={meshScale}
              min="0.1"
              max="5.0"
              step="0.01"
              displayValue={`${meshScale.toFixed(2)}x`}
              onChange={updateScale}
            />
          ) : (
            <button
              onClick={toggleExploded}
              className="w-full py-2 px-3 bg-zinc-900/50 border border-white/5 rounded text-center hover:bg-white/5 transition-colors flex items-center justify-center gap-2 group mb-2"
            >
              <Maximize2
                size={12}
                className="text-orange-400 group-hover:scale-110 transition-transform"
              />
              <span className="text-[10px] text-zinc-400 group-hover:text-white">
                Enable{" "}
                <span className="text-orange-400 font-bold">Explode</span> to
                Scale
              </span>
            </button>
          )}



          {isExploded && (
            <>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-medium text-zinc-300">3D Viewport Gizmo</span>
                  <span className="text-[8px] text-zinc-500">Drag part directly in 3D scene</span>
                </div>
                <button
                  onClick={() => setShowTransformGizmo(!showTransformGizmo)}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors focus:outline-none ${
                    showTransformGizmo ? "bg-orange-500" : "bg-zinc-800"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      showTransformGizmo ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              {showTransformGizmo && (
                <div className="mt-2 pl-1 pr-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] text-zinc-500">Gizmo Size</span>
                    <span className="text-[9px] text-zinc-400 font-mono">{(transformGizmoSize * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.5"
                    step="0.05"
                    value={transformGizmoSize}
                    onChange={(e) => setTransformGizmoSize(parseFloat(e.target.value))}
                    className="w-full accent-orange-500"
                  />
                </div>
              )}
              <button
                onClick={resetAllExplode}
                className="w-full py-1.5 mt-2 bg-red-900/30 border border-red-500/20 rounded text-center hover:bg-red-900/50 transition-colors flex items-center justify-center gap-2 group"
              >
                <RotateCcw
                  size={12}
                  className="text-red-400 group-hover:-rotate-90 transition-transform"
                />
                <span className="text-[10px] text-red-400">
                  Reset All Transforms
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const Interface: React.FC = () => {
  const {
    recordingStatus,
    isRecordingSettingsOpen,
    openRecordingSettings,
    closeRecordingSettings,
    turntableSettings,
    setTurntableSettings,
    triggerRecording,
    cancelRecording,
    recordedUrl,
    discardRecording,
    isWalking,
    walkSpeed,
    setWalkSpeed,
    reverseWalk,
    toggleReverseWalk,
    setBaseShoeType,
    toggleWalking,
    isTurntableActive,
    setTurntableSpeed,
    turntableSpeed,
    toggleHelp,
    showHelp,
    isMobile,
    activeVideoStream,
    setVideoStream,
    addMaterial,
    setMaterial,
    selectedPart,
    partMaterials,
    materials,
  } = useStore();

  const [activeTab, setActiveTab] = useState<
    "dashboard" | "models" | "materials" | "colors" | "mix" | "light"
  >("dashboard");
  const [showWalkModal, setShowWalkModal] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(!isMobile);
  const [isCameraOverlayOpen, setIsCameraOverlayOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // --- Walk Modal Logic ---
  const handleWalkClick = () => {
    if (isWalking) {
      toggleWalking();
    } else {
      setShowWalkModal(true);
    }
  };

  const startWalking = (type: "left" | "right") => {
    setBaseShoeType(type);
    toggleWalking();
    setShowWalkModal(false);
  };

  // --- Camera Logic ---
  useEffect(() => {
    if (isCameraOverlayOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current
        .play()
        .catch((e) => console.error("Error playing video preview:", e));
    }
  }, [isCameraOverlayOpen]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1080 },
          aspectRatio: { ideal: 1 },
        },
      });
      streamRef.current = stream;
      setIsCameraOverlayOpen(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please allow permissions.");
      setIsCameraOverlayOpen(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setVideoStream(null);
    setIsCameraOverlayOpen(false);
  };

  const captureSnapshot = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      const vw = videoRef.current.videoWidth || 512;
      const vh = videoRef.current.videoHeight || 512;
      const size = Math.min(vw, vh);
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const startX = (vw - size) / 2;
        const startY = (vh - size) / 2;
        ctx.drawImage(
          videoRef.current,
          startX,
          startY,
          size,
          size,
          0,
          0,
          512,
          512,
        );

        const dataUrl = canvas.toDataURL("image/jpeg");
        const newMat = {
          id: `cam-${Date.now()}`,
          name: `Snapshot ${new Date().toLocaleTimeString()}`,
          color: "#ffffff",
          roughness: 0.6,
          metalness: 0.0,
          type: "fabric" as const,
          textureUrl: dataUrl,
        };
        addMaterial(newMat);
        if (selectedPart) {
          setMaterial(selectedPart, newMat.id);
        }
      }
    }
    stopCamera();
  };

  const applyLiveTexture = () => {
    if (!streamRef.current || !selectedPart) return;
    setVideoStream(streamRef.current);
    const liveMatId = "mat-live-video";
    const existing = materials.find((m) => m.id === liveMatId);
    if (!existing) {
      const liveMat = {
        id: liveMatId,
        name: "Live Camera Feed",
        color: "#ffffff",
        roughness: 0.5,
        metalness: 0.0,
        type: "video" as const,
      };
      addMaterial(liveMat);
    }
    setMaterial(selectedPart, liveMatId);
    setIsCameraOverlayOpen(false);
  };

  const handleSaveRecording = () => {
    if (recordedUrl) {
      const a = document.createElement("a");
      a.href = recordedUrl;
      a.download = `nk-3d-turntable.webm`;
      a.click();
      discardRecording();
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
      {showWalkModal && (
        <div className="absolute inset-0 bg-black/60 z-[100] pointer-events-auto flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Footprints size={18} className="text-blue-500" />
                Walk Configuration
              </h3>
              <button
                onClick={() => setShowWalkModal(false)}
                className="text-white/50 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4 text-center">
              <p className="text-sm text-zinc-400">
                To animate correctly, please specify which shoe the uploaded 3D
                model represents.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => startWalking("left")}
                  className="p-4 rounded-lg border border-white/10 hover:bg-white/5 hover:border-blue-500/50 transition-all flex flex-col items-center gap-2 group"
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white font-bold text-lg">
                    L
                  </div>
                  <span className="text-sm font-medium text-zinc-300 group-hover:text-white">
                    Left Shoe
                  </span>
                </button>

                <button
                  onClick={() => startWalking("right")}
                  className="p-4 rounded-lg border border-white/10 hover:bg-white/5 hover:border-blue-500/50 transition-all flex flex-col items-center gap-2 group"
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white font-bold text-lg">
                    R
                  </div>
                  <span className="text-sm font-medium text-zinc-300 group-hover:text-white">
                    Right Shoe
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WALK SPEED CONTROL */}
      {isWalking && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-[80] bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-xl flex flex-col gap-2 w-64 animate-in slide-in-from-bottom-4 fade-in duration-300 pointer-events-auto">
          <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-1">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <Footprints size={14} className="text-blue-500" />
              Walk Speed
            </span>
            <span className="text-[10px] font-mono text-blue-300">
              {walkSpeed.toFixed(1)}
            </span>
          </div>
          <SliderControl
            label="Speed"
            value={walkSpeed}
            min="0.5"
            max="10.0"
            step="0.1"
            onChange={setWalkSpeed}
          />
          <div className="flex justify-between text-[9px] text-zinc-500 font-mono">
            <span>Slow</span>
            <span>Fast</span>
          </div>
          
          <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-1">
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-medium text-white">Reverse Orientation</span>
              <span className="text-[9px] text-zinc-400">Rotates shoe 180° for custom axes</span>
            </div>
            <button
              onClick={toggleReverseWalk}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${reverseWalk ? "bg-blue-500" : "bg-zinc-700"}`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${reverseWalk ? "translate-x-4" : "translate-x-0"}`}
              />
            </button>
          </div>
        </div>
      )}

      {/* TURNTABLE SPEED CONTROL */}
      {isTurntableActive && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-[80] bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-xl flex flex-col gap-2 w-64 animate-in slide-in-from-bottom-4 fade-in duration-300 pointer-events-auto">
          <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-1">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <RotateCw size={14} className="text-blue-500" />
              Rotation Speed
            </span>
            <span className="text-[10px] font-mono text-blue-300">
              {turntableSpeed.toFixed(1)}
            </span>
          </div>
          <SliderControl
            label="Speed"
            value={turntableSpeed}
            min="0.1"
            max="10.0"
            step="0.1"
            onChange={setTurntableSpeed}
          />
          <div className="flex justify-between text-[9px] text-zinc-500 font-mono">
            <span>Slow</span>
            <span>Fast</span>
          </div>
        </div>
      )}

      {isRecordingSettingsOpen && (
        <div className="absolute inset-0 bg-black/60 z-[100] pointer-events-auto flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Settings2 size={18} className="text-blue-500" />
                Turntable Settings
              </h3>
              <button
                onClick={closeRecordingSettings}
                className="text-white/50 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <Clock size={12} className="text-zinc-500" />
                    Duration (Seconds)
                  </span>
                  <span className="text-xs font-mono text-blue-400">
                    {turntableSettings.duration}s
                  </span>
                </div>
                <SliderControl
                  label="Duration"
                  min="1"
                  max="10"
                  step="1"
                  value={turntableSettings.duration}
                  onChange={(v: number) =>
                    setTurntableSettings({ duration: v })
                  }
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <Clapperboard size={12} className="text-zinc-500" />
                    Framerate (FPS)
                  </span>
                </div>
                <div className="flex bg-zinc-800 rounded-lg p-1 border border-white/5">
                  {[30, 60].map((fps) => (
                    <button
                      key={fps}
                      onClick={() => setTurntableSettings({ fps })}
                      className={`flex-1 text-xs py-1.5 rounded-md transition-all ${turntableSettings.fps === fps ? "bg-zinc-600 text-white font-bold shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
                    >
                      {fps} FPS
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <RotateCw size={12} className="text-zinc-500" />
                    Rotation Direction
                  </span>
                </div>
                <div className="flex bg-zinc-800 rounded-lg p-1 border border-white/5">
                  {["clockwise", "counter-clockwise"].map((dir) => (
                    <button
                      key={dir}
                      onClick={() =>
                        setTurntableSettings({ direction: dir as any })
                      }
                      className={`flex-1 text-xs py-1.5 rounded-md transition-all capitalize ${turntableSettings.direction === dir ? "bg-zinc-600 text-white font-bold shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
                    >
                      {dir.replace("-", " ")}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-zinc-800/50 p-2 rounded-lg border border-white/5">
                  <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <Eye size={12} className="text-zinc-500" />
                    Record Current View
                  </span>
                  <button
                    onClick={() =>
                      setTurntableSettings({
                        useCurrentView: !turntableSettings.useCurrentView,
                      })
                    }
                    className={`w-10 h-5 rounded-full relative transition-colors ${turntableSettings.useCurrentView ? "bg-blue-600" : "bg-zinc-700"}`}
                  >
                    <div
                      className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${turntableSettings.useCurrentView ? "left-6" : "left-1"}`}
                    />
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4 bg-zinc-950/50 border-t border-white/10 flex gap-3">
              <button
                onClick={closeRecordingSettings}
                className="flex-1 py-2 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={triggerRecording}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20 transition-colors text-xs font-bold flex items-center justify-center gap-2"
              >
                Start Recording
              </button>
            </div>
          </div>
        </div>
      )}

      {recordingStatus === "recording" && (
        <div className="absolute inset-0 bg-black/40 z-[100] pointer-events-auto flex flex-col items-center justify-center backdrop-blur-sm">
          <div className="bg-zinc-900 border border-red-500/50 rounded-2xl p-6 flex flex-col items-center gap-4 shadow-2xl">
            <Loader2 size={48} className="text-red-500 animate-spin" />
            <div className="text-center">
              <h3 className="text-white font-bold text-lg">
                Recording Turntable...
              </h3>
              <p className="text-zinc-400 text-sm mt-1">
                Rendering {turntableSettings.duration}s video at{" "}
                {turntableSettings.fps} FPS
              </p>
            </div>
            <button
              onClick={cancelRecording}
              className="mt-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full text-xs border border-white/10"
            >
              Press ESC to Cancel
            </button>
          </div>
        </div>
      )}

      {recordingStatus === "review" && (
        <div className="absolute inset-0 bg-black/60 z-[100] pointer-events-auto flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Clapperboard size={18} className="text-blue-500" />
                Recording Finished
              </h3>
            </div>
            <div className="p-6 text-center">
              {recordedUrl && (
                <video
                  src={recordedUrl}
                  autoPlay
                  loop
                  muted
                  className="w-full rounded-lg border border-white/10 mb-4 bg-black/50"
                />
              )}
              <p className="text-zinc-300 text-sm mb-6">
                Your 360° turntable video is ready. Would you like to save it to
                your device?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={discardRecording}
                  className="flex-1 py-2.5 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRecording}
                  className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Download size={16} /> Save MP4
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCameraOverlayOpen && (
        <div className="absolute inset-0 bg-black z-[90] pointer-events-auto flex flex-col items-center justify-center">
          <div className="flex justify-between items-center p-4 bg-black/50 absolute top-0 w-full z-10">
            <span className="text-white font-medium">
              Capture Texture (1:1)
            </span>
            <button onClick={stopCamera} className="text-white p-2">
              <X size={24} />
            </button>
          </div>

          {/* Square Viewport */}
          <div className="relative w-full max-md aspect-square bg-black overflow-hidden border-2 border-white/20 rounded-lg shadow-2xl mx-4">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Grid Guide */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-30">
              <div className="border border-white/30"></div>
              <div className="border border-white/30"></div>
              <div className="border border-white/30"></div>
              <div className="border border-white/30"></div>
              <div className="border border-white/30"></div>
              <div className="border border-white/30"></div>
              <div className="border border-white/30"></div>
              <div className="border border-white/30"></div>
              <div className="border border-white/30"></div>
            </div>
          </div>

          <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-8 pb-8">
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={captureSnapshot}
                className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center bg-white/20 active:bg-white/50 transition-colors"
              >
                <div className="w-12 h-12 bg-white rounded-full" />
              </button>
              <span className="text-xs text-white font-medium shadow-black drop-shadow-md">
                Snapshot
              </span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={applyLiveTexture}
                disabled={!selectedPart}
                className={`w-16 h-16 rounded-full border-4 border-blue-500 flex items-center justify-center bg-blue-500/20 active:bg-blue-500/50 transition-colors ${!selectedPart ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Video size={32} className="text-white" />
              </button>
              <span className="text-xs text-white font-medium shadow-black drop-shadow-md">
                Live Mode
              </span>
            </div>
          </div>
        </div>
      )}

      {showHelp && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-auto p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl max-w-lg w-full shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <HelpCircle size={20} className="text-blue-500" />
                Asset Specifications
              </h3>
              <button
                onClick={toggleHelp}
                className="text-white/50 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
              <div>
                <h4 className="text-sm font-bold text-white mb-2">
                  Supported File Formats
                </h4>
                <div className="flex gap-2 mb-2">
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded border border-blue-500/30 font-mono">
                    .GLB
                  </span>
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded border border-blue-500/30 font-mono">
                    .GLTF
                  </span>
                  <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded border-orange-500/30 font-mono">
                    .OBJ
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  We recommend <strong>.GLB</strong> for best performance.{" "}
                  <br />
                  <br />
                  If using <strong>.GLTF</strong> or <strong>.OBJ</strong>,
                  please select <strong>ALL</strong> files (including .bin and
                  textures) at once when uploading.
                </p>
              </div>
            </div>
            <div className="p-4 bg-zinc-950 border-t border-white/10 text-center">
              <button
                onClick={toggleHelp}
                className="bg-white text-black px-6 py-2 rounded-full text-sm font-medium hover:bg-zinc-200 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP TOOLBAR */}
      <TopToolbar
        onWalkClick={handleWalkClick}
        onRecordingClick={openRecordingSettings}
        setShowLeftPanel={setShowLeftPanel}
        showLeftPanel={showLeftPanel}
      />

      <div className="flex-1 flex relative overflow-hidden pointer-events-none">
        {/* Attribution centered perfectly below the account widget */}
        <span className="fixed bottom-4 left-4 z-[95] font-mono text-zinc-500 font-semibold tracking-widest text-[9px] uppercase opacity-70 pointer-events-none select-none">
          by nkh
        </span>

        {/* LEFT PANEL */}
        <LeftPanel showLeftPanel={showLeftPanel} />

        <div className="flex-1" />

        {/* RIGHT PANEL */}
        <RightPanel
          activeTab={activeTab}
          showLeftPanel={showLeftPanel}
          onStartCamera={startCamera}
          onStopCamera={stopCamera}
        />
      </div>

      <div
        className={`fixed bottom-6 left-0 right-0 flex justify-center z-[90] pointer-events-none transition-opacity ${recordingStatus === "recording" ? "opacity-0" : "opacity-100"} ${isMobile ? "bottom-0 bg-zinc-950/90 border-t border-white/5 py-3" : ""}`}
      >
        <div
          className={`${isMobile ? "w-full flex justify-around pointer-events-auto" : "bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-full p-2 flex gap-1 shadow-2xl pointer-events-auto"}`}
        >
          {(() => {
            const items = [
              { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
              { id: "models", icon: Box, label: "Models" },
              { id: "materials", icon: Layers, label: "Materials" },
              { id: "colors", icon: Palette, label: "Colors" },
              { id: "mix", icon: Bot, label: "AI" },
              { id: "light", icon: Sun, label: "Light" },
            ];
            return items;
          })().map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                 relative rounded-full flex flex-col items-center justify-center gap-0.5 transition-all
                 ${isMobile ? "w-auto h-auto p-2" : "w-12 h-12"}
                 ${activeTab === tab.id ? (isMobile ? "text-blue-500" : "bg-blue-600 text-white shadow-lg shadow-blue-900/20 scale-110") : "text-zinc-400 hover:text-white hover:bg-white/10"}
               `}
            >
              <tab.icon
                size={isMobile ? 24 : 20}
                strokeWidth={activeTab === tab.id ? 2.5 : 2}
              />
              {isMobile && (
                <span className="text-[9px] font-medium">{tab.label}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <GuidedTour 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        showLeftPanel={showLeftPanel}
        setShowLeftPanel={setShowLeftPanel}
      />
    </div>
  );
};

// Sub-components
const LeftPanel = ({ showLeftPanel }: any) => {
  const isMobile = useStore((s) => s.isMobile);
  const recordingStatus = useStore((s) => s.recordingStatus);
  const customParts = useStore((s) => s.customParts);
  const currentModel = useStore((s) => s.currentModel);
  const displayParts = React.useMemo(() => {
    if (!currentModel) return [];
    if (currentModel.id === "demo-shoe") return SHOE_PARTS;
    return customParts.map((id) => ({ id, name: id }));
  }, [currentModel, customParts]);
  const selectedPart = useStore((s) => s.selectedPart);
  const selectPart = useStore((s) => s.selectPart);
  const showAnnotations = useStore((s) => s.showAnnotations);

  if (!showLeftPanel || displayParts.length === 0) return null;

  return (
    <div
      id="tour-left-panel"
      className={`ml-6 md:ml-6 flex flex-row items-start gap-2 animate-in slide-in-from-left duration-500 absolute left-0 top-2 bottom-auto max-h-[calc(100%-1rem)] pointer-events-none z-20 transition-opacity ${recordingStatus === "recording" ? "opacity-0" : "opacity-100"} ${isMobile ? "top-[70px] ml-4 flex-col" : ""}`}
    >
      <div
        className={`w-48 bg-zinc-900/90 backdrop-blur-md rounded-xl border border-white/10 flex flex-col shadow-2xl overflow-hidden pointer-events-auto max-h-full shrink-0 ${isMobile ? "bg-zinc-900/95 h-[30vh] w-64" : ""}`}
      >
        <div className="p-3 border-b border-white/5 bg-white/5 backdrop-blur-xl flex justify-between items-center shrink-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <List size={14} /> Parts Layer
          </h3>
        </div>
        <div className="overflow-y-auto custom-scrollbar p-2 space-y-1 max-h-[400px] flex-1">
          {displayParts.map((part) => (
            <button
              key={part.id}
              onClick={() =>
                selectPart(selectedPart === part.id ? null : part.id)
              }
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between group ${selectedPart === part.id ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-zinc-400 hover:text-white hover:bg-white/10"}`}
            >
              <span className="truncate">{part.name}</span>
              {selectedPart === part.id && (
                <CheckCircle size={12} className="text-white/80" />
              )}
            </button>
          ))}
        </div>
      </div>

      {selectedPart && (
        <div
          className={`w-56 bg-zinc-900/90 backdrop-blur-md rounded-xl border border-white/10 flex flex-col shadow-2xl overflow-hidden pointer-events-auto shrink-0 animate-in slide-in-from-left-2 duration-300 ${isMobile ? "w-64 bg-zinc-900/95" : ""}`}
        >
          <PartProperties />
        </div>
      )}
    </div>
  );
};

const RightPanel = ({ activeTab, onStartCamera, onStopCamera }: any) => {
  const {
    isMobile,
    recordingStatus,
    selectedPart,
    activeVideoStream,
    materials,
    partMaterials,
    uploadedAssets,
    currentModel,
    savedVariants,
    selectedVariantIds,
    isSelectionMode,
    isGenerating,
    environmentSettings,
    effectsSettings,
    customEnvironment,
    currentLighting,
    showFloor,
    lightingEnabled,
    wireframeEnabled,
    showEnvironmentBackground,
    setMaterial,
    removeMaterial,
    addMaterial,
    removeAsset,
    setCurrentModel,
    clearScene,
    loadVariant,
    deleteVariant,
    toggleVariantSelection,
    selectAllVariants,
    setSelectionMode,
    uploadAsset,
    uploadMaterial,
    uploadEnvironment,
    createPBRMaterial,
    generateFullDesign,
    setLighting,
    setLightingEnabled,
    setWireframeEnabled,
    setShowEnvironmentBackground,
    updateEnvironmentSettings,
    updateEffectsSettings,
    removeMaterialGroup,
  } = useStore();

  const [showLibrary, setShowLibrary] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [customHex, setCustomHex] = useState("#ffffff");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );

  const assetInputRef = useRef<HTMLInputElement>(null);
  const materialInputRef = useRef<HTMLInputElement>(null);
  const pbrInputRef = useRef<HTMLInputElement>(null);
  const environmentInputRef = useRef<HTMLInputElement>(null);

  const displayParts = React.useMemo(() => {
    if (!currentModel) return [];
    if (currentModel.id === "demo-shoe") return SHOE_PARTS;
    return useStore.getState().customParts.map((id) => ({ id, name: id }));
  }, [currentModel]);

  const handleAssetUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let mainFile: File | null = null;
    const resourceMap: Record<string, string> = {};

    Array.from(files).forEach((val) => {
      const file = val as File;
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext === "gltf" || ext === "glb" || ext === "obj" || ext === "usdz") {
        mainFile = file;
      } else {
        resourceMap[file.name] = URL.createObjectURL(file);
      }
    });

    if (mainFile) {
      const url = URL.createObjectURL(mainFile);
      const extension =
        (mainFile as File).name.split(".").pop()?.toLowerCase() || "glb";

      uploadAsset({
        id: `asset-${Date.now()}`,
        url,
        name: (mainFile as File).name,
        extension,
        resources: resourceMap,
      });
    } else if (Object.keys(resourceMap).length > 0) {
      alert(
        "Please include the main 3D model file (.gltf, .glb, .obj, or .usdz) in your selection.",
      );
    }
  };

  const handleMaterialUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMaterial(file);
  };

  const handleEnvironmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadEnvironment(file);
  };

  const handlePBRUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) createPBRMaterial(file);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    await generateFullDesign(prompt);
    setExpandedGroups((prev) => ({ ...prev, [prompt]: true }));
    setPrompt("");
  };

  const handleColorClick = (colorHex: string) => {
    if (!selectedPart) return;
    const currentMatId = partMaterials[selectedPart];
    const currentMat = materials.find((m) => m.id === currentMatId);

    if (currentMat) {
      const newMat = {
        ...currentMat,
        id: `${currentMat.id}-tint-${colorHex.replace("#", "")}-${Date.now()}`,
        name: `${currentMat.name} (${colorHex})`,
        color: colorHex,
      };
      addMaterial(newMat);
      setMaterial(selectedPart, newMat.id);
    } else {
      const newColorMat = {
        id: `color-${colorHex}-${Date.now()}`,
        name: `Color ${colorHex}`,
        color: colorHex,
        roughness: 0.5,
        metalness: 0.1,
        type: "fabric" as const,
      };
      addMaterial(newColorMat);
      setMaterial(selectedPart, newColorMat.id);
    }
  };

  const handlePresetClick = (preset: (typeof MATERIAL_PRESETS)[0]) => {
    const newMat: Material = {
      ...preset,
      id: `custom-${preset.id}-${Date.now()}`,
      name: `${preset.name} (Custom)`,
    };
    addMaterial(newMat);
    if (selectedPart) setMaterial(selectedPart, newMat.id);
  };

  const handleMaterialClick = (matId: string) => {
    if (selectedPart) setMaterial(selectedPart, matId);
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const handleDeleteGroup = (e: React.MouseEvent, groupName: string) => {
    e.stopPropagation();
    removeMaterialGroup(groupName);
  };

  const aiMaterials = materials.filter((m) => m.type === "ai-generated");
  const aiGroups: Record<string, typeof aiMaterials> = {};
  aiMaterials.forEach((m) => {
    const groupName = m.group || "Older Generations";
    if (!aiGroups[groupName]) aiGroups[groupName] = [];
    aiGroups[groupName].push(m);
  });

  return (
    <div
      id="tour-right-panel"
      className={`
        flex flex-col gap-3 animate-in slide-in-from-right duration-500 absolute pointer-events-none z-20 transition-all
        ${recordingStatus === "recording" ? "opacity-0" : "opacity-100"}
        ${
          isMobile
            ? "w-full bottom-[80px] left-0 right-0 px-2 slide-in-from-bottom-10"
            : "w-80 mr-6 right-0 top-2 bottom-auto max-h-[calc(100%-1rem)]"
        }
    `}
    >
      {/* Hidden Inputs */}
      <input
        type="file"
        multiple
        ref={assetInputRef}
        onChange={handleAssetUpload}
        accept=".glb,.gltf,.obj,.usdz,.bin,.png,.jpg,.jpeg"
        className="hidden"
      />
      <input
        type="file"
        ref={materialInputRef}
        onChange={handleMaterialUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={pbrInputRef}
        onChange={handlePBRUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={environmentInputRef}
        onChange={handleEnvironmentUpload}
        accept=".hdr,.exr,.jpg,.jpeg,.png"
        className="hidden"
      />

      <div
        className={`bg-zinc-900/90 backdrop-blur-md border border-white/10 flex flex-col shadow-2xl overflow-hidden pointer-events-auto max-h-full shrink-0 transition-all duration-300 ${isMobile ? "rounded-t-2xl border-b-0" : "rounded-xl"}`}
      >
        <div className="p-3 border-b border-white/5 bg-white/5 backdrop-blur-xl flex justify-between items-center shrink-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            {activeTab === "dashboard"
              ? "My Design Variants"
              : activeTab === "models"
                ? "3D Library"
                : activeTab === "colors"
                  ? "Color Palette"
                  : activeTab === "light"
                    ? "Environment"
                    : activeTab === "mix"
                      ? "AI Texture Generator"
                      : selectedPart
                        ? `Editing: ${displayParts.find((p) => p.id === selectedPart)?.name || selectedPart}`
                        : "Select a part"}
          </h3>
          <div className="flex gap-2 items-center">
            {activeTab === "dashboard" && savedVariants.length > 0 && (
              <div className="flex items-center gap-2">
                {isSelectionMode && (
                  <button
                    onClick={selectAllVariants}
                    className="text-[10px] text-blue-400 font-medium hover:text-blue-300"
                  >
                    All
                  </button>
                )}
                <button
                  onClick={() => setSelectionMode(!isSelectionMode)}
                  className={`text-white/50 hover:text-white transition-colors ${isSelectionMode ? "text-blue-500 hover:text-blue-400" : ""}`}
                  title="Toggle Selection Mode"
                >
                  <CheckSquare size={16} />
                </button>
              </div>
            )}
            {activeTab === "materials" && !showLibrary && (
              <>
                {activeVideoStream ? (
                  <button
                    onClick={onStopCamera}
                    className="text-red-500 hover:text-red-400 transition-colors animate-pulse"
                    title="Stop Live Camera"
                  >
                    <StopCircle size={16} />
                  </button>
                ) : (
                  <button
                    onClick={onStartCamera}
                    className="text-white/50 hover:text-white transition-colors"
                    title="Capture/Live Texture"
                  >
                    <Aperture size={16} />
                  </button>
                )}
                <button
                  onClick={() => materialInputRef.current?.click()}
                  className="text-white/50 hover:text-white transition-colors"
                  title="Quick Upload (Basic)"
                >
                  <Plus size={16} />
                </button>
              </>
            )}
          </div>
        </div>

        <div
          className={`p-2 ${isMobile ? "max-h-[40vh] overflow-y-auto" : ""}`}
        >
          {activeTab === "dashboard" && (
            <div>
              {savedVariants.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center opacity-50">
                  <LayoutDashboard size={32} className="mb-2 text-zinc-400" />
                  <p className="text-xs text-zinc-300">
                    No saved variants yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                  {savedVariants.map((variant) => {
                    const isSelected = selectedVariantIds.includes(variant.id);
                    return (
                      <div
                        key={variant.id}
                        onClick={() => {
                          if (isSelectionMode)
                            toggleVariantSelection(variant.id);
                          else loadVariant(variant.id);
                        }}
                        className={`group relative rounded-lg border overflow-hidden bg-zinc-900/50 transition-all cursor-pointer h-fit ${isSelectionMode && isSelected ? "border-blue-500 ring-1 ring-blue-500" : "border-white/10 hover:border-blue-500/50"}`}
                      >
                        <div
                          className="aspect-square bg-cover bg-center transition-opacity"
                          style={{
                            backgroundImage: `url(${variant.thumbnail})`,
                            opacity: isSelectionMode && !isSelected ? 0.6 : 1,
                          }}
                        />
                        <div className="p-2">
                          <p className="text-[10px] font-medium text-white truncate">
                            {variant.name}
                          </p>
                          <p className="text-[9px] text-zinc-500">
                            {new Date(variant.timestamp).toLocaleTimeString(
                              [],
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </p>
                        </div>
                        {isSelectionMode && (
                          <div className="absolute top-2 right-2 z-10">
                            {isSelected ? (
                              <div className="bg-blue-600 rounded text-white p-0.5">
                                <CheckSquare size={14} />
                              </div>
                            ) : (
                              <div className="bg-black/50 rounded text-zinc-400 p-0.5 border border-white/20">
                                <Square size={14} />
                              </div>
                            )}
                          </div>
                        )}
                        {!isSelectionMode && (
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                loadVariant(variant.id);
                              }}
                              className="p-1.5 bg-blue-600 rounded-full text-white hover:bg-blue-500"
                            >
                              <CheckCircle size={14} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteVariant(variant.id);
                              }}
                              className="p-1.5 bg-red-600 rounded-full text-white hover:bg-red-500"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "models" && (
            <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
              <div className="flex flex-col gap-1.5 border border-white/5 bg-black/20 rounded-lg p-2">
                {/* Permanent Demo Shoe Asset */}
                <div
                  className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-md border cursor-pointer transition-all hover:bg-white/5 ${(!currentModel || currentModel.id === DEMO_ASSET.id) ? "border-blue-500 bg-blue-500/10 text-white" : "border-white/5 bg-zinc-900/40 text-zinc-300"}`}
                  onClick={() => setCurrentModel(DEMO_ASSET)}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Box size={14} className={(!currentModel || currentModel.id === DEMO_ASSET.id) ? "text-blue-400" : "text-zinc-500"} />
                    <div className="flex flex-col text-left min-w-0">
                      <span className="text-[11px] font-medium truncate">
                        {DEMO_ASSET.name}
                      </span>
                      <span className="text-[9px] text-zinc-500 uppercase">
                        {DEMO_ASSET.extension}
                      </span>
                    </div>
                  </div>
                </div>

                {uploadedAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-md border cursor-pointer transition-all hover:bg-white/5 ${currentModel?.id === asset.id ? "border-blue-500 bg-blue-500/10 text-white" : "border-white/5 bg-zinc-900/40 text-zinc-300"}`}
                    onClick={() => setCurrentModel(asset)}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Box size={14} className={currentModel?.id === asset.id ? "text-blue-400" : "text-zinc-500"} />
                      <div className="flex flex-col text-left min-w-0">
                        <span className="text-[11px] font-medium truncate">
                          {asset.name}
                        </span>
                        <span className="text-[9px] text-zinc-500 uppercase">
                          {asset.extension}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm("Remove?")) removeAsset(asset.id);
                      }}
                      className="p-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded transition-all flex items-center justify-center shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                {uploadedAssets.length === 0 && (
                  <div className="text-zinc-500 text-[10px] py-4 text-center">
                    No custom 3D models imported yet.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  onClick={() => assetInputRef.current?.click()}
                  className="py-2 rounded-lg border border-dashed border-white/20 hover:border-white/50 hover:bg-white/5 flex items-center justify-center gap-2 text-[11px] font-medium text-zinc-300 transition-all cursor-pointer"
                >
                  <Plus size={14} className="text-zinc-400" />
                  <span>Import Model</span>
                </button>

                <button
                  onClick={() => clearScene()}
                  className="py-2 rounded-lg border border-dashed border-red-500/20 hover:border-red-500/50 hover:bg-red-500/5 flex items-center justify-center gap-2 text-[11px] font-medium text-red-400/80 transition-all cursor-pointer"
                >
                  <Trash2 size={14} className="text-red-500/50" />
                  <span>Clear Scene</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === "materials" && (
            <div className="flex flex-col">
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setShowLibrary(!showLibrary)}
                  className={`flex-1 py-2 rounded-lg border flex items-center justify-center gap-2 text-xs font-bold transition-all ${showLibrary ? "bg-blue-600 text-white border-blue-500" : "bg-zinc-800 text-zinc-300 border-white/10 hover:bg-zinc-700"}`}
                >
                  <Library size={14} /> Material Library
                </button>
                <button
                  onClick={() => pbrInputRef.current?.click()}
                  className="flex-1 py-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:text-indigo-200 flex items-center justify-center gap-2 text-xs font-bold transition-all"
                >
                  <Wand2 size={14} /> Smart PBR
                </button>
              </div>

              {showLibrary ? (
                <div className="grid grid-cols-2 gap-2 mb-3 max-h-[320px] overflow-y-auto custom-scrollbar pr-1 animate-in slide-in-from-left duration-300">
                  {MATERIAL_PRESETS.map((preset) => (
                    <div
                      key={preset.id}
                      onClick={() => handlePresetClick(preset)}
                      className="group p-2 rounded-lg bg-zinc-800 border border-white/5 hover:border-blue-500/50 hover:bg-zinc-700 cursor-pointer transition-all"
                    >
                      <div className="aspect-video rounded mb-2 overflow-hidden relative">
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundColor: preset.color,
                            backgroundImage: preset.textureUrl
                              ? `url(${preset.textureUrl})`
                              : "none",
                            backgroundSize: "cover",
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-medium text-zinc-300 group-hover:text-white truncate">
                          {preset.name}
                        </span>
                        <Plus
                          size={12}
                          className="text-zinc-500 group-hover:text-blue-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 mb-3 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
                  {materials
                    .filter(
                      (m) =>
                        !m.id.includes("-tint-") &&
                        m.type !== "video" &&
                        m.type !== "ai-generated",
                    )
                    .map((mat) => (
                      <div
                        key={mat.id}
                        onClick={() => handleMaterialClick(mat.id)}
                        className={`group relative h-16 rounded-lg overflow-hidden cursor-pointer transition-all border shrink-0 ${partMaterials[selectedPart || ""] === mat.id ? "border-blue-500 ring-1 ring-blue-500" : "border-transparent hover:border-white/30"}`}
                      >
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundColor: mat.color,
                            backgroundImage: mat.textureUrl
                              ? `url(${mat.textureUrl})`
                              : "none",
                            backgroundSize: "cover",
                          }}
                        ></div>
                        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                          <p className="text-sm font-medium text-white shadow-sm">
                            {mat.name}
                          </p>
                        </div>
                        {!INITIAL_MATERIALS.some(
                          (init) => init.id === mat.id,
                        ) && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              removeMaterial(mat.id);
                            }}
                            className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-500 rounded-full text-white transition-all z-20 shadow-md backdrop-blur-sm opacity-80 hover:opacity-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        {mat.normalMapUrl && (
                          <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm rounded-full p-1 border border-white/20">
                            <Wand2 size={10} className="text-purple-400" />
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}

              <MaterialTuning />
              <ImageProjectionTuning />
            </div>
          )}

          {activeTab === "colors" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 p-2 bg-zinc-800/90 rounded-lg border border-white/10 sticky top-0 z-10 backdrop-blur-md shadow-lg">
                <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/20 shrink-0">
                  <input
                    type="color"
                    value={customHex}
                    onChange={(e) => setCustomHex(e.target.value)}
                    className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] cursor-pointer p-0 border-0"
                  />
                </div>
                <div className="flex-1 relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-mono">
                    #
                  </span>
                  <input
                    type="text"
                    value={customHex.replace("#", "")}
                    onChange={(e) =>
                      setCustomHex("#" + e.target.value.replace("#", ""))
                    }
                    className="w-full bg-black/20 border border-white/10 rounded px-2 pl-5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500 uppercase"
                    maxLength={6}
                    placeholder="HEX"
                  />
                </div>
                <button
                  onClick={() => handleColorClick(customHex)}
                  disabled={!/^#([0-9A-F]{3}){1,2}$/i.test(customHex)}
                  className="bg-white/10 hover:bg-white/20 text-white p-1.5 rounded-md transition-colors disabled:opacity-30"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                {PRESET_COLORS.map((col) => (
                  <div
                    key={col.hex}
                    onClick={() => handleColorClick(col.hex)}
                    className="group relative h-12 rounded-lg overflow-hidden cursor-pointer transition-all border border-transparent hover:border-white/30 shrink-0"
                  >
                    <div
                      className="absolute inset-0"
                      style={{ backgroundColor: col.hex }}
                    ></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <p className="text-xs font-bold text-white shadow-sm">
                        {col.name}
                      </p>
                      <p className="text-[10px] text-zinc-300 font-mono uppercase">
                        {col.hex}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "light" && (
            <div className="flex flex-col gap-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Lighting
                  </h4>
                  <button
                    onClick={() => environmentInputRef.current?.click()}
                    className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Upload size={10} /> Custom HDR/EXR
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[
                    {
                      id: "studio",
                      icon: Sun,
                      label: "Studio",
                      color: "text-yellow-100",
                    },
                    {
                      id: "sunset",
                      icon: Sunset,
                      label: "Sunset",
                      color: "text-orange-400",
                    },
                    {
                      id: "dawn",
                      icon: Cloud,
                      label: "Dawn",
                      color: "text-indigo-300",
                    },
                    {
                      id: "warehouse",
                      icon: Warehouse,
                      label: "Warehouse",
                      color: "text-zinc-400",
                    },
                    {
                      id: "night",
                      icon: Moon,
                      label: "Night",
                      color: "text-purple-400",
                    },
                    {
                      id: "forest",
                      icon: Sun,
                      label: "Forest",
                      color: "text-green-400",
                    },
                    ...(customEnvironment
                      ? [
                          {
                            id: "custom",
                            icon: ImageIcon,
                            label: "Custom",
                            color: "text-white",
                          },
                        ]
                      : []),
                  ].map((l) => (
                    <div
                      key={l.id}
                      onClick={() => setLighting(l.id as any)}
                      className={`aspect-video rounded-lg border flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-white/5 ${currentLighting === l.id ? "border-blue-500 bg-blue-500/10" : "border-white/10"}`}
                    >
                      <l.icon size={20} className={`${l.color} mb-2`} />
                      <span className="text-[10px] text-zinc-300">
                        {l.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Environment Brightness Slider */}
                <div className="bg-zinc-800/50 p-2 rounded-lg border border-white/5 space-y-2">
                  <SliderControl
                    label="Environment Brightness"
                    value={environmentSettings.intensity}
                    min="0"
                    max="4"
                    step="0.01"
                    onChange={(v: number) =>
                      updateEnvironmentSettings({ intensity: v })
                    }
                  />
                  <SliderControl
                    label="Environment Rotation"
                    value={environmentSettings.rotationY}
                    min="0"
                    max={Math.PI * 2}
                    step="0.01"
                    onChange={(v: number) =>
                      updateEnvironmentSettings({ rotationY: v })
                    }
                  />
                </div>

                {/* Bloom Effect Intensity Slider */}
                <div className="bg-zinc-800/50 p-2 rounded-lg border border-white/5">
                  <SliderControl
                    label="Bloom Effect Intensity"
                    value={effectsSettings?.bloomIntensity ?? 0.6}
                    min="0"
                    max="3"
                    step="0.05"
                    onChange={(v: number) =>
                      updateEffectsSettings({ bloomIntensity: v })
                    }
                  />
                </div>

                {/* Advanced Render Controls */}
                <div className="bg-zinc-800/50 p-3 rounded-lg border border-white/5 space-y-3">
                  <div className="text-xs font-semibold text-zinc-400 border-b border-white/5 pb-1 mb-2">
                    Advanced Rendering
                  </div>

                  {/* Flat Studio Lights */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-zinc-200">Virtual Lights</span>
                      <span className="text-[10px] text-zinc-500">Enable flat directional & spot lights</span>
                    </div>
                    <button
                      onClick={() => setLightingEnabled(!lightingEnabled)}
                      className={`w-10 h-6 flex items-center rounded-full p-0.5 transition-colors focus:outline-none shrink-0 ${lightingEnabled ? 'bg-blue-500' : 'bg-zinc-700'}`}
                    >
                      <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${lightingEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Show Environment Background */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-zinc-200">Show HDRI Background</span>
                      <span className="text-[10px] text-zinc-500">Toggle 360° environment panorama background</span>
                    </div>
                    <button
                      onClick={() => setShowEnvironmentBackground(!showEnvironmentBackground)}
                      className={`w-10 h-6 flex items-center rounded-full p-0.5 transition-colors focus:outline-none shrink-0 ${showEnvironmentBackground ? 'bg-blue-500' : 'bg-zinc-700'}`}
                    >
                      <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${showEnvironmentBackground ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Wireframe Mode */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-zinc-200">Wireframe Mode</span>
                      <span className="text-[10px] text-zinc-500">Toggle technical wireframe grid overlay</span>
                    </div>
                    <button
                      onClick={() => setWireframeEnabled(!wireframeEnabled)}
                      className={`w-10 h-6 flex items-center rounded-full p-0.5 transition-colors focus:outline-none shrink-0 ${wireframeEnabled ? 'bg-blue-500' : 'bg-zinc-700'}`}
                    >
                      <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${wireframeEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Tone Mapping */}
                  <div className="flex flex-col gap-1.5 pt-1.5 border-t border-white/5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-zinc-200">Tone Mapping</span>
                      <span className="text-[10px] text-zinc-500 font-mono uppercase">{effectsSettings?.toneMapping || 'ACESFilmic'}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {(['ACESFilmic', 'AgX', 'Linear', 'None'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => updateEffectsSettings({ toneMapping: mode })}
                          className={`py-1 text-[9px] font-semibold rounded transition-all ${
                            (effectsSettings?.toneMapping || 'ACESFilmic') === mode
                              ? 'bg-blue-500 text-white shadow-sm'
                              : 'bg-zinc-900/40 text-zinc-400 border border-white/5 hover:bg-zinc-700/50'
                          }`}
                        >
                          {mode === 'ACESFilmic' ? 'ACES' : mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Post Processing */}
                  <div className="flex flex-col gap-1.5 pt-1.5 border-t border-white/5">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-zinc-200">Post Processing</span>
                        <span className="text-[10px] text-zinc-500">Bloom, grain, vignette, tilt-shift, AO</span>
                      </div>
                      <button
                        onClick={() => updateEffectsSettings({ postProcessingEnabled: !effectsSettings?.postProcessingEnabled })}
                        className={`w-10 h-6 flex items-center rounded-full p-0.5 transition-colors focus:outline-none shrink-0 ${effectsSettings?.postProcessingEnabled ? 'bg-blue-500' : 'bg-zinc-700'}`}
                      >
                        <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${effectsSettings?.postProcessingEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Ambient Occlusion */}
                  <div className="flex flex-col gap-1.5 pt-1.5 border-t border-white/5">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-zinc-200">Ambient Occlusion (AO)</span>
                        <span className="text-[10px] text-zinc-500">Realistic contact shadows</span>
                      </div>
                      <button
                        onClick={() => updateEffectsSettings({ aoEnabled: effectsSettings?.aoEnabled === false })}
                        className={`w-10 h-6 flex items-center rounded-full p-0.5 transition-colors focus:outline-none shrink-0 ${effectsSettings?.aoEnabled !== false ? 'bg-blue-500' : 'bg-zinc-700'}`}
                      >
                        <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${effectsSettings?.aoEnabled !== false ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>
                    {effectsSettings?.aoEnabled !== false && (
                      <div className="grid grid-cols-3 gap-1">
                        {(['low', 'medium', 'high'] as const).map((q) => (
                          <button
                            key={q}
                            onClick={() => updateEffectsSettings({ aoQuality: q })}
                            className={`py-1 text-[9px] font-semibold rounded transition-all uppercase ${
                              (effectsSettings?.aoQuality || 'medium') === q
                                ? 'bg-blue-500 text-white shadow-sm'
                                : 'bg-zinc-900/40 text-zinc-400 border border-white/5 hover:bg-zinc-700/50'
                            }`}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Exposure Slider */}
                  <div className="pt-1.5 border-t border-white/5">
                    <SliderControl
                      label="Renderer Exposure"
                      value={effectsSettings?.exposure ?? 1.0}
                      min="0.2"
                      max="2.5"
                      step="0.05"
                      onChange={(v: number) =>
                        updateEffectsSettings({ exposure: v })
                      }
                    />
                  </div>
                </div>
              </div>

              {currentLighting === "custom" && (
                <div className="p-3 border border-white/10 rounded-lg bg-white/5 animate-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                    <Move size={14} className="text-blue-400" />
                    <span className="text-xs font-bold text-zinc-300">
                      Environment Calibration
                    </span>
                  </div>
                  <div className="space-y-3">
                    <SliderControl
                      label="Rotation Y"
                      value={environmentSettings.rotationY}
                      min="0"
                      max={Math.PI * 2}
                      step="0.01"
                      displayValue={`${Math.round(environmentSettings.rotationY * (180 / Math.PI))}°`}
                      onChange={(v: number) =>
                        updateEnvironmentSettings({ rotationY: v })
                      }
                    />
                    <SliderControl
                      label="Tilt X"
                      value={environmentSettings.rotationX}
                      min={-Math.PI / 2}
                      max={Math.PI / 2}
                      step="0.01"
                      displayValue={`${Math.round(environmentSettings.rotationX * (180 / Math.PI))}°`}
                      onChange={(v: number) =>
                        updateEnvironmentSettings({ rotationX: v })
                      }
                    />
                    <SliderControl
                      label="Ground Height"
                      value={environmentSettings.height}
                      min="0"
                      max="50"
                      step="0.5"
                      onChange={(v: number) =>
                        updateEnvironmentSettings({ height: v })
                      }
                    />
                    <SliderControl
                      label="Dome Radius"
                      value={environmentSettings.radius}
                      min="10"
                      max="500"
                      step="10"
                      onChange={(v: number) =>
                        updateEnvironmentSettings({ radius: v })
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "mix" && (
            <AISection />
          )}
        </div>
      </div>
    </div>
  );
};

const AISection = () => {
  const {
    isGenerating,
    materials,
    partMaterials,
    selectedPart,
    removeMaterial,
    removeMaterialGroup,
    generateFullDesign,
  } = useStore();
  const [prompt, setPrompt] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    await generateFullDesign(prompt);
    setExpandedGroups((prev) => ({ ...prev, [prompt]: true }));
    setPrompt("");
  };

  const handleMaterialClick = (matId: string) => {
    if (selectedPart) useStore.getState().setMaterial(selectedPart, matId);
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const handleDeleteGroup = (e: React.MouseEvent, groupName: string) => {
    e.stopPropagation();
    removeMaterialGroup(groupName);
  };

  const aiMaterials = materials.filter((m) => m.type === "ai-generated");
  const aiGroups: Record<string, typeof aiMaterials> = {};
  aiMaterials.forEach((m) => {
    const groupName = m.group || "Older Generations";
    if (!aiGroups[groupName]) aiGroups[groupName] = [];
    aiGroups[groupName].push(m);
  });

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-lg p-4 border border-white/10 sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-3">
          <Box size={16} className="text-purple-400" />
          <span className="text-sm font-bold text-white">
            AI Texture Gen
          </span>
        </div>
        <p className="text-xs text-zinc-400 mb-3">
          Describe a style or theme.
        </p>
        <div className="flex gap-2">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white flex-1 focus:outline-none focus:border-purple-500"
            placeholder="Prompt..."
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
          />
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-purple-600 hover:bg-purple-500 text-white rounded p-1.5 transition-colors disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ChevronRight size={14} />
            )}
          </button>
        </div>
      </div>
      <div className="max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
        {Object.keys(aiGroups).length === 0 ? (
          <div className="text-center py-4 bg-white/5 rounded-lg border border-dashed border-white/10">
            <span className="text-[10px] text-zinc-500">
              No generated materials yet.
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            {Object.entries(aiGroups)
              .reverse()
              .map(([groupName, groupMats]) => {
                const isExpanded = expandedGroups[groupName];
                return (
                  <div
                    key={groupName}
                    className="bg-zinc-800/50 rounded-lg border border-white/5 overflow-hidden"
                  >
                    <div
                      className="p-2 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                      onClick={() => toggleGroup(groupName)}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        {isExpanded ? (
                          <ChevronDown
                            size={12}
                            className="text-zinc-500"
                          />
                        ) : (
                          <ChevronRight
                            size={12}
                            className="text-zinc-500"
                          />
                        )}
                        <span
                          className="text-[10px] font-medium text-zinc-300 truncate flex-1"
                          title={groupName}
                        >
                          {groupName.length > 25
                            ? groupName.substring(0, 25) + "..."
                            : groupName}
                        </span>
                        <span className="text-[9px] text-zinc-600 bg-black/20 px-1.5 py-0.5 rounded-full">
                          {groupMats.length}
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteGroup(e, groupName)}
                        className="p-1 hover:text-red-400 text-zinc-600 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="p-2 pt-0 grid grid-cols-2 gap-2 animate-in slide-in-from-top-2">
                        {groupMats.map((mat) => (
                          <div
                            key={mat.id}
                            onClick={() => handleMaterialClick(mat.id)}
                            className={`group relative h-16 rounded-lg overflow-hidden cursor-pointer transition-all border ${partMaterials[selectedPart || ""] === mat.id ? "border-purple-500 ring-1 ring-blue-500" : "border-transparent hover:border-white/30"}`}
                          >
                            <div
                              className="absolute inset-0"
                              style={{
                                backgroundImage: mat.textureUrl
                                  ? `url(${mat.textureUrl})`
                                  : "none",
                                backgroundSize: "cover",
                              }}
                            ></div>
                            <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
                            <div className="absolute left-2 top-1/2 -translate-y-1/2">
                              <p className="text-[10px] font-medium text-white shadow-sm truncate w-20">
                                {mat.name}
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                removeMaterial(mat.id);
                              }}
                              className="absolute top-1 right-1 p-1.5 bg-red-600 hover:bg-red-500 rounded-full text-white transition-all z-20 shadow-md backdrop-blur-sm opacity-0 group-hover:opacity-100 scale-75"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};


// --- Camera Logic ---
