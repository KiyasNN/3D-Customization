import { LanguagePicker } from './LanguagePicker';
import { t, useLanguage } from '../services/i18n';
import React, { useState, useRef, useEffect } from "react";
import { useStore, DEMO_ASSET } from "../store";
import { GuidedTour } from "./GuidedTour";
import { AssetBrowser } from "./AssetBrowser";
import { AdminPanel } from "./AdminPanel";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "../services/firebase";
import { Search } from "lucide-react";
import { SHOE_PARTS, INITIAL_MATERIALS, MATERIAL_PRESETS } from "../constants";
import { generatePDF } from "../services/pdfService";
import { processPBRMaps } from "../services/materialEngine";
import { Material, UploadedAsset } from "../types";
import CSI_COLORWALL from "../data/csi-colorwall.json";
import { matchesColorSearch } from "../services/colorSearch";
import {
  Layers,
  Undo2,
  Redo2,
  Camera,
  Box,
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
  Lock,
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
  Unlink,
  FolderPlus,
  Folder,
  FolderOpen,
  User,
  LogIn,
  LogOut,
  ShieldCheck,
  UserPlus,
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
        <span className="text-[10px] font-medium text-zinc-400">{t(label)}</span>
        <span className="text-[10px] text-zinc-500 font-mono">
          {displayValue !== undefined ? displayValue : value}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleStep(-1)}
          className="w-6 h-6 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors border border-white/5 active:bg-white/20"
          title={t("Decrease")}
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
          title={t("Increase")}
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
      title={t(label)}
    >
      {React.cloneElement(icon as React.ReactElement<any>, { size: 18 })}
      <span className="text-[9px] font-medium tracking-tight whitespace-nowrap">
        {t(label)}
      </span>
    </button>
  );
};

export const getThemeColorClass = (color: string) => {
  switch (color) {
    case "blue":
      return {
        bg: "bg-blue-600",
        hoverBg: "hover:bg-blue-500",
        text: "text-blue-400",
        accent: "accent-blue-500",
        border: "border-blue-500/30",
        glow: "shadow-blue-500/10",
        from: "from-blue-600",
        to: "to-cyan-500",
      };
    case "purple":
      return {
        bg: "bg-purple-600",
        hoverBg: "hover:bg-purple-500",
        text: "text-purple-400",
        accent: "accent-purple-500",
        border: "border-purple-500/30",
        glow: "shadow-purple-500/10",
        from: "from-purple-600",
        to: "to-fuchsia-500",
      };
    case "emerald":
      return {
        bg: "bg-emerald-600",
        hoverBg: "hover:bg-emerald-500",
        text: "text-emerald-400",
        accent: "accent-emerald-500",
        border: "border-emerald-500/30",
        glow: "shadow-emerald-500/10",
        from: "from-emerald-600",
        to: "to-teal-500",
      };
    case "rose":
      return {
        bg: "bg-rose-600",
        hoverBg: "hover:bg-rose-500",
        text: "text-rose-400",
        accent: "accent-rose-500",
        border: "border-rose-500/30",
        glow: "shadow-rose-500/10",
        from: "from-rose-600",
        to: "to-pink-500",
      };
    case "indigo":
    default:
      return {
        bg: "bg-indigo-600",
        hoverBg: "hover:bg-indigo-500",
        text: "text-indigo-400",
        accent: "accent-indigo-500",
        border: "border-indigo-500/30",
        glow: "shadow-indigo-500/10",
        from: "from-indigo-600",
        to: "to-violet-500",
      };
  }
};



// Preset Colors with Names
const CSI_COLORS = CSI_COLORWALL.map(color => ({ ...color, name: color.code }));
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
  const triggerFitView = useStore((s) => s.triggerFitView);
  const recordingStatus = useStore((s) => s.recordingStatus);
  const isRecordingSettingsOpen = useStore((s) => s.isRecordingSettingsOpen);
  const savedVariants = useStore((s) => s.savedVariants);
  const materials = useStore((s) => s.materials);
  const saasConfig = useStore((s) => s.saasConfig);
  const setAdminPanelOpen = useStore((s) => s.setAdminPanelOpen);

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
             {t("View")} </span>
          <div className="flex gap-2">
            <TopButton
              icon={<Maximize2 />}
              label={t("Fit View")}
              onClick={() => triggerFitView(true)}
              color="blue"
            />
            <TopButton
              icon={<ArrowRightFromLine />}
              label={t("Left")}
              onClick={() => setCameraView("left")}
            />
            <TopButton
              icon={<ArrowLeftFromLine />}
              label={t("Right")}
              onClick={() => setCameraView("right")}
            />
            <TopButton
              icon={<Repeat />}
              label={t("Turntable")}
              onClick={toggleTurntable}
              active={isTurntableActive}
              color="blue"
            />
            <TopButton
              icon={<Footprints />}
              label={t("Walk")}
              onClick={onWalkClick}
              active={isWalking}
              color="blue"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 px-3 border-r border-white/10 shrink-0">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider hidden xl:block">
             {t("Visibility")} </span>
          <div className="flex gap-2">
            {/* Mobile toggle for parts list */}
            <TopButton
              icon={showLeftPanel ? <PanelLeftClose /> : <PanelLeftOpen />}
              label={t("Layers")}
              onClick={() => setShowLeftPanel(!showLeftPanel)}
              active={showLeftPanel}
            />

            <TopButton
              icon={isExploded ? <Minimize2 /> : <Maximize2 />}
              label={t("Explode")}
              onClick={toggleExploded}
              active={isExploded}
              color="orange"
            />

            <TopButton
              icon={<Grid3X3 />}
              label={t("Floor")}
              onClick={toggleFloor}
              active={showFloor}
              color="blue"
            />

            <TopButton
              icon={<Tag size={16} />}
              label={t("Labels")}
              onClick={toggleAnnotations}
              active={showAnnotations}
              color="blue"
            />

            <TopButton
              icon={<LightbulbOff />}
              label={t("Hide")}
              onClick={hidePart}
              disabled={!selectedPart}
            />
            <TopButton
              icon={<Lightbulb />}
              label={t("Single")}
              onClick={singlePart}
              active={isSingleMode}
              color="orange"
              disabled={!selectedPart}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 px-3 border-r border-white/10 shrink-0">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider hidden xl:block">
             {t("Edit")} </span>
          <div className="flex gap-2">
            <TopButton icon={<Undo2 />} label={t("Undo")} onClick={undo} />
            <TopButton icon={<Redo2 />} label={t("Redo")} onClick={redo} />
            <TopButton icon={<Eraser />} label={t("Clear")} onClick={handleClear} />
            <TopButton
              icon={<RefreshCw />}
              label={t("Reset")}
              onClick={resetAllParts}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 px-3 border-r border-white/10 shrink-0">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider hidden xl:block">
             {t("Capture")} </span>
          <div className="flex gap-2">
            <TopButton
              icon={<Camera />}
              label={t("Snap")}
              onClick={() => triggerSnapshot("download")}
            />
            <TopButton
              icon={
                !saasConfig.enabledFeatures.videoCapture ? (
                  <Lock size={14} className="text-amber-400 animate-pulse" />
                ) : recordingStatus === "recording" ? (
                  <Loader2 className="animate-spin text-red-500" />
                ) : (
                  <Clapperboard />
                )
              }
              label={
                !saasConfig.enabledFeatures.videoCapture ? t("MP4 (Pro)") : recordingStatus === "recording" ? t("Rec...") : t("MP4")
              }
              onClick={() => {
                if (!saasConfig.enabledFeatures.videoCapture) {
                  alert(
                    t("Feature Locked: MP4 Video export is locked by your system administrator. Toggles can be modified in the Control Panel."),
                  );
                  setAdminPanelOpen(true);
                } else {
                  onRecordingClick();
                }
              }}
              disabled={recordingStatus === "recording"}
              active={
                saasConfig.enabledFeatures.videoCapture &&
                (recordingStatus === "recording" || isRecordingSettingsOpen)
              }
              color={!saasConfig.enabledFeatures.videoCapture ? "orange" : "red"}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 px-3 shrink-0">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider hidden xl:block">
             {t("Project")} </span>
          <div className="flex gap-2">
            <TopButton
              icon={<Save />}
              label={t("Save")}
              onClick={() => triggerSnapshot("save")}
            />
            <TopButton
              icon={<FileText />}
              label={t("PDF")}
              onClick={() => {
                if (savedVariants.length === 0) {
                  alert(
                    t("Please save at least one variant to the dashboard first."),
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
        uvScale: 1,
        projectionType: 'uv',
      }
    : null;

  if (!selectedPart || !currentConfig) return null;

  return (
    <div className="p-3 border border-white/10 rounded-lg flex flex-col gap-3 bg-white/5 animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2 mb-1 pb-2 border-b border-white/5">
        <Sliders size={14} className="text-zinc-400" />
        <span className="text-xs font-bold text-zinc-300">{t("Material Tuning")}</span>
      </div>

      <SliderControl
        label={t("Texture Tiling (Scale)")}
        value={currentConfig.scale}
        min="0.1"
        max="20"
        step="0.01"
        displayValue={`${currentConfig.scale.toFixed(2)}x`}
        onChange={(v: number) => updatePartConfig(selectedPart, { scale: v })}
      />
      
      <SliderControl
        label={t("UV Scale")}
        value={currentConfig.uvScale || 1}
        min="0.1"
        max="10"
        step="0.1"
        displayValue={`${(currentConfig.uvScale || 1).toFixed(1)}x`}
        onChange={(v: number) => updatePartConfig(selectedPart, { uvScale: v })}
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
           {t("UV Projection Type")} </label>
        <select
          value={currentConfig.projectionType || 'uv'}
          onChange={(e) => updatePartConfig(selectedPart, { projectionType: e.target.value as any })}
          className="w-full bg-zinc-950 text-white text-xs p-2 rounded-lg border border-white/10"
        >
          <option value="uv">{t("UV Map (Default)")}</option>
          <option value="planar">{t("Planar")}</option>
          <option value="box">{t("Box")}</option>
          <option value="cylindrical">{t("Cylindrical")}</option>
        </select>
      </div>

      <SliderControl
        label={t("Normal Strength (Bump)")}
        value={currentConfig.normalScale}
        min="0"
        max="5"
        step="0.01"
        onChange={(v: number) =>
          updatePartConfig(selectedPart, { normalScale: v })
        }
      />

      <SliderControl
        label={t("Roughness")}
        value={currentConfig.roughness}
        min="0"
        max="1"
        step="0.01"
        onChange={(v: number) =>
          updatePartConfig(selectedPart, { roughness: v })
        }
      />

      <SliderControl
        label={t("Displacement")}
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
             {t("Project Image (Logo/Decal)")} </span>
        </div>
        {hasProjectedImage && (
          <button
            onClick={clearProjectedImage}
            className="text-[10px] bg-red-950/40 hover:bg-red-900/60 text-red-400 px-2 py-0.5 rounded border border-red-500/20 flex items-center gap-1 transition-colors"
          >
            <Trash2 size={10} />
             {t("Clear")} </button>
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
               {t("Drag & drop or Click to Upload")} </p>
            <p className="text-[9px] text-zinc-500 mt-0.5">
               {t("Supports PNG & JPG files")} </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 bg-black/20 p-2 rounded border border-white/5">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={currentConfig.projectedImageUrl}
                alt={t("Projected preview")}
                className="w-10 h-10 object-contain rounded bg-zinc-950 border border-white/10"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-blue-400 truncate animate-pulse">
                   {t("Projected Image Active")} </p>
                <p className="text-[9px] text-zinc-400">
                   {t("Position on selected part")} </p>
              </div>
            </div>

            {/* Elegant Toggle tile/repeat on/off */}
            <div className="flex items-center gap-2 border-l border-white/10 pl-3">
              <div className="text-right">
                <p className="text-[9px] font-bold text-zinc-300">{t("Tiling")}</p>
                <p className="text-[8px] text-zinc-500">
                  {repeat ? t("ON") : t("OFF")}
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
            label={t("Horizontal Offset (X)")}
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
            label={t("Vertical Offset (Y)")}
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
            label={t("Scale X (Width)")}
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
            label={t("Scale Y (Height)")}
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
            label={t("Rotation Angle")}
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
    showMeasurements,
    toggleMeasurements,
    labelSize,
    setLabelSize,
    selectedParts = [],
    saasConfig,
    setAdminPanelOpen,
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
           {t("Annotation & Transform")} </span>
      </div>
      <div className="p-3 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
        <div className="flex flex-col gap-3">
          <div>
            <span className="text-[10px] font-medium text-zinc-400 block mb-1">
               {t("Title")} </span>
            <input
              type="text"
              value={titleValue}
              onChange={(e) => handleUpdate("title", e.target.value)}
              placeholder={t("Part Name")}
              className="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div>
            <span className="text-[10px] font-medium text-zinc-400 block mb-1">
               {t("Description")} </span>
            <textarea
              value={descValue}
              onChange={(e) => handleUpdate("description", e.target.value)}
              placeholder={t("Details...")}
              rows={3}
              className="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50 resize-none"
            />
          </div>
          <SliderControl
            label={t("Label Distance")}
            value={offsetValue}
            min="20"
            max="200"
            step="5"
            onChange={(v: number) => handleUpdate("offset", v)}
          />
          <SliderControl
            label={t("Global Label Size")}
            value={labelSize}
            min="0.05"
            max="2.5"
            step="0.05"
            displayValue={`${labelSize % 0.1 === 0 ? labelSize.toFixed(1) : labelSize.toFixed(2)}x`}
            onChange={(v: number) => setLabelSize(v)}
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
              {showAnnotations ? t("Hide Global Annotations") : t("Show Global Annotations")}
            </span>
          </button>
          <button
            onClick={() => {
              if (!saasConfig.enabledFeatures.measurements) {
                alert(t("Upgrade Required: Sizing Measurements is a Premium feature. Enable it in the Control Panel!"));
                setAdminPanelOpen(true);
              } else {
                toggleMeasurements();
              }
            }}
            className={`w-full py-1.5 mt-1 border rounded text-center transition-colors flex items-center justify-center gap-2 group ${
              !saasConfig.enabledFeatures.measurements
                ? "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20"
                : showMeasurements 
                  ? "bg-blue-500/20 border-blue-500/30 hover:bg-blue-500/30 text-blue-400" 
                  : "bg-zinc-900/50 border-white/5 hover:bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            {!saasConfig.enabledFeatures.measurements ? <Lock size={12} className="text-amber-400 animate-pulse" /> : showMeasurements ? <EyeOff size={12} /> : <Ruler size={12} />}
            <span className="text-[10px]">
              {!saasConfig.enabledFeatures.measurements ? t("Measurements (Premium)") : showMeasurements ? t("Hide Measurements") : t("Show Measurements")}
            </span>
          </button>
        </div>

        <div className="h-px bg-white/10 w-full" />

        {/* Transform Section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <Move size={12} className="text-orange-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
               {t("Part Transform")} </span>
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
                title={t("{0} Mode", [mode.charAt(0).toUpperCase() + mode.slice(1)])}
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
              label={t("Scale (Exploded)")}
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
                 {t("Enable")}{" "}
                <span className="text-orange-400 font-bold">{t("Explode")}</span>  {t("to Scale")} </span>
            </button>
          )}



          {isExploded && (
            <>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-medium text-zinc-300">{t("3D Viewport Gizmo")}</span>
                  <span className="text-[8px] text-zinc-500">{t("Drag part directly in 3D scene")}</span>
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
                    <span className="text-[9px] text-zinc-500">{t("Gizmo Size")}</span>
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
                  {selectedPart || selectedParts.length > 0 ? t("Reset Selected Transforms") : t("Reset All Transforms")}
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
  useLanguage();
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
    saasConfig,
    setAdminPanelOpen,
    user,
    userProfile,
    setUser,
  } = useStore();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [activeTab, setActiveTab] = useState<
    "dashboard" | "models" | "materials" | "colors" | "light"
  >("dashboard");

  const [showWalkModal, setShowWalkModal] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(!isMobile);
  const setShowLeftPanelRef = useRef(setShowLeftPanel);
  useEffect(() => {
    setShowLeftPanelRef.current = setShowLeftPanel;
  }, [setShowLeftPanel]);
  const [isCameraOverlayOpen, setIsCameraOverlayOpen] = useState(false);
  const [capturedTempImage, setCapturedTempImage] = useState<string | null>(null);
  const [cropX, setCropX] = useState<number>(10);
  const [cropY, setCropY] = useState<number>(10);
  const [cropSize, setCropSize] = useState<number>(80);
  const [blendAmount, setBlendAmount] = useState<number>(15);
  const [mirrorMode, setMirrorMode] = useState<boolean>(false);
  const [processedTextureUrl, setProcessedTextureUrl] = useState<string>("");
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [isPBRMaterial, setIsPBRMaterial] = useState<boolean>(false);
  const [isSavingMaterial, setIsSavingMaterial] = useState<boolean>(false);

  const [cropWarpMode, setCropWarpMode] = useState<"square" | "perspective">("perspective");

  const [cornerTL, setCornerTL] = useState<{ x: number; y: number }>({ x: 15, y: 15 });
  const [cornerTR, setCornerTR] = useState<{ x: number; y: number }>({ x: 85, y: 15 });
  const [cornerBL, setCornerBL] = useState<{ x: number; y: number }>({ x: 15, y: 85 });
  const [cornerBR, setCornerBR] = useState<{ x: number; y: number }>({ x: 85, y: 85 });

  const [dragMode, setDragMode] = useState<"move" | "tl" | "tr" | "bl" | "br" | null>(null);
  const cropContainerRef = useRef<HTMLDivElement>(null);
  const dragStartState = useRef({
    cropX: 10,
    cropY: 10,
    cropSize: 80,
    startXPct: 0,
    startYPct: 0,
    tl: { x: 15, y: 15 },
    tr: { x: 85, y: 15 },
    bl: { x: 15, y: 85 },
    br: { x: 85, y: 85 }
  });

  const handleCropPointerDown = (e: React.PointerEvent, mode: "move" | "tl" | "tr" | "bl" | "br") => {
    e.stopPropagation();
    if (!cropContainerRef.current) return;
    const rect = cropContainerRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;

    setDragMode(mode);
    dragStartState.current = {
      cropX,
      cropY,
      cropSize,
      startXPct: xPct,
      startYPct: yPct,
      tl: { ...cornerTL },
      tr: { ...cornerTR },
      bl: { ...cornerBL },
      br: { ...cornerBR }
    };
    
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch (err) {
      // safe fallback
    }
  };

  const handleCropPointerMove = (e: React.PointerEvent) => {
    if (!dragMode || !cropContainerRef.current) return;
    e.stopPropagation();

    const rect = cropContainerRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;

    const start = dragStartState.current;

    if (cropWarpMode === "perspective") {
      if (dragMode === "move") {
        const dx = xPct - start.startXPct;
        const dy = yPct - start.startYPct;
        
        let newTL_x = start.tl.x + dx;
        let newTL_y = start.tl.y + dy;
        let newTR_x = start.tr.x + dx;
        let newTR_y = start.tr.y + dy;
        let newBL_x = start.bl.x + dx;
        let newBL_y = start.bl.y + dy;
        let newBR_x = start.br.x + dx;
        let newBR_y = start.br.y + dy;

        const minX = Math.min(newTL_x, newTR_x, newBL_x, newBR_x);
        const maxX = Math.max(newTL_x, newTR_x, newBL_x, newBR_x);
        const minY = Math.min(newTL_y, newTR_y, newBL_y, newBR_y);
        const maxY = Math.max(newTL_y, newTR_y, newBL_y, newBR_y);

        let adjX = 0;
        if (minX < 0) adjX = -minX;
        else if (maxX > 100) adjX = 100 - maxX;

        let adjY = 0;
        if (minY < 0) adjY = -minY;
        else if (maxY > 100) adjY = 100 - maxY;

        setCornerTL({ x: Math.round(newTL_x + adjX), y: Math.round(newTL_y + adjY) });
        setCornerTR({ x: Math.round(newTR_x + adjX), y: Math.round(newTR_y + adjY) });
        setCornerBL({ x: Math.round(newBL_x + adjX), y: Math.round(newBL_y + adjY) });
        setCornerBR({ x: Math.round(newBR_x + adjX), y: Math.round(newBR_y + adjY) });
      } else {
        const clampedX = Math.max(0, Math.min(xPct, 100));
        const clampedY = Math.max(0, Math.min(yPct, 100));
        const roundedPoint = { x: Math.round(clampedX), y: Math.round(clampedY) };

        if (dragMode === "tl") {
          setCornerTL(roundedPoint);
        } else if (dragMode === "tr") {
          setCornerTR(roundedPoint);
        } else if (dragMode === "bl") {
          setCornerBL(roundedPoint);
        } else if (dragMode === "br") {
          setCornerBR(roundedPoint);
        }
      }
    } else {
      if (dragMode === "move") {
        const dx = xPct - start.startXPct;
        const dy = yPct - start.startYPct;
        let newX = start.cropX + dx;
        let newY = start.cropY + dy;
        
        newX = Math.max(0, Math.min(newX, 100 - start.cropSize));
        newY = Math.max(0, Math.min(newY, 100 - start.cropSize));
        
        const roundedX = Math.round(newX);
        const roundedY = Math.round(newY);
        setCropX(roundedX);
        setCropY(roundedY);

        setCornerTL({ x: roundedX, y: roundedY });
        setCornerTR({ x: roundedX + cropSize, y: roundedY });
        setCornerBL({ x: roundedX, y: roundedY + cropSize });
        setCornerBR({ x: roundedX + cropSize, y: roundedY + cropSize });
      } else if (dragMode === "tl") {
        const x2 = start.cropX + start.cropSize;
        const y2 = start.cropY + start.cropSize;
        const sizeX = x2 - xPct;
        const sizeY = y2 - yPct;
        let size = Math.max(15, Math.min(sizeX, sizeY));
        if (x2 - size < 0) size = x2;
        if (y2 - size < 0) size = y2;
        
        const rX = Math.round(x2 - size);
        const rY = Math.round(y2 - size);
        const rSize = Math.round(size);

        setCropX(rX);
        setCropY(rY);
        setCropSize(rSize);

        setCornerTL({ x: rX, y: rY });
        setCornerTR({ x: rX + rSize, y: rY });
        setCornerBL({ x: rX, y: rY + rSize });
        setCornerBR({ x: rX + rSize, y: rY + rSize });
      } else if (dragMode === "tr") {
        const x1 = start.cropX;
        const y2 = start.cropY + start.cropSize;
        const sizeX = xPct - x1;
        const sizeY = y2 - yPct;
        let size = Math.max(15, Math.min(sizeX, sizeY));
        if (x1 + size > 100) size = 100 - x1;
        if (y2 - size < 0) size = y2;

        const rX = Math.round(x1);
        const rY = Math.round(y2 - size);
        const rSize = Math.round(size);

        setCropX(rX);
        setCropY(rY);
        setCropSize(rSize);

        setCornerTL({ x: rX, y: rY });
        setCornerTR({ x: rX + rSize, y: rY });
        setCornerBL({ x: rX, y: rY + rSize });
        setCornerBR({ x: rX + rSize, y: rY + rSize });
      } else if (dragMode === "bl") {
        const x2 = start.cropX + start.cropSize;
        const y1 = start.cropY;
        const sizeX = x2 - xPct;
        const sizeY = yPct - y1;
        let size = Math.max(15, Math.min(sizeX, sizeY));
        if (x2 - size < 0) size = x2;
        if (y1 + size > 100) size = 100 - y1;

        const rX = Math.round(x2 - size);
        const rY = Math.round(y1);
        const rSize = Math.round(size);

        setCropX(rX);
        setCropY(rY);
        setCropSize(rSize);

        setCornerTL({ x: rX, y: rY });
        setCornerTR({ x: rX + rSize, y: rY });
        setCornerBL({ x: rX, y: rY + rSize });
        setCornerBR({ x: rX + rSize, y: rY + rSize });
      } else if (dragMode === "br") {
        const x1 = start.cropX;
        const y1 = start.cropY;
        const sizeX = xPct - x1;
        const sizeY = yPct - y1;
        let size = Math.max(15, Math.min(sizeX, sizeY));
        if (x1 + size > 100) size = 100 - x1;
        if (y1 + size > 100) size = 100 - y1;

        const rX = Math.round(x1);
        const rY = Math.round(y1);
        const rSize = Math.round(size);

        setCropX(rX);
        setCropY(rY);
        setCropSize(rSize);

        setCornerTL({ x: rX, y: rY });
        setCornerTR({ x: rX + rSize, y: rY });
        setCornerBL({ x: rX, y: rY + rSize });
        setCornerBR({ x: rX + rSize, y: rY + rSize });
      }
    }
  };

  const handleCropPointerUp = (e: React.PointerEvent) => {
    if (!dragMode) return;
    e.stopPropagation();
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {
      // safe fallback
    }
    setDragMode(null);
  };

  const handleCropSizeChange = (val: number) => {
    setCropSize(val);
    if (cropX + val > 100) setCropX(Math.max(0, 100 - val));
    if (cropY + val > 100) setCropY(Math.max(0, 100 - val));
  };

  const handleCropXChange = (val: number) => {
    const maxVal = 100 - cropSize;
    setCropX(Math.min(val, maxVal));
  };

  const handleCropYChange = (val: number) => {
    const maxVal = 100 - cropSize;
    setCropY(Math.min(val, maxVal));
  };

  // Synchronize modes when switching to square
  useEffect(() => {
    if (cropWarpMode === "square") {
      setCornerTL({ x: cropX, y: cropY });
      setCornerTR({ x: cropX + cropSize, y: cropY });
      setCornerBL({ x: cropX, y: cropY + cropSize });
      setCornerBR({ x: cropX + cropSize, y: cropY + cropSize });
    }
  }, [cropWarpMode, cropX, cropY, cropSize]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // --- Seamless texture synthesizer ---
  useEffect(() => {
    if (!capturedTempImage) {
      setProcessedTextureUrl("");
      return;
    }

    const img = new Image();
    img.onload = () => {
      const sourceW = img.width;
      const sourceH = img.height;

      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Extract raw warped crop
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = 512;
      tempCanvas.height = 512;
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) return;

      // Draw original image onto an offscreen canvas to access raw pixels
      const srcCanvas = document.createElement("canvas");
      srcCanvas.width = sourceW;
      srcCanvas.height = sourceH;
      const srcCtx = srcCanvas.getContext("2d");
      if (!srcCtx) return;
      srcCtx.drawImage(img, 0, 0);

      const srcData = srcCtx.getImageData(0, 0, sourceW, sourceH);
      const srcPixels = srcData.data;
      const dstData = tempCtx.createImageData(512, 512);
      const dstPixels = dstData.data;

      // Extract corners in 0-1 normalized range
      const x0 = cornerTL.x / 100;
      const y0 = cornerTL.y / 100;
      const x1 = cornerTR.x / 100;
      const y1 = cornerTR.y / 100;
      const x2 = cornerBR.x / 100;
      const y2 = cornerBR.y / 100;
      const x3 = cornerBL.x / 100;
      const y3 = cornerBL.y / 100;

      for (let y = 0; y < 512; y++) {
        const v = y / 512;
        const oneMinusV = 1 - v;
        for (let x = 0; x < 512; x++) {
          const u = x / 512;
          const oneMinusU = 1 - u;

          // Bilinear weights
          const w0 = oneMinusU * oneMinusV;
          const w1 = u * oneMinusV;
          const w2 = u * v;
          const w3 = oneMinusU * v;

          const sxPct = w0 * x0 + w1 * x1 + w2 * x2 + w3 * x3;
          const syPct = w0 * y0 + w1 * y1 + w2 * y2 + w3 * y3;

          const px = Math.floor(sxPct * sourceW);
          const py = Math.floor(syPct * sourceH);

          const clampX = Math.max(0, Math.min(px, sourceW - 1));
          const clampY = Math.max(0, Math.min(py, sourceH - 1));

          const srcIdx = (clampY * sourceW + clampX) * 4;
          const dstIdx = (y * 512 + x) * 4;

          dstPixels[dstIdx] = srcPixels[srcIdx];
          dstPixels[dstIdx + 1] = srcPixels[srcIdx + 1];
          dstPixels[dstIdx + 2] = srcPixels[srcIdx + 2];
          dstPixels[dstIdx + 3] = srcPixels[srcIdx + 3];
        }
      }
      tempCtx.putImageData(dstData, 0, 0);

      if (mirrorMode) {
        // Draw 2x2 mirrored sections to create a guaranteed mathematically seamless tile
        ctx.save();
        ctx.scale(0.5, 0.5);
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.restore();

        ctx.save();
        ctx.translate(512, 0);
        ctx.scale(-0.5, 0.5);
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.restore();

        ctx.save();
        ctx.translate(0, 512);
        ctx.scale(0.5, -0.5);
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.restore();

        ctx.save();
        ctx.translate(512, 512);
        ctx.scale(-0.5, -0.5);
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.restore();
      } else if (blendAmount > 0) {
        // Shift seams to center and do overlapping feather blend (Photoshop Offset Seamless filter style)
        const half = 256;
        const blendSize = Math.max(2, Math.round((blendAmount / 100) * 128));

        // Draw shifted quadrants
        ctx.drawImage(tempCanvas, half, half, half, half, 0, 0, half, half);
        ctx.drawImage(tempCanvas, 0, half, half, half, half, 0, half, half);
        ctx.drawImage(tempCanvas, half, 0, half, half, 0, half, half, half);
        ctx.drawImage(tempCanvas, 0, 0, half, half, half, half, half, half);

        ctx.save();
        const stripWidth = blendSize * 2;

        // Blend vertical seam at x = 256
        for (let i = 0; i < stripWidth; i++) {
          const alpha = 1 - (i / stripWidth);
          ctx.globalAlpha = alpha;
          ctx.drawImage(
            tempCanvas,
            i, 0, 1, 512,
            half - blendSize + i, 0, 1, 512
          );
        }

        // Blend horizontal seam at y = 256
        for (let j = 0; j < stripWidth; j++) {
          const alpha = 1 - (j / stripWidth);
          ctx.globalAlpha = alpha;
          ctx.drawImage(
            tempCanvas,
            0, j, 512, 1,
            0, half - blendSize + j, 512, 1
          );
        }

        ctx.restore();
      } else {
        ctx.drawImage(tempCanvas, 0, 0);
      }

      setProcessedTextureUrl(canvas.toDataURL("image/jpeg"));
    };
    img.src = capturedTempImage;
  }, [capturedTempImage, cornerTL, cornerTR, cornerBL, cornerBR, blendAmount, mirrorMode]);

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
      setCapturedTempImage(null);
      setIsCameraOverlayOpen(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert(t("Could not access camera. Please allow permissions."));
      setIsCameraOverlayOpen(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setVideoStream(null);
    setCapturedTempImage(null);
    setIsCameraOverlayOpen(false);
    setEditingMaterialId(null);
    setIsPBRMaterial(false);
    setIsSavingMaterial(false);
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
        setCapturedTempImage(dataUrl);
        setCropX(15);
        setCropY(15);
        setCropSize(70);
        setBlendAmount(15);
        setMirrorMode(false);
      }
    }
    // Stop camera feed to save battery/privacy while editing
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
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

  const handleEditMaterialCrop = (mat: any) => {
    setEditingMaterialId(mat.id);
    setIsPBRMaterial(!!(mat.normalMapUrl || mat.roughnessMapUrl || mat.displacementMapUrl));
    setCapturedTempImage(mat.capturedTempImage || mat.textureUrl || null);
    setCropWarpMode(mat.cropWarpMode || "perspective");
    setCornerTL(mat.cornerTL || { x: 15, y: 15 });
    setCornerTR(mat.cornerTR || { x: 85, y: 15 });
    setCornerBL(mat.cornerBL || { x: 15, y: 85 });
    setCornerBR(mat.cornerBR || { x: 85, y: 85 });
    setCropX(mat.cropX !== undefined ? mat.cropX : 10);
    setCropY(mat.cropY !== undefined ? mat.cropY : 10);
    setCropSize(mat.cropSize !== undefined ? mat.cropSize : 80);
    setBlendAmount(mat.blendAmount !== undefined ? mat.blendAmount : 15);
    setMirrorMode(mat.mirrorMode !== undefined ? mat.mirrorMode : false);
    setIsCameraOverlayOpen(true);
  };

  const handlePBRImageReady = (dataUrl: string) => {
    setCapturedTempImage(dataUrl);
    setIsPBRMaterial(true);
    setEditingMaterialId(null);
    setCropWarpMode("perspective");
    setCornerTL({ x: 15, y: 15 });
    setCornerTR({ x: 85, y: 15 });
    setCornerBL({ x: 15, y: 85 });
    setCornerBR({ x: 85, y: 85 });
    setCropX(10);
    setCropY(10);
    setCropSize(80);
    setBlendAmount(15);
    setMirrorMode(false);
    setIsCameraOverlayOpen(true);
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
                 {t("Walk Configuration")} </h3>
              <button
                onClick={() => setShowWalkModal(false)}
                className="text-white/50 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4 text-center">
              <p className="text-sm text-zinc-400">
                 {t("To animate correctly, please specify which shoe the uploaded 3D model represents.")} </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => startWalking("left")}
                  className="p-4 rounded-lg border border-white/10 hover:bg-white/5 hover:border-blue-500/50 transition-all flex flex-col items-center gap-2 group"
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white font-bold text-lg">
                     {t("L")} </div>
                  <span className="text-sm font-medium text-zinc-300 group-hover:text-white">
                     {t("Left Shoe")} </span>
                </button>

                <button
                  onClick={() => startWalking("right")}
                  className="p-4 rounded-lg border border-white/10 hover:bg-white/5 hover:border-blue-500/50 transition-all flex flex-col items-center gap-2 group"
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white font-bold text-lg">
                     {t("R")} </div>
                  <span className="text-sm font-medium text-zinc-300 group-hover:text-white">
                     {t("Right Shoe")} </span>
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
               {t("Walk Speed")} </span>
            <span className="text-[10px] font-mono text-blue-300">
              {walkSpeed.toFixed(1)}
            </span>
          </div>
          <SliderControl
            label={t("Speed")}
            value={walkSpeed}
            min="0.5"
            max="10.0"
            step="0.1"
            onChange={setWalkSpeed}
          />
          <div className="flex justify-between text-[9px] text-zinc-500 font-mono">
            <span>{t("Slow")}</span>
            <span>{t("Fast")}</span>
          </div>
          
          <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-1">
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-medium text-white">{t("Reverse Orientation")}</span>
              <span className="text-[9px] text-zinc-400">{t("Rotates shoe 180° for custom axes")}</span>
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
               {t("Rotation Speed")} </span>
            <span className="text-[10px] font-mono text-blue-300">
              {turntableSpeed.toFixed(1)}
            </span>
          </div>
          <SliderControl
            label={t("Speed")}
            value={turntableSpeed}
            min="0.1"
            max="10.0"
            step="0.1"
            onChange={setTurntableSpeed}
          />
          <div className="flex justify-between text-[9px] text-zinc-500 font-mono">
            <span>{t("Slow")}</span>
            <span>{t("Fast")}</span>
          </div>
        </div>
      )}

      {isRecordingSettingsOpen && (
        <div className="absolute inset-0 bg-black/60 z-[100] pointer-events-auto flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Settings2 size={18} className="text-blue-500" />
                 {t("Turntable Settings")} </h3>
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
                     {t("Duration (Seconds)")} </span>
                  <span className="text-xs font-mono text-blue-400">
                    {turntableSettings.duration}{t("s")} </span>
                </div>
                <SliderControl
                  label={t("Duration")}
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
                     {t("Framerate (FPS)")} </span>
                </div>
                <div className="flex bg-zinc-800 rounded-lg p-1 border border-white/5">
                  {[30, 60].map((fps) => (
                    <button
                      key={fps}
                      onClick={() => setTurntableSettings({ fps })}
                      className={`flex-1 text-xs py-1.5 rounded-md transition-all ${turntableSettings.fps === fps ? "bg-zinc-600 text-white font-bold shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
                    >
                      {fps}  {t("FPS")} </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <RotateCw size={12} className="text-zinc-500" />
                     {t("Rotation Direction")} </span>
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
                     {t("Record Current View")} </span>
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
                 {t("Cancel")} </button>
              <button
                onClick={triggerRecording}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20 transition-colors text-xs font-bold flex items-center justify-center gap-2"
              >
                 {t("Start Recording")} </button>
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
                 {t("Recording Turntable...")} </h3>
              <p className="text-zinc-400 text-sm mt-1">
                 {t("Rendering")} {turntableSettings.duration}{t("s video at")}{" "}
                {turntableSettings.fps}  {t("FPS")} </p>
            </div>
            <button
              onClick={cancelRecording}
              className="mt-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full text-xs border border-white/10"
            >
               {t("Press ESC to Cancel")} </button>
          </div>
        </div>
      )}

      {recordingStatus === "review" && (
        <div className="absolute inset-0 bg-black/60 z-[100] pointer-events-auto flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Clapperboard size={18} className="text-blue-500" />
                 {t("Recording Finished")} </h3>
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
                 {t("Your 360° turntable video is ready. Would you like to save it to your device?")} </p>
              <div className="flex gap-3">
                <button
                  onClick={discardRecording}
                  className="flex-1 py-2.5 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium"
                >
                   {t("Cancel")} </button>
                <button
                  onClick={handleSaveRecording}
                  className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Download size={16} />  {t("Save MP4")} </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCameraOverlayOpen && (
        <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur-md z-[90] pointer-events-auto flex items-center justify-center p-2 md:p-4 overflow-hidden">
          {capturedTempImage ? (
            /* --- SEAMLESS TILING EDITOR VIEW --- */
            <div className="flex flex-col w-full h-full max-w-[1580px] md:h-[95vh] md:max-h-[960px] bg-zinc-900 border border-white/10 rounded-2xl shadow-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-3 md:p-5 lg:p-6">
              {/* Header */}
              <div className="flex justify-between items-center pb-3 border-b border-white/10 mb-3 shrink-0">
                <div className="flex items-center gap-3">
                  {!isPBRMaterial && (
                    <>
                      <button
                        onClick={() => {
                          setCapturedTempImage(null);
                          startCamera();
                        }}
                        className="text-zinc-400 hover:text-white p-2 hover:bg-white/5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
                      >
                        <ArrowLeftFromLine size={16} className="text-zinc-400" /> {editingMaterialId ? t("New Snapshot") : t("Retake")}
                      </button>
                      <div className="h-4 w-[1px] bg-white/10" />
                    </>
                  )}
                  <span className="text-white font-bold text-sm md:text-base flex items-center gap-2">
                    <Sparkles size={18} className="text-blue-400 animate-pulse" />
                     {t("Seamless Texture & Tiling Editor")} </span>
                </div>
                <button onClick={stopCamera} className="text-zinc-400 hover:text-white p-2 hover:bg-white/5 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8 items-stretch flex-1 overflow-y-auto md:overflow-hidden pr-1 min-h-0">
                {/* Left Column: Interactive Crop Box on Raw Image */}
                <div className="flex flex-col gap-3 h-full overflow-y-auto pr-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] md:text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckSquare size={14} className="text-blue-500" />
                       {t("1. Adjust Tiling Area & Perspective")} </span>
                  </div>

                  {/* Mode Selector */}
                  <div className="flex bg-zinc-950/60 border border-white/5 p-1 rounded-xl shrink-0">
                    <button
                      onClick={() => setCropWarpMode("perspective")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs rounded-lg transition-all ${cropWarpMode === "perspective" ? "bg-yellow-500 text-zinc-950 font-extrabold shadow" : "text-zinc-400 hover:text-zinc-200"}`}
                    >
                      <Sliders size={13} />
                       {t("Perspective Warp (Substance)")} </button>
                    <button
                      onClick={() => setCropWarpMode("square")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs rounded-lg transition-all ${cropWarpMode === "square" ? "bg-yellow-500 text-zinc-950 font-extrabold shadow" : "text-zinc-400 hover:text-zinc-200"}`}
                    >
                      <Square size={13} />
                       {t("Square Crop (Fixed)")} </button>
                  </div>

                  <div 
                    ref={cropContainerRef}
                    onPointerMove={handleCropPointerMove}
                    onPointerUp={handleCropPointerUp}
                    onPointerLeave={handleCropPointerUp}
                    className="relative aspect-square w-full bg-zinc-900 rounded-xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center touch-none select-none"
                  >
                    <img
                      src={capturedTempImage}
                      alt={t("Captured snapshot")}
                      className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none opacity-95"
                    />
                    
                    {/* SVG Vector Mask and Grid Overlay */}
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none z-10">
                      <defs>
                        <mask id="crop-mask">
                          <rect x="0" y="0" width="100" height="100" fill="white" />
                          <polygon
                            points={`${cornerTL.x},${cornerTL.y} ${cornerTR.x},${cornerTR.y} ${cornerBR.x},${cornerBR.y} ${cornerBL.x},${cornerBL.y}`}
                            fill="black"
                          />
                        </mask>
                      </defs>
                      
                      {/* Dark Overlay Mask */}
                      <rect x="0" y="0" width="100" height="100" fill="rgba(0, 0, 0, 0.75)" mask="url(#crop-mask)" className="pointer-events-auto" />
                      
                      {/* Active Path Border */}
                      <polygon
                        points={`${cornerTL.x},${cornerTL.y} ${cornerTR.x},${cornerTR.y} ${cornerBR.x},${cornerBR.y} ${cornerBL.x},${cornerBL.y}`}
                        fill="rgba(250, 204, 21, 0.04)"
                        stroke="#fbbf24"
                        strokeWidth="0.8"
                        strokeDasharray="1.5 1.2"
                        className="cursor-move pointer-events-auto"
                        onPointerDown={(e) => handleCropPointerDown(e, "move")}
                      />
                      
                      {/* Grid Lines inside custom Quad */}
                      {/* Horizontal Grid Line 1 */}
                      <line
                        x1={cornerTL.x + (cornerBL.x - cornerTL.x) / 3}
                        y1={cornerTL.y + (cornerBL.y - cornerTL.y) / 3}
                        x2={cornerTR.x + (cornerBR.x - cornerTR.x) / 3}
                        y2={cornerTR.y + (cornerBR.y - cornerTR.y) / 3}
                        stroke="#fbbf24"
                        strokeWidth="0.3"
                        opacity="0.3"
                      />
                      {/* Horizontal Grid Line 2 */}
                      <line
                        x1={cornerTL.x + 2 * (cornerBL.x - cornerTL.x) / 3}
                        y1={cornerTL.y + 2 * (cornerBL.y - cornerTL.y) / 3}
                        x2={cornerTR.x + 2 * (cornerBR.x - cornerTR.x) / 3}
                        y2={cornerTR.y + 2 * (cornerBR.y - cornerTR.y) / 3}
                        stroke="#fbbf24"
                        strokeWidth="0.3"
                        opacity="0.3"
                      />
                      {/* Vertical Grid Line 1 */}
                      <line
                        x1={cornerTL.x + (cornerTR.x - cornerTL.x) / 3}
                        y1={cornerTL.y + (cornerTR.y - cornerTL.y) / 3}
                        x2={cornerBL.x + (cornerBR.x - cornerBL.x) / 3}
                        y2={cornerBL.y + (cornerBR.y - cornerBL.y) / 3}
                        stroke="#fbbf24"
                        strokeWidth="0.3"
                        opacity="0.3"
                      />
                      {/* Vertical Grid Line 2 */}
                      <line
                        x1={cornerTL.x + 2 * (cornerTR.x - cornerTL.x) / 3}
                        y1={cornerTL.y + 2 * (cornerTR.y - cornerTL.y) / 3}
                        x2={cornerBL.x + 2 * (cornerBR.x - cornerBL.x) / 3}
                        y2={cornerBL.y + 2 * (cornerBR.y - cornerBL.y) / 3}
                        stroke="#fbbf24"
                        strokeWidth="0.3"
                        opacity="0.3"
                      />
                    </svg>
                    
                    {/* Interactive Drag Handles */}
                    {/* Top Left */}
                    <div
                      onPointerDown={(e) => handleCropPointerDown(e, "tl")}
                      style={{ left: `${cornerTL.x}%`, top: `${cornerTL.y}%` }}
                      className="absolute w-6 h-6 -ml-3 -mt-3 bg-yellow-400 hover:bg-yellow-300 active:scale-125 transition-transform border-2 border-zinc-950 rounded-full shadow-lg cursor-nwse-resize z-20 flex items-center justify-center touch-none"
                      title={t("Drag corner")}
                    >
                      <div className="w-1.5 h-1.5 bg-zinc-950 rounded-full" />
                    </div>

                    {/* Top Right */}
                    <div
                      onPointerDown={(e) => handleCropPointerDown(e, "tr")}
                      style={{ left: `${cornerTR.x}%`, top: `${cornerTR.y}%` }}
                      className="absolute w-6 h-6 -ml-3 -mt-3 bg-yellow-400 hover:bg-yellow-300 active:scale-125 transition-transform border-2 border-zinc-950 rounded-full shadow-lg cursor-nesw-resize z-20 flex items-center justify-center touch-none"
                      title={t("Drag corner")}
                    >
                      <div className="w-1.5 h-1.5 bg-zinc-950 rounded-full" />
                    </div>

                    {/* Bottom Right */}
                    <div
                      onPointerDown={(e) => handleCropPointerDown(e, "br")}
                      style={{ left: `${cornerBR.x}%`, top: `${cornerBR.y}%` }}
                      className="absolute w-6 h-6 -ml-3 -mt-3 bg-yellow-400 hover:bg-yellow-300 active:scale-125 transition-transform border-2 border-zinc-950 rounded-full shadow-lg cursor-nwse-resize z-20 flex items-center justify-center touch-none"
                      title={t("Drag corner")}
                    >
                      <div className="w-1.5 h-1.5 bg-zinc-950 rounded-full" />
                    </div>

                    {/* Bottom Left */}
                    <div
                      onPointerDown={(e) => handleCropPointerDown(e, "bl")}
                      style={{ left: `${cornerBL.x}%`, top: `${cornerBL.y}%` }}
                      className="absolute w-6 h-6 -ml-3 -mt-3 bg-yellow-400 hover:bg-yellow-300 active:scale-125 transition-transform border-2 border-zinc-950 rounded-full shadow-lg cursor-nesw-resize z-20 flex items-center justify-center touch-none"
                      title={t("Drag corner")}
                    >
                      <div className="w-1.5 h-1.5 bg-zinc-950 rounded-full" />
                    </div>

                    <span className="bg-yellow-400 text-zinc-950 text-[9px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded absolute bottom-2 right-2 select-none pointer-events-none z-20 shadow">
                      {cropWarpMode === "perspective" ? t("Perspective Warp Active") : t("{0}% Tile Area", [cropSize])}
                    </span>
                  </div>

                  <span className="text-[10px] text-zinc-500 text-center italic">
                    {cropWarpMode === "perspective" ? t("Drag 4 corners to fit angled tiles. Bilinear interpolation will flatten it perfectly.") : t("Drag the highlighted square area to crop your seamless texture base.")}
                  </span>
                </div>

                {/* Right Column: Live 3x3 Repeat Preview & Controls */}
                <div className="flex flex-col gap-4 bg-zinc-950/40 border border-white/5 p-3.5 md:p-4 rounded-2xl h-full overflow-y-auto justify-between min-h-0 pr-1.5">
                  {/* Live Tiling Preview Header */}
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] md:text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Repeat size={14} className="text-green-500" />
                         {t("2. Live 3x3 Tiling Preview")} </span>
                      <span className="text-[11px] text-zinc-500">
                         {t("Check how the seams align when repeated across surfaces.")} </span>
                    </div>

                    {/* 3x3 background-repeat box */}
                    <div className="relative aspect-square w-full max-w-[180px] md:max-w-[260px] lg:max-w-[280px] xl:max-w-[320px] mx-auto bg-zinc-950 rounded-xl overflow-hidden border border-white/15 shadow-2xl">
                      {processedTextureUrl ? (
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundImage: `url(${processedTextureUrl})`,
                            backgroundRepeat: "repeat",
                            backgroundSize: "33.33% 33.33%",
                          }}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-xs font-mono">
                          <Loader2 className="animate-spin text-zinc-500" size={18} />  {t("Processing...")} </div>
                      )}
                      
                      {/* Thin cross grid to emphasize the seam borders */}
                      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
                        <div className="border border-white/40"></div>
                        <div className="border border-white/40"></div>
                        <div className="border border-white/40"></div>
                        <div className="border border-white/40"></div>
                        <div className="border border-white/40"></div>
                        <div className="border border-white/40"></div>
                        <div className="border border-white/40"></div>
                        <div className="border border-white/40"></div>
                        <div className="border border-white/40"></div>
                      </div>
                    </div>
                  </div>

                  {/* Calibration Controls */}
                  <div className="space-y-3 pt-3 border-t border-white/10 flex-1">
                    {/* Mirror Mode Toggle */}
                    <div className="flex items-center justify-between p-2.5 bg-zinc-950/70 rounded-xl border border-white/5">
                      <div className="flex flex-col pr-2">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <CheckCircle size={13} className="text-blue-400" />
                           {t("Mirror Seamless Mode")} </span>
                        <span className="text-[10px] text-zinc-500">
                           {t("Flips tiles horizontally & vertically to guarantee perfect seams.")} </span>
                      </div>
                      <button
                        onClick={() => setMirrorMode(!mirrorMode)}
                        className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 shrink-0 ${mirrorMode ? "bg-blue-600" : "bg-zinc-800"}`}
                      >
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${mirrorMode ? "translate-x-4" : "translate-x-0"}`} />
                      </button>
                    </div>

                    {/* Edge Blending Slider (disabled if Mirror is on) */}
                    <div className={`space-y-1 p-2.5 rounded-xl border border-white/5 bg-zinc-950/40 transition-opacity duration-200 ${mirrorMode ? "opacity-30 pointer-events-none" : ""}`}>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
                          <Sliders size={13} className="text-purple-400" />
                           {t("Edge Feathering / Blend")} </span>
                        <span className="font-mono text-zinc-400 text-[11px]">{blendAmount}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="35"
                        step="1"
                        value={blendAmount}
                        onChange={(e) => setBlendAmount(Number(e.target.value))}
                        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      />
                      <span className="text-[9px] text-zinc-500 block">
                         {t("Cross-fades opposite borders to smooth out alignment seams.")} </span>
                    </div>

                    {/* Sliders for Crop Area / Perspective Info */}
                    {cropWarpMode === "square" ? (
                      <div className="space-y-3 p-3 rounded-xl border border-white/5 bg-zinc-950/40 animate-in fade-in duration-200">
                        {/* Crop Size */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-300 font-medium">{t("Crop Size")}</span>
                            <span className="font-mono text-zinc-400 text-[11px]">{cropSize}%</span>
                          </div>
                          <input
                            type="range"
                            min="20"
                            max="95"
                            step="1"
                            value={cropSize}
                            onChange={(e) => handleCropSizeChange(Number(e.target.value))}
                            className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                          />
                        </div>

                        {/* Position X */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-300 font-medium">{t("Move Horizontal")}</span>
                            <span className="font-mono text-zinc-400 text-[11px]">{cropX}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max={100 - cropSize}
                            step="1"
                            value={cropX}
                            onChange={(e) => handleCropXChange(Number(e.target.value))}
                            className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                          />
                        </div>

                        {/* Position Y */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-300 font-medium">{t("Move Vertical")}</span>
                            <span className="font-mono text-zinc-400 text-[11px]">{cropY}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max={100 - cropSize}
                            step="1"
                            value={cropY}
                            onChange={(e) => handleCropYChange(Number(e.target.value))}
                            className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-xl border border-yellow-500/10 bg-yellow-500/5 space-y-2 text-xs text-yellow-200/90 leading-relaxed animate-in fade-in duration-200">
                        <p className="font-bold text-yellow-400 flex items-center gap-1.5">
                          <Sparkles size={12} />
                           {t("Perspective Sampler Controls")} </p>
                        <p className="text-[11px] text-yellow-100/70">
                           {t("To map perspective surfaces (e.g. brick walls, textiles at an angle):")} </p>
                        <ul className="list-disc pl-4 space-y-1 text-[11px] text-yellow-100/60">
                          <li>{t("Drag the four corners to align with repeating patterns.")}</li>
                          <li>{t("Click & drag the center area to move the entire quad.")}</li>
                          <li>{t("Real-time bilinear warp renders a perfect 3D square.")}</li>
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Save Button */}
                  <div className="flex gap-3 pt-4 border-t border-white/10 shrink-0">
                    <button
                      onClick={() => {
                        if (editingMaterialId || isPBRMaterial) {
                          stopCamera();
                        } else {
                          setCapturedTempImage(null);
                          startCamera();
                        }
                      }}
                      className="flex-1 py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs uppercase tracking-wider transition-all"
                    >
                      {editingMaterialId || isPBRMaterial ? t("Cancel") : t("Discard & Retake")}
                    </button>
                    <button
                      onClick={async () => {
                        if (!processedTextureUrl) return;
                        const isEditing = !!editingMaterialId;
                        const matId = editingMaterialId || `cam-${Date.now()}`;
                        const matName = isEditing
                          ? (materials.find((m) => m.id === editingMaterialId)?.name || (isPBRMaterial ? `Seamless PBR Material` : `Seamless Material`))
                          : (isPBRMaterial ? `PBR Material ${new Date().toLocaleTimeString()}` : `Seamless Material ${new Date().toLocaleTimeString()}`);

                        setIsSavingMaterial(true);
                        try {
                          let maps: any = {};
                          if (isPBRMaterial) {
                            maps = await processPBRMaps(processedTextureUrl);
                          }

                          const newMat = {
                            id: matId,
                            name: matName,
                            color: "#ffffff",
                            roughness: isPBRMaterial ? 1.0 : 0.6,
                            metalness: 0.0,
                            type: "fabric" as const,
                            textureUrl: processedTextureUrl,
                            normalMapUrl: maps.normalMapUrl || undefined,
                            roughnessMapUrl: maps.roughnessMapUrl || undefined,
                            displacementMapUrl: maps.displacementMapUrl || undefined,
                            aoMapUrl: maps.aoMapUrl || undefined,
                            capturedTempImage,
                            cropWarpMode,
                            cornerTL: { ...cornerTL },
                            cornerTR: { ...cornerTR },
                            cornerBL: { ...cornerBL },
                            cornerBR: { ...cornerBR },
                            cropX,
                            cropY,
                            cropSize,
                            blendAmount,
                            mirrorMode,
                          };
                          addMaterial(newMat);
                          if (selectedPart && !isEditing) {
                            setMaterial(selectedPart, newMat.id);
                          }
                          stopCamera();
                        } catch (err) {
                          console.error("Failed to save and generate material:", err);
                        } finally {
                          setIsSavingMaterial(false);
                        }
                      }}
                      disabled={!processedTextureUrl || isSavingMaterial}
                      className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSavingMaterial ? (
                        <>
                          <Loader2 className="animate-spin" size={14} />
                           {t("Generating PBR...")} </>
                      ) : editingMaterialId ? (
                        "Save Changes"
                      ) : (
                        "Save & Apply"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* --- ACTIVE CAMERA SNAPSHOT VIEW --- */
            <>
              <div className="flex justify-between items-center p-4 bg-black/50 absolute top-0 w-full z-10">
                <span className="text-white font-medium">
                   {t("Capture Texture (1:1)")} </span>
                <button onClick={stopCamera} className="text-white p-2">
                  <X size={24} />
                </button>
              </div>

              {/* Square Viewport */}
              <div className="relative w-full max-w-md aspect-square bg-black overflow-hidden border-2 border-white/20 rounded-lg shadow-2xl mx-4">
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
                     {t("Snapshot")} </span>
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
                     {t("Live Mode")} </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {showHelp && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-auto p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl max-w-lg w-full shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <HelpCircle size={20} className="text-blue-500" />
                 {t("Asset Specifications")} </h3>
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
                   {t("Supported File Formats")} </h4>
                <div className="flex gap-2 mb-2">
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded border border-blue-500/30 font-mono">
                     {t(".GLB")} </span>
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded border border-blue-500/30 font-mono">
                     {t(".GLTF")} </span>
                  <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded border-orange-500/30 font-mono">
                     {t(".OBJ")} </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                   {t("We recommend")} <strong>{t(".GLB")}</strong>  {t("for best performance.")}{" "}
                  <br />
                  <br />
                   {t("If using")} <strong>{t(".GLTF")}</strong>  {t("or")} <strong>{t(".OBJ")}</strong>{t(", please select")} <strong>{t("ALL")}</strong>  {t("files (including .bin and textures) at once when uploading.")} </p>
              </div>
            </div>
            <div className="p-4 bg-zinc-950 border-t border-white/10 text-center">
              <button
                onClick={toggleHelp}
                className="bg-white text-black px-6 py-2 rounded-full text-sm font-medium hover:bg-zinc-200 transition-colors"
              >
                 {t("Got it")} </button>
            </div>
          </div>
        </div>
      )}

      {/* FIREBASE AUTH MODAL */}
      {authModalOpen && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center pointer-events-auto p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl max-w-md w-full shadow-2xl flex flex-col overflow-hidden transform scale-100 transition-all">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-indigo-400" />
                <h3 className="text-white font-bold text-lg">
                  {authMode === "login" ? t("Admin Authentication") : t("Create Admin Account")}
                </h3>
              </div>
              <button
                onClick={() => setAuthModalOpen(false)}
                className="text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-full transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setAuthError("");
                setAuthLoading(true);
                try {
                  if (authMode === "login") {
                    await signInWithEmailAndPassword(authEmail, authPassword);
                  } else {
                    await createUserWithEmailAndPassword(authEmail, authPassword);
                  }
                  setAuthModalOpen(false);
                  setAuthEmail("");
                  setAuthPassword("");
                } catch (err: any) {
                  console.error(err);
                  setAuthError(err.message || "Authentication failed. Please verify your credentials.");
                } finally {
                  setAuthLoading(false);
                }
              }}
              className="p-6 space-y-4"
            >
              {authError && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold leading-relaxed">
                  {t(authError)}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t("Email Address")}</label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder={t("e.g. kitoruyasiru@gmail.com")}
                  className="w-full bg-zinc-950 border border-white/10 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t("Password")}</label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950 border border-white/10 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {authLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : authMode === "login" ? (
                    "Sign In"
                  ) : (
                    "Create Account"
                  )}
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === "login" ? "signup" : "login");
                    setAuthError("");
                  }}
                  className="text-xs text-zinc-400 hover:text-white hover:underline transition-colors"
                >
                  {authMode === "login" ? t("Need an account? Sign up") : t("Already have an account? Sign in")}
                </button>
              </div>
              
              <div className="text-[10px] text-zinc-500 text-center leading-relaxed border-t border-white/5 pt-4">
                 {t("Note: In order to access settings, log in using the designated admin email:")} <strong className="text-indigo-400">{t("kitoruyasiru@gmail.com")}</strong>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Studio identity and account share a row so they never overlap tools. */}
      <header className="relative z-[95] flex shrink-0 flex-wrap sm:flex-nowrap items-center justify-between gap-3 px-4 pt-4 pointer-events-none select-none">
      {/* Studio identity */}
      <div className="flex min-w-0 items-center pointer-events-auto">
        <div className="flex h-11 min-w-0 items-center gap-2.5 rounded-xl border border-white/10 bg-zinc-950/80 px-3 backdrop-blur-md shadow-lg">
          <div className={`h-2 w-2 shrink-0 rounded-full ${getThemeColorClass(saasConfig.themeColor).bg}`} />
          <span title={saasConfig.appName} className="truncate text-xs font-semibold tracking-tight text-zinc-100">
            {saasConfig.appName}
          </span>
          <span className="text-[9px] font-semibold text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/5 uppercase tracking-wider hidden xl:inline-block">
             {t("Active Tenant")} </span>
        </div>
      </div>

      {/* Account controls */}
      <div className="flex w-full sm:w-auto shrink-0 items-center justify-between sm:justify-end gap-2 pointer-events-auto">
        <LanguagePicker />
        {!user ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setAuthMode("login");
                setAuthError("");
                setAuthModalOpen(true);
              }}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 shadow-lg transition-all hover:scale-105 active:scale-95"
              title={t("Sign In")}
            >
              <LogIn size={13} className="text-indigo-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider">{t("Sign In")}</span>
            </button>
            <button
              onClick={() => {
                setAuthMode("signup");
                setAuthError("");
                setAuthModalOpen(true);
              }}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/30 shadow-lg transition-all hover:scale-105 active:scale-95"
              title={t("Sign Up")}
            >
              <UserPlus size={13} className="text-white" />
              <span className="text-[10px] font-bold uppercase tracking-wider">{t("Sign Up")}</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {(user.email === "kitoruyasiru@gmail.com" || user.email === "eggplosion") && (
              <button
                onClick={() => setAdminPanelOpen(true)}
                className="flex h-11 items-center gap-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/30 shadow-lg transition-colors"
                title={t("Open Admin Control Panel")}
              >
                <Sliders size={13} className="text-white" />
                <span className="hidden lg:inline text-[10px] font-bold uppercase tracking-wider">{t("Admin Panel")}</span>
              </button>
            )}
            
            <div className="flex h-11 items-center gap-2.5 px-3 rounded-xl bg-zinc-950/80 backdrop-blur-md border border-white/10 text-zinc-300 shadow-lg">
              <User size={12} className="shrink-0 text-zinc-400" />
              <div className="flex flex-col">
                <span title={user.email || undefined} className="max-w-[90px] sm:max-w-[180px] truncate text-[11px] font-medium leading-tight text-zinc-200">
                  {user.email}
                </span>
                {!(user.email === "kitoruyasiru@gmail.com" || user.email === "eggplosion") && userProfile?.trialExpiresAt && (
                  <span className={`mt-0.5 text-[9px] uppercase tracking-wide font-semibold ${Date.now() < userProfile.trialExpiresAt ? 'text-green-400' : 'text-red-400'}`}>
                    {Date.now() < userProfile.trialExpiresAt ? t("Trial ({0} days)", [Math.ceil((userProfile.trialExpiresAt - Date.now()) / (1000 * 60 * 60 * 24))]) : t("Trial Habis")}
                  </span>
                )}
              </div>
              <button
                onClick={async () => {
                  await signOut();
                  setAdminPanelOpen(false); // Close admin panel if open
                }}
                className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-l border-white/10 text-zinc-500 hover:bg-white/5 hover:text-red-400 transition-colors"
                title={t("Sign Out")}
              >
                <LogOut size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      </header>

      <AdminPanel />

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
           {t("by nkh")} </span>

        {/* LEFT PANEL */}
        <LeftPanel
          showLeftPanel={showLeftPanel}
          setShowLeftPanel={setShowLeftPanel}
        />

        <div className="flex-1" />

        {/* RIGHT PANEL */}
        <RightPanel
          activeTab={activeTab}
          showLeftPanel={showLeftPanel}
          onStartCamera={startCamera}
          onStopCamera={stopCamera}
          onEditMaterialCrop={handleEditMaterialCrop}
          onPBRImageReady={handlePBRImageReady}
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
              { id: "light", icon: Sun, label: "Light" },
            ];
            return items;
          })().map((tab) => (
            <button
              key={tab.id}
              aria-label={t(tab.label)}
              title={t(tab.label)}
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
                <span className="text-[9px] font-medium">{t(tab.label)}</span>
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
const LeftPanel = ({ showLeftPanel, setShowLeftPanel }: any) => {
  const isMobile = useStore((s) => s.isMobile);
  const recordingStatus = useStore((s) => s.recordingStatus);
  const customParts = useStore((s) => s.customParts);
  const currentModel = useStore((s) => s.currentModel);
  const user = useStore((s) => s.user);
  const isAdmin = !!(user && (user.email === "kitoruyasiru@gmail.com" || user.email === "eggplosion"));
  const effectiveModel = currentModel && !(currentModel.id === "demo-shoe" && !isAdmin) ? currentModel : null;

  const displayParts = React.useMemo(() => {
    if (!effectiveModel) return [];
    if (effectiveModel.id === "demo-shoe") return SHOE_PARTS;
    return customParts.map((id) => ({ id, name: id }));
  }, [effectiveModel, customParts]);
  const selectedPart = useStore((s) => s.selectedPart);
  const selectedParts = useStore((s) => s.selectedParts || []);
  const selectPart = useStore((s) => s.selectPart);
  const setMaterial = useStore((s) => s.setMaterial);
  const [draggedOverPartId, setDraggedOverPartId] = useState<string | null>(null);
  const toggleSelectPartMulti = useStore((s) => s.toggleSelectPartMulti);
  const clearSelectedParts = useStore((s) => s.clearSelectedParts);
  const setSelectedParts = useStore((s) => s.setSelectedParts);
  const showAnnotations = useStore((s) => s.showAnnotations);

  const partGroups = useStore((s) => s.partGroups || {});
  const groupPart = useStore((s) => s.groupPart);
  const groupParts = useStore((s) => s.groupParts);
  const releasePartFromGroup = useStore((s) => s.releasePartFromGroup);
  const ungroupGroup = useStore((s) => s.ungroupGroup);
  const toggleExploded = useStore((s) => s.toggleExploded);
  const toggleFloor = useStore((s) => s.toggleFloor);
  const triggerFitView = useStore((s) => s.triggerFitView);
  const singlePart = useStore((s) => s.singlePart);
  const hidePart = useStore((s) => s.hidePart);
  const showAllParts = useStore((s) => s.showAllParts);
  const partVisibility = useStore((s) => s.partVisibility);
  const togglePartVisibility = useStore((s) => s.togglePartVisibility);
  const setShowLeftPanelRef = useRef(setShowLeftPanel);
  useEffect(() => {
    setShowLeftPanelRef.current = setShowLeftPanel;
  }, [setShowLeftPanel]);

  const selectedPartGroup = React.useMemo(() => {
    if (!selectedPart) return null;
    return Object.entries(partGroups).find(([_, parts]) => parts.includes(selectedPart))?.[0] || null;
  }, [selectedPart, partGroups]);

  const [groupInput, setGroupInput] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [editingGroupName, setEditingGroupName] = useState<string | null>(null);
  const [editGroupNameInput, setEditGroupNameInput] = useState("");
  const renameGroup = useStore((s) => s.renameGroup);

  const handleRenameGroupSubmit = (oldName: string) => {
    const trimmed = editGroupNameInput.trim();
    if (trimmed && trimmed !== oldName) {
      renameGroup(oldName, trimmed);
    }
    setEditingGroupName(null);
  };

  // Keyboard shortcut listener for Ctrl+G / Cmd+G
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if typing in an input
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) return;

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      if (isCtrlOrMeta && e.key.toLowerCase() === "g") {
        const partsToGroup = selectedParts.length > 0 ? selectedParts : (selectedPart ? [selectedPart] : []);
        if (partsToGroup.length > 0) {
          e.preventDefault();
          let groupIndex = Object.keys(partGroups).length + 1;
          let groupName = `Group ${groupIndex}`;
          while (partGroups[groupName]) {
            groupIndex++;
            groupName = `Group ${groupIndex}`;
          }
          groupParts(partsToGroup, groupName);
          clearSelectedParts();
        }
      } else if (isCtrlOrMeta && e.key.toLowerCase() === "u") {
        e.preventDefault();
        // Ungroup
        if (selectedPart) {
          const group = Object.entries(partGroups).find(([_, parts]) => parts.includes(selectedPart))?.[0];
          if (group) ungroupGroup(group);
        }
      } else if (e.key.toLowerCase() === "h") {
        if (e.shiftKey) {
          showAllParts();
        } else if (e.ctrlKey || e.metaKey) {
          hidePart();
        } else {
          singlePart();
        }
      } else if (e.key.toLowerCase() === "e") {
        toggleExploded();
      } else if (e.key.toLowerCase() === "f") {
        toggleFloor();
      } else if (e.key.toLowerCase() === "v") {
        triggerFitView(true);
      } else if (e.key.toLowerCase() === "l") {
        setShowLeftPanelRef.current((prev: boolean) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedParts, selectedPart, partGroups, groupParts, clearSelectedParts, ungroupGroup, toggleExploded, toggleFloor, triggerFitView, singlePart, hidePart, showAllParts]);

  // Construct structured hierarchy of parts
  const { groupedPartsMap, ungroupedParts } = React.useMemo(() => {
    const groupedMap: Record<string, typeof displayParts> = {};
    const ungrouped: typeof displayParts = [];

    Object.keys(partGroups).forEach((groupName) => {
      groupedMap[groupName] = [];
    });

    displayParts.forEach((part) => {
      const parentGroup = Object.entries(partGroups).find(([_, parts]) => parts.includes(part.id))?.[0];
      if (parentGroup) {
        if (!groupedMap[parentGroup]) {
          groupedMap[parentGroup] = [];
        }
        groupedMap[parentGroup].push(part);
      } else {
        ungrouped.push(part);
      }
    });

    return { groupedPartsMap: groupedMap, ungroupedParts: ungrouped };
  }, [displayParts, partGroups]);

  const toggleGroupCollapse = (groupName: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const handleGroupClick = (groupName: string, e: React.MouseEvent) => {
    const partsInGroup = groupedPartsMap[groupName] || [];
    const memberIds = partsInGroup.map((p) => p.id);
    if (memberIds.length === 0) return;

    if (e.shiftKey) {
      e.preventDefault();
      // Toggle selection for all members of the group
      const allSelected = memberIds.every((id) => selectedParts.includes(id));
      let newSelected: string[];
      if (allSelected) {
        newSelected = selectedParts.filter((id) => !memberIds.includes(id));
      } else {
        newSelected = Array.from(new Set([...selectedParts, ...memberIds]));
      }
      setSelectedParts(newSelected);
      if (newSelected.length > 0) {
        selectPart(newSelected[newSelected.length - 1]);
      } else {
        selectPart(null);
      }
    } else {
      // Standard group click: select all group parts and highlight first one
      setSelectedParts([...memberIds]);
      selectPart(memberIds[0]);
    }
  };

  const handlePartClick = (partId: string, e: React.MouseEvent) => {
    if (e.shiftKey) {
      e.preventDefault();
      if (selectedParts.length === 0 || !selectedPart) {
        toggleSelectPartMulti(partId);
      } else {
        const lastIdx = displayParts.findIndex((p) => p.id === selectedPart);
        const currentIdx = displayParts.findIndex((p) => p.id === partId);
        if (lastIdx !== -1 && currentIdx !== -1) {
          const start = Math.min(lastIdx, currentIdx);
          const end = Math.max(lastIdx, currentIdx);
          const rangeIds = displayParts.slice(start, end + 1).map((p) => p.id);
          const newSelection = Array.from(new Set([...selectedParts, ...rangeIds]));
          setSelectedParts(newSelection);
        } else {
          toggleSelectPartMulti(partId);
        }
      }
    } else {
      selectPart(selectedPart === partId ? null : partId);
      setSelectedParts(selectedPart === partId ? [] : [partId]);
    }
  };

  const handleGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart || !groupInput.trim()) return;
    groupPart(selectedPart, groupInput.trim());
    setGroupInput("");
  };

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
            <Layers size={14} />  {t("Layers")} </h3>
        </div>
        
        <div className="overflow-y-auto custom-scrollbar p-2 space-y-1 max-h-[350px] flex-1">
          {/* 1. Grouped Sections */}
          {Object.entries(groupedPartsMap).map(([groupName, parts]) => {
            if (parts.length === 0) return null;

            const isCollapsed = !!collapsedGroups[groupName];
            const memberIds = parts.map((p) => p.id);
            const isGroupFullySelected = memberIds.length > 0 && memberIds.every((id) => selectedParts.includes(id));
            const isGroupPartiallySelected = memberIds.some((id) => selectedParts.includes(id)) && !isGroupFullySelected;

            return (
              <div key={groupName} className="space-y-0.5">
                {/* Group Folder Row */}
                <div
                  onClick={(e) => handleGroupClick(groupName, e)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingGroupName(groupName);
                    setEditGroupNameInput(groupName);
                  }}
                  className={`group flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-semibold cursor-pointer select-none transition-all border ${
                    isGroupFullySelected
                      ? "bg-indigo-600/25 text-white border-indigo-500/40"
                      : isGroupPartiallySelected
                      ? "bg-indigo-600/10 text-zinc-200 border-indigo-500/20"
                      : "text-zinc-400 hover:text-white hover:bg-white/5 border-transparent"
                  }`}
                  title={t("Double-click to rename group")}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {/* Expand/Collapse Chevron */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleGroupCollapse(groupName);
                      }}
                      className="p-0.5 hover:bg-white/10 rounded transition-colors text-zinc-500 hover:text-zinc-300 cursor-pointer"
                    >
                      {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                    </button>
                    {/* Folder Icon */}
                    <span className="text-indigo-400 shrink-0">
                      {isCollapsed ? <Folder size={12} /> : <FolderOpen size={12} />}
                    </span>
                    {editingGroupName === groupName ? (
                      <input
                        type="text"
                        value={editGroupNameInput}
                        onChange={(e) => setEditGroupNameInput(e.target.value)}
                        onBlur={() => handleRenameGroupSubmit(groupName)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleRenameGroupSubmit(groupName);
                          } else if (e.key === "Escape") {
                            setEditingGroupName(null);
                          }
                        }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => e.stopPropagation()}
                        className="flex-1 bg-black/60 border border-indigo-500/50 rounded px-1.5 py-0.5 text-[11px] text-white focus:outline-none min-w-0"
                      />
                    ) : (
                      <span className="truncate flex-1">{groupName}</span>
                    )}
                    <span className="text-[9px] font-mono text-zinc-500 px-1 bg-black/30 rounded shrink-0">
                      {parts.length}
                    </span>
                  </div>
                </div>

                {/* Indented Children List */}
                {!isCollapsed && (
                  <div className="pl-3 border-l border-white/5 ml-3 space-y-0.5 my-0.5">
                    {parts.map((part) => {
                      const isPartSelected = selectedPart === part.id;
                      const isPartMultiSelected = selectedParts.includes(part.id);
                      const isDraggedOver = draggedOverPartId === part.id;

                      return (
                        <div
                          key={part.id}
                          onClick={(e) => handlePartClick(part.id, e)}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDraggedOverPartId(part.id);
                          }}
                          onDragLeave={() => {
                            setDraggedOverPartId(null);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDraggedOverPartId(null);
                            const materialId = e.dataTransfer.getData("text/plain");
                            if (materialId) {
                              setMaterial(part.id, materialId);
                            }
                          }}
                          className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium cursor-pointer select-none transition-all border ${
                            isDraggedOver
                              ? "bg-blue-600/30 text-white border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] scale-[1.02]"
                              : isPartSelected
                              ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20 border-transparent"
                              : isPartMultiSelected
                              ? "bg-blue-600/30 text-blue-200 border-blue-500/25 border"
                              : "text-zinc-400 hover:text-white hover:bg-white/5 border-transparent"
                          } ${partVisibility[part.id] === false ? "opacity-50" : ""}`}
                        >
                          <Layers
                            size={10}
                            className={`${isPartSelected ? "text-white" : isPartMultiSelected ? "text-blue-300" : "text-zinc-500"}`}
                          />
                          <span className="truncate flex-1" title={part.name}>
                            {part.name}
                          </span>
                          {isPartSelected && <CheckCircle size={10} className="text-white/80 shrink-0 ml-1" />}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePartVisibility(part.id);
                            }}
                            className={`p-1 hover:bg-white/10 rounded transition-colors cursor-pointer shrink-0 ml-1 ${
                              partVisibility[part.id] === false 
                                ? "text-zinc-500 hover:text-zinc-300" 
                                : isPartSelected 
                                ? "text-white/80 hover:text-white" 
                                : "text-zinc-400 hover:text-white"
                            }`}
                          >
                            {partVisibility[part.id] === false ? <EyeOff size={11} /> : <Eye size={11} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* 2. Ungrouped Root Parts */}
          {ungroupedParts.length > 0 && (
            <div className="space-y-0.5 pt-1">
              {ungroupedParts.map((part) => {
                const isPartSelected = selectedPart === part.id;
                const isPartMultiSelected = selectedParts.includes(part.id);
                const isDraggedOver = draggedOverPartId === part.id;

                return (
                  <div
                    key={part.id}
                    onClick={(e) => handlePartClick(part.id, e)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDraggedOverPartId(part.id);
                    }}
                    onDragLeave={() => {
                      setDraggedOverPartId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDraggedOverPartId(null);
                      const materialId = e.dataTransfer.getData("text/plain");
                      if (materialId) {
                        setMaterial(part.id, materialId);
                      }
                    }}
                    className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium cursor-pointer select-none transition-all border ${
                      isDraggedOver
                        ? "bg-blue-600/30 text-white border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] scale-[1.02]"
                        : isPartSelected
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20 border-transparent"
                        : isPartMultiSelected
                        ? "bg-blue-600/30 text-blue-200 border-blue-500/25 border"
                        : "text-zinc-400 hover:text-white hover:bg-white/10 border-transparent"
                    } ${partVisibility[part.id] === false ? "opacity-50" : ""}`}
                  >
                    <Layers
                      size={10}
                      className={`${isPartSelected ? "text-white" : isPartMultiSelected ? "text-blue-300" : "text-zinc-500"}`}
                    />
                    <span className="truncate flex-1" title={part.name}>
                      {part.name}
                    </span>
                    {isPartSelected && <CheckCircle size={10} className="text-white/80 shrink-0 ml-1" />}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePartVisibility(part.id);
                      }}
                      className={`p-1 hover:bg-white/10 rounded transition-colors cursor-pointer shrink-0 ml-1 ${
                        partVisibility[part.id] === false 
                          ? "text-zinc-500 hover:text-zinc-300" 
                          : isPartSelected 
                          ? "text-white/80 hover:text-white" 
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      {partVisibility[part.id] === false ? <EyeOff size={11} /> : <Eye size={11} />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Group Controls at Bottom */}
        <div className="p-2 border-t border-white/5 bg-white/5 shrink-0">
          {selectedParts.length > 1 ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block">
                   {t("Group")} {selectedParts.length}  {t("Parts")} </span>
                <span className="text-[8px] font-mono text-zinc-500 bg-black/40 px-1 py-0.5 rounded border border-white/5">
                   {t("Ctrl+G")} </span>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!groupInput.trim()) return;
                  groupParts(selectedParts, groupInput.trim());
                  setGroupInput("");
                }}
                className="flex gap-1 px-1"
              >
                <input
                  type="text"
                  value={groupInput}
                  onChange={(e) => setGroupInput(e.target.value)}
                  placeholder={t("Group name... (Press Enter)")}
                  className="flex-1 bg-black/40 border border-white/10 rounded px-1.5 py-1 text-[10px] text-white focus:outline-none focus:border-blue-500/50 min-w-0"
                />
              </form>
              <button
                onClick={() => clearSelectedParts()}
                className="w-full py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded text-[9px] font-medium transition-all cursor-pointer"
              >
                 {t("Clear Multi-Selection")} </button>
            </div>
          ) : selectedPart ? (
            <div className="space-y-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block px-1">
                 {t("Group Manager")} </span>

              {selectedPartGroup ? (
                <div className="space-y-1.5 px-1">
                  <div className="flex items-center justify-between bg-indigo-500/10 border border-indigo-500/20 rounded p-1.5 text-[10px] text-zinc-300">
                    <span className="truncate font-semibold text-indigo-300">{t("Group:")} {selectedPartGroup}</span>
                    <span className="text-[9px] text-zinc-500 font-mono">({partGroups[selectedPartGroup]?.length})</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => releasePartFromGroup(selectedPart)}
                      className="flex-1 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] font-medium flex items-center justify-center gap-1 transition-all cursor-pointer"
                      title={t("Release selected part from group")}
                    >
                      <Unlink size={10} />  {t("Release")} </button>
                    <button
                      onClick={() => ungroupGroup(selectedPartGroup)}
                      className="flex-1 py-1 bg-red-950/40 hover:bg-red-900/30 text-red-300 border border-red-900/20 rounded text-[10px] font-medium flex items-center justify-center gap-1 transition-all cursor-pointer"
                      title={t("Ungroup/dissolve this group entirely")}
                    >
                      <Trash2 size={10} />  {t("Ungroup")} </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleGroupSubmit} className="flex gap-1 px-1">
                  <input
                    type="text"
                    value={groupInput}
                    onChange={(e) => setGroupInput(e.target.value)}
                    placeholder={t("Group name... (Press Enter)")}
                    className="flex-1 bg-black/40 border border-white/10 rounded px-1.5 py-1 text-[10px] text-white focus:outline-none focus:border-blue-500/50 min-w-0"
                  />
                </form>
              )}
            </div>
          ) : (
            <div className="text-center py-2 text-[10px] text-zinc-500">
               {t("Shift+Click layers to multi-select")} </div>
          )}
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

const RightPanel = ({ activeTab, showLeftPanel, onStartCamera, onStopCamera, onEditMaterialCrop, onPBRImageReady }: any) => {
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
    resetEnvironmentSettings,
    modelCalibrations,
    updateModelCalibration,
    saasConfig,
    setAdminPanelOpen,
  } = useStore();

  const [showLibrary, setShowLibrary] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [customHex, setCustomHex] = useState("#ffffff");
  const [paletteSource, setPaletteSource] = useState("csi");
  const [colorSearch, setColorSearch] = useState("");
  const [colorLimit, setColorLimit] = useState(140);
  const [swatchInfo, setSwatchInfo] = useState("");
  const catalog = paletteSource === "csi" ? CSI_COLORS : PRESET_COLORS;
  const matchingColors = React.useMemo(() => catalog.filter(color => matchesColorSearch(color, colorSearch)), [catalog, colorSearch]);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );

  const assetInputRef = useRef<HTMLInputElement>(null);
  const materialInputRef = useRef<HTMLInputElement>(null);
  const pbrInputRef = useRef<HTMLInputElement>(null);
  const environmentInputRef = useRef<HTMLInputElement>(null);

  const user = useStore((s) => s.user);
  const userProfile = useStore((s) => s.userProfile);
  const isAdmin = !!(user && (user.email === "kitoruyasiru@gmail.com" || user.email === "eggplosion"));
  const effectiveModel = currentModel && !(currentModel.id === "demo-shoe" && !isAdmin) ? currentModel : null;

  const displayParts = React.useMemo(() => {
    if (!effectiveModel) return [];
    if (effectiveModel.id === "demo-shoe") return SHOE_PARTS;
    return useStore.getState().customParts.map((id) => ({ id, name: id }));
  }, [effectiveModel]);

  const handleAssetUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin && uploadedAssets.length >= 1) {
      alert(t("Akun Anda dibatasi hanya dapat mengunggah maksimal 1 model 3D (hapus model saat ini untuk mengunggah yang baru)."));
      if (e.target) e.target.value = '';
      return;
    }
    
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
        t("Please include the main 3D model file (.gltf, .glb, .obj, or .usdz) in your selection."),
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
    if (file && onPBRImageReady) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const dataUrl = event.target.result as string;
          onPBRImageReady(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    await generateFullDesign(prompt);
    setExpandedGroups((prev) => ({ ...prev, [prompt]: true }));
    setPrompt("");
  };

  const handleColorClick = (colorHex: string) => {
    if (!selectedPart) return;
    useStore.getState().setPartColor(selectedPart, colorHex);
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
        ${recordingStatus === "recording" || !showLeftPanel ? "opacity-0 pointer-events-none translate-x-10 invisible" : "opacity-100"}
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
            {activeTab === "dashboard" ? t("My Design Variants") : activeTab === "models" ? t("3D Library") : activeTab === "colors" ? t("Color Palette") : activeTab === "light" ? t("Environment") : selectedPart ? t("Editing: {0}", [displayParts.find((p) => p.id === selectedPart)?.name || selectedPart]) : t("Select a part")}
          </h3>
          <div className="flex gap-2 items-center">
            {activeTab === "dashboard" && savedVariants.length > 0 && (
              <div className="flex items-center gap-2">
                {isSelectionMode && (
                  <button
                    onClick={selectAllVariants}
                    className="text-[10px] text-blue-400 font-medium hover:text-blue-300"
                  >
                     {t("All")} </button>
                )}
                <button
                  onClick={() => setSelectionMode(!isSelectionMode)}
                  className={`text-white/50 hover:text-white transition-colors ${isSelectionMode ? "text-blue-500 hover:text-blue-400" : ""}`}
                  title={t("Toggle Selection Mode")}
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
                    title={t("Stop Live Camera")}
                  >
                    <StopCircle size={16} />
                  </button>
                ) : (
                  <button
                    onClick={onStartCamera}
                    className="text-white/50 hover:text-white transition-colors"
                    title={t("Capture/Live Texture")}
                  >
                    <Aperture size={16} />
                  </button>
                )}
                <button
                  onClick={() => materialInputRef.current?.click()}
                  className="text-white/50 hover:text-white transition-colors"
                  title={t("Quick Upload (Basic)")}
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
                     {t("No saved variants yet.")} </p>
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
                {isAdmin && (
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
                )}

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
                        if (confirm(t("Remove?"))) removeAsset(asset.id);
                      }}
                      className="p-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded transition-all flex items-center justify-center shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                {uploadedAssets.length === 0 && (
                  <div className="text-zinc-500 text-[10px] py-4 text-center">
                     {t("No custom 3D models imported yet.")} </div>
                )}
              </div>



              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  onClick={() => assetInputRef.current?.click()}
                  className="py-2 rounded-lg border border-dashed border-white/20 hover:border-white/50 hover:bg-white/5 flex items-center justify-center gap-2 text-[11px] font-medium text-zinc-300 transition-all cursor-pointer"
                >
                  <Plus size={14} className="text-zinc-400" />
                  <span>{t("Import Model")}</span>
                </button>

                <button
                  onClick={() => clearScene()}
                  className="py-2 rounded-lg border border-dashed border-red-500/20 hover:border-red-500/50 hover:bg-red-500/5 flex items-center justify-center gap-2 text-[11px] font-medium text-red-400/80 transition-all cursor-pointer"
                >
                  <Trash2 size={14} className="text-red-500/50" />
                  <span>{t("Clear Scene")}</span>
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
                  <Library size={14} />  {t("Material Library")} </button>
                 <button
                  onClick={() => {
                    if (!saasConfig.enabledFeatures.pbrGen) {
                      alert(t("Feature Locked: Smart PBR maps generation is disabled. Toggle it in the Control Panel!"));
                      setAdminPanelOpen(true);
                    } else {
                      pbrInputRef.current?.click();
                    }
                  }}
                  className={`flex-1 py-2 rounded-lg border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                    !saasConfig.enabledFeatures.pbrGen
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                      : "border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:text-indigo-200"
                  }`}
                >
                  {!saasConfig.enabledFeatures.pbrGen ? <Lock size={12} className="text-amber-400 animate-pulse" /> : <Wand2 size={14} />}
                   {t("Smart PBR")} </button>
              </div>

              {showLibrary ? (
                <AssetBrowser isEmbedded={true} />
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
                          <div className="absolute top-2 right-2 flex gap-1.5 z-20">
                            {!!mat.capturedTempImage && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onEditMaterialCrop(mat);
                                }}
                                className="p-2 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 rounded-full transition-all shadow-md backdrop-blur-sm opacity-80 hover:opacity-100 flex items-center justify-center cursor-pointer"
                                title={t("Edit Crop / Perspective Warp")}
                              >
                                <Sliders size={14} />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  removeMaterial(mat.id);
                              }}
                              className="p-2 bg-red-600 hover:bg-red-500 rounded-full text-white transition-all shadow-md backdrop-blur-sm opacity-80 hover:opacity-100 cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
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
                    placeholder={t("HEX")}
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
              <div className="flex items-center gap-2">
                <select aria-label={t("Color library")} value={paletteSource}
                  onChange={e => { setPaletteSource(e.target.value); setColorLimit(140); setSwatchInfo(""); }}
                  className="flex-1 min-w-0 rounded-md bg-zinc-800 border border-white/10 p-2 text-xs text-white">
                  <option value="csi">{t("CSI ColorWall")}</option>
                  <option value="basic">{t("Basic colors")}</option>
                </select>
                <span className="text-[10px] text-zinc-400">{matchingColors.length}  {t("colors")}</span>
              </div>
              <input type="search" aria-label={t("Search color name, family, code or HEX")} placeholder={t("Cari blue, merah, kode CSI / HEX…")}
                value={colorSearch} onChange={e => { setColorSearch(e.target.value); setColorLimit(140); }}
                className="w-full rounded-md bg-zinc-800 border border-white/10 px-3 py-2 text-xs text-white" />
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                <div className="grid grid-cols-7 gap-1.5">
                  {matchingColors.slice(0, colorLimit).map(col => (
                    <button type="button" key={col.name}
                      title={col.name + " · " + col.hex.toUpperCase()}
                      aria-label={col.name + " " + col.hex}
                      disabled={!selectedPart}
                      onMouseEnter={() => setSwatchInfo(col.name + " · " + col.hex.toUpperCase())}
                      onFocus={() => setSwatchInfo(col.name + " · " + col.hex.toUpperCase())}
                      onClick={() => { handleColorClick(col.hex); setCustomHex(col.hex); }}
                      className="aspect-square w-full rounded-sm border border-white/20 transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:cursor-not-allowed"
                      style={{ backgroundColor: col.hex }} />
                  ))}
                </div>
                {matchingColors.length === 0 && <p className="py-4 text-center text-xs text-zinc-400">{t("Warna tidak ditemukan.")}</p>}
                {matchingColors.length > colorLimit && (
                  <button type="button" onClick={() => setColorLimit(value => value + 140)}
                    className="mt-3 w-full rounded-md bg-white/10 py-2 text-xs text-white">{t("Tampilkan lebih banyak")}</button>
                )}
              </div>
              <p className="min-h-4 text-[10px] text-zinc-300 font-mono break-all" aria-live="polite">{swatchInfo || t("Arahkan mouse ke kotak untuk melihat kode warna.")}</p>
              {paletteSource === "csi" && (
                <p className="text-[10px] text-zinc-500">{t("CSI ColorWall · katalog digital 2021 · preview sRGB.")} {" "}<a href="https://csicolors.com/color-communication-tools/downloadable-digital-media/" target="_blank" rel="noreferrer" className="underline">{t("Sumber resmi")}</a>
                </p>
              )}
            </div>
          )}

          {activeTab === "light" && (
            <div className="flex flex-col gap-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                     {t("Lighting")} </h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={resetEnvironmentSettings}
                      className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                      title={t("Reset environment settings to default")}
                    >
                      <RotateCcw size={10} />  {t("Reset")} </button>
                    <button
                      onClick={() => environmentInputRef.current?.click()}
                      className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <Upload size={10} />  {t("Custom HDR/EXR")} </button>
                  </div>
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
                        {t(l.label)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Environment Brightness Slider */}
                <div className="bg-zinc-800/50 p-2 rounded-lg border border-white/5 space-y-2">
                  <SliderControl
                    label={t("Environment Brightness")}
                    value={environmentSettings.intensity}
                    min="0"
                    max="4"
                    step="0.01"
                    onChange={(v: number) =>
                      updateEnvironmentSettings({ intensity: v })
                    }
                  />
                  <SliderControl
                    label={t("Environment Rotation")}
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
                    label={t("Bloom Effect Intensity")}
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
                     {t("Advanced Rendering")} </div>

                  {/* Flat Studio Lights */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-zinc-200">{t("Virtual Lights")}</span>
                      <span className="text-[10px] text-zinc-500">{t("Enable flat directional & spot lights")}</span>
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
                      <span className="text-xs font-medium text-zinc-200">{t("Show HDRI Background")}</span>
                      <span className="text-[10px] text-zinc-500">{t("Toggle 360° environment panorama background")}</span>
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
                      <span className="text-xs font-medium text-zinc-200">{t("Wireframe Mode")}</span>
                      <span className="text-[10px] text-zinc-500">{t("Toggle technical wireframe grid overlay")}</span>
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
                      <span className="text-xs font-medium text-zinc-200">{t("Tone Mapping")}</span>
                      <span className="text-[10px] text-zinc-500 font-mono uppercase">{effectsSettings?.toneMapping || t("ACESFilmic")}</span>
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
                          {mode === 'ACESFilmic' ? t("ACES") : mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Post Processing */}
                  <div className="flex flex-col gap-1.5 pt-1.5 border-t border-white/5">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-zinc-200">{t("Post Processing")}</span>
                        <span className="text-[10px] text-zinc-500">{t("Bloom, grain, vignette, tilt-shift, AO")}</span>
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
                        <span className="text-xs font-medium text-zinc-200">{t("Ambient Occlusion (AO)")}</span>
                        <span className="text-[10px] text-zinc-500">{t("Realistic contact shadows")}</span>
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
                      label={t("Renderer Exposure")}
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
                       {t("Environment Calibration")} </span>
                  </div>
                  <div className="space-y-3">
                    <SliderControl
                      label={t("Rotation Y")}
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
                      label={t("Tilt X")}
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
                      label={t("Ground Height")}
                      value={environmentSettings.height}
                      min="0"
                      max="50"
                      step="0.5"
                      onChange={(v: number) =>
                        updateEnvironmentSettings({ height: v })
                      }
                    />
                    <SliderControl
                      label={t("Dome Radius")}
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

              <button
                onClick={resetEnvironmentSettings}
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 mt-2 transition-all cursor-pointer"
              >
                <RotateCcw size={14} />
                 {t("Reset Environment to Default")} </button>
            </div>
          )}

        </div>
      </div>

      {currentModel && currentModel.id !== "demo-shoe" && activeTab === "models" && (
        <CalibrationPanel
          currentModel={currentModel}
          modelCalibrations={modelCalibrations}
          updateModelCalibration={updateModelCalibration}
          isMobile={isMobile}
        />
      )}
    </div>
  );
};

const CalibrationPanel = ({
  currentModel,
  modelCalibrations,
  updateModelCalibration,
  isMobile
}: any) => {
  const [isOpen, setIsOpen] = useState(true);

  const calibration = modelCalibrations[currentModel.id] || {
    scale: 1.0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    positionX: 0,
    positionY: 0,
    positionZ: 0,
  };

  return (
    <div
      className={`bg-zinc-900/90 backdrop-blur-md border border-white/10 shadow-2xl pointer-events-auto transition-all duration-300 flex flex-col shrink-0 ${
        isMobile ? "rounded-xl mx-2" : "rounded-xl"
      }`}
    >
      {/* Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 text-left focus:outline-none cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <Sliders size={14} className="text-blue-400" />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-zinc-200">
               {t("Model Calibration")} </span>
            <span className="text-[9px] text-zinc-400 truncate max-w-[150px]">
               {t("Aligning:")} {currentModel.name}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateModelCalibration(currentModel.id, {
                scale: 1.0,
                rotationX: 0,
                rotationY: 0,
                rotationZ: 0,
                positionX: 0,
                positionY: 0,
                positionZ: 0,
              });
            }}
            className="p-1 text-zinc-400 hover:text-white hover:bg-white/5 rounded transition-all flex items-center gap-1 text-[9px]"
            title={t("Reset Calibration")}
          >
            <RotateCcw size={9} />
            <span>{t("Reset")}</span>
          </button>
          <div className="text-zinc-400 hover:text-white p-1">
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        </div>
      </div>

      {/* Content */}
      {isOpen && (
        <div className="p-3 pt-0 border-t border-white/5 flex flex-col gap-2.5 text-left animate-in fade-in duration-200">
          <span className="text-[10px] text-zinc-400 leading-relaxed">
             {t("Tune your model's placement and rotation so it aligns perfectly with the standard coordinate system and animations.")} </span>

          <div className="space-y-3 mt-1 pr-1">
            <SliderControl
              label={t("Scale Multiplier")}
              value={calibration.scale ?? 1.0}
              min="0.1"
              max="4.0"
              step="0.01"
              displayValue={`${((calibration.scale ?? 1.0) * 100).toFixed(0)}%`}
              onChange={(v: number) =>
                updateModelCalibration(currentModel.id, { scale: v })
              }
            />

            <div className="text-[11px] font-semibold text-zinc-400 border-t border-white/5 pt-2 flex items-center gap-1">
              <Move size={12} className="text-zinc-500" />  {t("Position Adjustments")} </div>

            <SliderControl
              label={t("Move X (Left / Right)")}
              value={calibration.positionX ?? 0.0}
              min="-3.0"
              max="3.0"
              step="0.02"
              displayValue={(calibration.positionX ?? 0.0).toFixed(2)}
              onChange={(v: number) =>
                updateModelCalibration(currentModel.id, { positionX: v })
              }
            />

            <SliderControl
              label={t("Move Y (Height / Elevation)")}
              value={calibration.positionY ?? 0.0}
              min="-3.0"
              max="3.0"
              step="0.02"
              displayValue={(calibration.positionY ?? 0.0).toFixed(2)}
              onChange={(v: number) =>
                updateModelCalibration(currentModel.id, { positionY: v })
              }
            />

            <SliderControl
              label={t("Move Z (Front / Back)")}
              value={calibration.positionZ ?? 0.0}
              min="-3.0"
              max="3.0"
              step="0.02"
              displayValue={(calibration.positionZ ?? 0.0).toFixed(2)}
              onChange={(v: number) =>
                updateModelCalibration(currentModel.id, { positionZ: v })
              }
            />

            <div className="text-[11px] font-semibold text-zinc-400 border-t border-white/5 pt-2 flex items-center gap-1">
              <RotateCw size={12} className="text-zinc-500" />  {t("Rotation Angles")} </div>

            <SliderControl
              label={t("Tilt X (Pitch)")}
              value={calibration.rotationX ?? 0.0}
              min={-Math.PI}
              max={Math.PI}
              step="0.02"
              displayValue={`${Math.round((calibration.rotationX ?? 0.0) * (180 / Math.PI))}°`}
              onChange={(v: number) =>
                updateModelCalibration(currentModel.id, { rotationX: v })
              }
            />

            <SliderControl
              label={t("Turn Y (Yaw)")}
              value={calibration.rotationY ?? 0.0}
              min={-Math.PI}
              max={Math.PI}
              step="0.02"
              displayValue={`${Math.round((calibration.rotationY ?? 0.0) * (180 / Math.PI))}°`}
              onChange={(v: number) =>
                updateModelCalibration(currentModel.id, { rotationY: v })
              }
            />

            <SliderControl
              label={t("Roll Z")}
              value={calibration.rotationZ ?? 0.0}
              min={-Math.PI}
              max={Math.PI}
              step="0.02"
              displayValue={`${Math.round((calibration.rotationZ ?? 0.0) * (180 / Math.PI))}°`}
              onChange={(v: number) =>
                updateModelCalibration(currentModel.id, { rotationZ: v })
              }
            />
          </div>
        </div>
      )}
    </div>
  );
};


// --- Camera Logic ---
