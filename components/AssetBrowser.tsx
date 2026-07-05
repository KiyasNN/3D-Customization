import React, { useState, useRef } from "react";
import { useStore } from "../store";
import { INITIAL_MATERIALS, MATERIAL_PRESETS } from "../constants";
import { 
  X, 
  Sparkles, 
  Upload, 
  Library, 
  Trash2, 
  Plus, 
  Loader2, 
  HelpCircle,
  FolderOpen as FolderIcon
} from "lucide-react";

interface AssetBrowserProps {
  showAssetBrowser?: boolean;
  setShowAssetBrowser?: (show: boolean) => void;
  isEmbedded?: boolean;
}

export const AssetBrowser: React.FC<AssetBrowserProps> = ({
  showAssetBrowser,
  setShowAssetBrowser,
  isEmbedded = false,
}) => {
  const isMobile = useStore((s) => s.isMobile);
  const materials = useStore((s) => s.materials) || [];
  const uploadMaterial = useStore((s) => s.uploadMaterial);
  const removeMaterial = useStore((s) => s.removeMaterial);
  const setMaterial = useStore((s) => s.setMaterial);
  const selectedPart = useStore((s) => s.selectedPart);
  const partMaterials = useStore((s) => s.partMaterials) || {};
  const isProcessingMaterial = useStore((s) => s.isProcessingMaterial);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"presets" | "uploaded" | "ai">("presets");
  const [isDraggingOverDropzone, setIsDraggingOverDropzone] = useState(false);

  if (!isEmbedded && !showAssetBrowser) return null;

  // Filter materials based on source
  const aiMaterials = materials.filter((m) => m.type === "ai-generated");
  const uploadedMaterials = materials.filter(
    (m) =>
      (m.id.startsWith("custom-") || m.id.startsWith("pbr-")) &&
      m.type !== "ai-generated"
  );
  
  // Combine all standard library presets (textured + solid/metallic)
  const presetMaterials = [
    ...INITIAL_MATERIALS,
    ...MATERIAL_PRESETS
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadMaterial(files[0]);
    }
  };

  const handleDragOverZone = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOverDropzone(true);
  };

  const handleDragLeaveZone = () => {
    setIsDraggingOverDropzone(false);
  };

  const handleDropZone = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOverDropzone(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      uploadMaterial(files[0]);
    }
  };

  const handleSelectMaterial = (matId: string) => {
    if (selectedPart) {
      setMaterial(selectedPart, matId);
    }
  };

  const activeMaterials = 
    activeTab === "ai" 
      ? aiMaterials 
      : activeTab === "uploaded" 
      ? uploadedMaterials 
      : presetMaterials;

  const content = (
    <>
      {/* Tabs */}
      <div className="flex border-b border-white/5 p-1 bg-black/20 gap-0.5 shrink-0">
        <button
          onClick={() => setActiveTab("presets")}
          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
            activeTab === "presets"
              ? "bg-blue-600/30 text-blue-400 border border-blue-500/20 font-bold"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Library size={11} /> Presets ({presetMaterials.length})
        </button>
        <button
          onClick={() => setActiveTab("uploaded")}
          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
            activeTab === "uploaded"
              ? "bg-blue-600/30 text-blue-400 border border-blue-500/20 font-bold"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Upload size={11} /> Uploads ({uploadedMaterials.length})
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
            activeTab === "ai"
              ? "bg-blue-600/30 text-blue-400 border border-blue-500/20 font-bold"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Sparkles size={11} /> AI Gen ({aiMaterials.length})
        </button>
      </div>

      {/* Upload Zone (Only for Uploads tab) */}
      {activeTab === "uploaded" && (
        <div className="p-2 shrink-0">
          <div
            onDragOver={handleDragOverZone}
            onDragLeave={handleDragLeaveZone}
            onDrop={handleDropZone}
            onClick={() => fileInputRef.current?.click()}
            className={`border border-dashed rounded-lg p-3 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1 bg-black/20 ${
              isDraggingOverDropzone
                ? "border-blue-500 bg-blue-500/5"
                : "border-white/10 hover:border-white/20 hover:bg-white/5"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            {isProcessingMaterial ? (
              <>
                <Loader2 size={16} className="text-blue-500 animate-spin" />
                <span className="text-[9px] font-medium text-zinc-400">Processing image...</span>
              </>
            ) : (
              <>
                <Upload size={16} className="text-zinc-400" />
                <span className="text-[10px] font-bold text-zinc-300">Upload Texture Image</span>
                <span className="text-[8px] text-zinc-500">Drag file here or click to browse</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Grid Content */}
      <div className={`flex-1 overflow-y-auto custom-scrollbar p-2 ${isEmbedded ? "max-h-[300px] min-h-[220px]" : ""}`}>
        {activeMaterials.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 py-8">
            {activeTab === "ai" ? (
              <>
                <Sparkles size={24} className="text-zinc-600 mb-2" />
                <p className="text-xs font-semibold text-zinc-400">No AI textures yet</p>
                <p className="text-[10px] text-zinc-500 max-w-[180px] mt-1">
                  Use the **AI Texture Generator** tab in the sidebar to generate custom designs.
                </p>
              </>
            ) : activeTab === "uploaded" ? (
              <>
                <Upload size={24} className="text-zinc-600 mb-2" />
                <p className="text-xs font-semibold text-zinc-400">No uploads yet</p>
                <p className="text-[10px] text-zinc-500 max-w-[180px] mt-1">
                  Drag & drop an image file or click above to upload custom shoe skins.
                </p>
              </>
            ) : (
              <>
                <Library size={24} className="text-zinc-600 mb-2" />
                <p className="text-xs font-semibold text-zinc-400">No preset textures</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 pb-2">
            {activeMaterials.map((mat) => {
              const isAppliedToSelected = selectedPart && partMaterials[selectedPart] === mat.id;
              
              return (
                <div
                  key={mat.id}
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", mat.id);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => handleSelectMaterial(mat.id)}
                  className={`group relative aspect-square rounded-lg overflow-hidden cursor-grab active:cursor-grabbing transition-all border ${
                    isAppliedToSelected 
                      ? "border-blue-500 ring-2 ring-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.3)]" 
                      : "border-white/5 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-900/10"
                  }`}
                  title={`${mat.name} - Drag to part, or select a layer and click to apply`}
                >
                  {/* Texture Preview */}
                  <div
                    className="absolute inset-0 bg-zinc-800 transition-transform duration-300 group-hover:scale-110"
                    style={{
                      backgroundColor: mat.color || "#ffffff",
                      backgroundImage: mat.textureUrl ? `url(${mat.textureUrl})` : "none",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                  
                  {/* Glass Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                  {/* Actions Overlay */}
                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    {/* Quick Apply */}
                    {selectedPart && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectMaterial(mat.id);
                        }}
                        className="p-1 bg-blue-600 hover:bg-blue-500 rounded text-white shadow transition-colors cursor-pointer"
                        title="Apply to selected part"
                      >
                        <Plus size={10} />
                      </button>
                    )}

                    {/* Delete Custom Material */}
                    {!INITIAL_MATERIALS.some((init) => init.id === mat.id) && !MATERIAL_PRESETS.some((init) => init.id === mat.id) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeMaterial(mat.id);
                        }}
                        className="p-1 bg-red-600 hover:bg-red-500 rounded text-white shadow transition-colors cursor-pointer"
                        title="Delete texture asset"
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>

                  {/* Name Tag */}
                  <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-zinc-950/40 backdrop-blur-[2px]">
                    <p className="text-[9px] font-semibold text-zinc-200 truncate group-hover:text-white">
                      {mat.name}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Guide Footer */}
      <div className="p-2 border-t border-white/5 bg-black/40 text-center shrink-0">
        <p className="text-[9px] text-zinc-500 flex items-center justify-center gap-1 font-medium">
          <HelpCircle size={10} className="text-zinc-500 animate-pulse" />
          <span>Drag texture to shoe or select layer & click</span>
        </p>
      </div>
    </>
  );

  if (isEmbedded) {
    return (
      <div className="flex flex-col border border-white/10 bg-zinc-900/40 rounded-xl overflow-hidden mt-1 mb-3 animate-in fade-in duration-200">
        {content}
      </div>
    );
  }

  return (
    <div
      className={`w-72 bg-zinc-900/90 backdrop-blur-md rounded-xl border border-white/10 flex flex-col shadow-2xl overflow-hidden pointer-events-auto h-[480px] shrink-0 animate-in slide-in-from-left duration-300 ${
        isMobile ? "w-64 h-[35vh]" : ""
      }`}
    >
      {/* Header */}
      <div className="p-3 border-b border-white/5 bg-white/5 backdrop-blur-xl flex justify-between items-center shrink-0">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
          <FolderIcon size={14} className="text-blue-400" /> Asset Browser
        </h3>
        {setShowAssetBrowser && (
          <button
            onClick={() => setShowAssetBrowser(false)}
            className="p-1 text-zinc-500 hover:text-white rounded-md hover:bg-white/5 transition-all cursor-pointer"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {content}
    </div>
  );
};
