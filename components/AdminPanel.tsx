import React, { useState, useEffect } from "react";
import { useStore } from "../store";
import { getAllUserProfiles, updateUserStatus, UserProfile } from "../services/firebase";
import {
  X,
  TrendingUp,
  Users,
  Layers,
  Percent,
  CheckCircle,
  AlertTriangle,
  Lock,
  Eye,
  Settings,
  Plus,
  Trash2,
  DollarSign,
  Briefcase,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Database,
  BarChart2,
  ShieldAlert,
  Globe,
  Sliders,
  Award,
  Search,
  Filter,
  UserCheck,
  UserX,
  Clock,
  ShieldCheck,
  RefreshCw
} from "lucide-react";

export const AdminPanel = () => {
  const isAdminPanelOpen = useStore((s) => s.isAdminPanelOpen);
  const setAdminPanelOpen = useStore((s) => s.setAdminPanelOpen);
  const user = useStore((s) => s.user);
  const saasConfig = useStore((s) => s.saasConfig);
  const updateSaasConfig = useStore((s) => s.updateSaasConfig);
  const toggleSaasFeature = useStore((s) => s.toggleSaasFeature);
  const addSaasTenant = useStore((s) => s.addSaasTenant);
  const deleteSaasTenant = useStore((s) => s.deleteSaasTenant);
  const materials = useStore((s) => s.materials);
  const addMaterial = useStore((s) => s.addMaterial);
  const removeMaterial = useStore((s) => s.removeMaterial);

  const [activeAdminTab, setActiveAdminTab] = useState<"dashboard" | "branding" | "tenants" | "materials" | "users">("dashboard");
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [profilesSearch, setProfilesSearch] = useState("");
  const [profilesFilter, setProfilesFilter] = useState<"all" | "pending" | "approved" | "blocked">("all");
  const [profileActionUid, setProfileActionUid] = useState<string | null>(null);

  const loadProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const data = await getAllUserProfiles();
      setProfiles(data);
    } catch (e) {
      console.error("Failed to load user profiles", e);
    } finally {
      setLoadingProfiles(false);
    }
  };

  useEffect(() => {
    if (isAdminPanelOpen) {
      loadProfiles();
    }
  }, [isAdminPanelOpen]);

  // Tenant Form State
  const [newTenantName, setNewTenantName] = useState("");
  const [newTenantTier, setNewTenantTier] = useState<"Free" | "Pro" | "Enterprise">("Pro");
  
  // Search / Filter States
  const [tenantSearch, setTenantSearch] = useState("");
  const [tenantFilter, setTenantFilter] = useState<"All" | "Free" | "Pro" | "Enterprise">("All");

  // Material Form State
  const [newMatName, setNewMatName] = useState("");
  const [newMatColor, setNewMatColor] = useState("#3b82f6");
  const [newMatRoughness, setNewMatRoughness] = useState(0.5);
  const [newMatMetalness, setNewMatMetalness] = useState(0.1);
  const [newMatType, setNewMatType] = useState("fabric");
  const [newMatTier, setNewMatTier] = useState<"Free" | "Premium">("Free");

  const handleUpdateStatus = async (uid: string, newStatus: 'approved' | 'blocked') => {
    setProfileActionUid(uid);
    try {
      await updateUserStatus(uid, newStatus);
      await loadProfiles();
    } catch (e) {
      console.error("Failed to update user status", e);
    } finally {
      setProfileActionUid(null);
    }
  };

  if (!isAdminPanelOpen) return null;

  // Security check: Only kitoruyasiru@gmail.com can access the admin panel
  if (!user || user.email !== "kitoruyasiru@gmail.com") {
    // Force close state asynchronously to avoid setting state during render phase
    setTimeout(() => setAdminPanelOpen(false), 0);
    return null;
  }

  // Filter tenants
  const filteredTenants = saasConfig.tenants.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(tenantSearch.toLowerCase());
    const matchesFilter = tenantFilter === "All" || t.tier === tenantFilter;
    return matchesSearch && matchesFilter;
  });

  const handleAddTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName.trim()) return;
    addSaasTenant({ name: newTenantName, tier: newTenantTier });
    setNewTenantName("");
  };

  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatName.trim()) return;
    const id = `mat-custom-${Date.now()}`;
    addMaterial({
      id,
      name: newMatName,
      color: newMatColor,
      roughness: newMatRoughness,
      metalness: newMatMetalness,
      type: newMatType,
      // We can attach custom property tags for SaaS pricing control
      isPremium: newMatTier === "Premium",
    } as any);
    setNewMatName("");
  };

  const themeColors = [
    { name: "Indigo Velvet", value: "indigo", bg: "bg-indigo-600", border: "border-indigo-400" },
    { name: "Ocean Blue", value: "blue", bg: "bg-blue-600", border: "border-blue-400" },
    { name: "Emerald Forest", value: "emerald", bg: "bg-emerald-600", border: "border-emerald-400" },
    { name: "Cyber Punk Purple", value: "purple", bg: "bg-purple-600", border: "border-purple-400" },
    { name: "Sunset Rose", value: "rose", bg: "bg-rose-600", border: "border-rose-400" },
  ];

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden pointer-events-auto select-none">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="p-5 border-b border-white/10 bg-zinc-950 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <Settings size={20} className="animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <h2 className="text-white text-base font-bold tracking-tight flex items-center gap-2">
                SaaS Admin Control Panel
                <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                  DEVELOPER / ADMIN MODE
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400 font-medium">
                Manage SaaS branding, toggle feature flags, configure premium material lockouts, and inspect client tenants.
              </p>
            </div>
          </div>
          <button
            onClick={() => setAdminPanelOpen(false)}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-all hover:scale-105"
          >
            <X size={16} />
          </button>
        </div>

        {/* INNER CONTENT CONTAINER */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* SIDEBAR NAVIGATION */}
          <div className="w-56 bg-zinc-950/50 border-r border-white/10 p-4 flex flex-col justify-between">
            <div className="space-y-1.5">
              <button
                onClick={() => setActiveAdminTab("dashboard")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  activeAdminTab === "dashboard"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <BarChart2 size={15} />
                SaaS Dashboard
              </button>
              <button
                onClick={() => setActiveAdminTab("branding")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  activeAdminTab === "branding"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Sliders size={15} />
                Branding & Features
              </button>
              <button
                onClick={() => setActiveAdminTab("tenants")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  activeAdminTab === "tenants"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Users size={15} />
                Tenant Manager
              </button>
              <button
                onClick={() => setActiveAdminTab("materials")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  activeAdminTab === "materials"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Layers size={15} />
                Materials & Tiers
              </button>
              <button
                onClick={() => setActiveAdminTab("users")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  activeAdminTab === "users"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck size={15} />
                  <span>User Authorization</span>
                </div>
                {profiles.filter((p) => p.status === "pending").length > 0 && (
                  <span className="text-[9px] bg-amber-500 text-zinc-950 font-extrabold px-1.5 py-0.5 rounded-full animate-pulse shrink-0">
                    {profiles.filter((p) => p.status === "pending").length}
                  </span>
                )}
              </button>
            </div>

            {/* STATUS / VERSION BADGE */}
            <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <Database size={12} className="text-zinc-400" />
                <span className="text-[10px] font-bold text-zinc-300">Live Client Sync</span>
              </div>
              <p className="text-[9px] text-zinc-500 leading-normal">
                Modifications are stored directly in the active Zustand context state and immediately update the live 3D renderer.
              </p>
            </div>
          </div>

          {/* MAIN FORM PANEL */}
          <div className="flex-1 bg-zinc-900/40 p-6 overflow-y-auto custom-scrollbar">
            
            {/* TAB 1: DASHBOARD OVERVIEW */}
            {activeAdminTab === "dashboard" && (
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                
                {/* METRICS GRID */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-zinc-950 border border-white/10 rounded-xl p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Total Platform MRR</span>
                      <DollarSign size={16} className="text-emerald-400" />
                    </div>
                    <span className="text-xl font-bold text-white">${saasConfig.metrics.totalRevenue.toLocaleString()}</span>
                    <span className="text-[9px] text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                      <TrendingUp size={10} /> +18.4% this month
                    </span>
                  </div>

                  <div className="bg-zinc-950 border border-white/10 rounded-xl p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Active Tenants</span>
                      <Users size={16} className="text-blue-400" />
                    </div>
                    <span className="text-xl font-bold text-white">{saasConfig.tenants.length} Subscribers</span>
                    <span className="text-[9px] text-blue-400 font-semibold mt-1">
                      {saasConfig.tenants.filter(t => t.tier === 'Pro').length} Pro · {saasConfig.tenants.filter(t => t.tier === 'Enterprise').length} Enterprise
                    </span>
                  </div>

                  <div className="bg-zinc-950 border border-white/10 rounded-xl p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Customizations</span>
                      <Layers size={16} className="text-indigo-400" />
                    </div>
                    <span className="text-xl font-bold text-white">{saasConfig.metrics.customizationsCreated.toLocaleString()}</span>
                    <span className="text-[9px] text-zinc-500 mt-1">Renders & design variants saved</span>
                  </div>

                  <div className="bg-zinc-950 border border-white/10 rounded-xl p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Conversion Rate</span>
                      <Percent size={16} className="text-purple-400" />
                    </div>
                    <span className="text-xl font-bold text-white">{saasConfig.metrics.conversions}%</span>
                    <span className="text-[9px] text-purple-400 font-semibold mt-1">Free to Pro subscriber tier conversion</span>
                  </div>
                </div>

                {/* VISUAL CHARTS SIMULATOR */}
                <div className="grid grid-cols-5 gap-4">
                  
                  {/* CHART 1: MONTHLY REVENUE GROWTH */}
                  <div className="col-span-3 bg-zinc-950 border border-white/10 rounded-xl p-5 flex flex-col justify-between h-[180px]">
                    <div>
                      <h3 className="text-white text-xs font-bold tracking-tight">MRR Monthly Growth (USD)</h3>
                      <p className="text-[10px] text-zinc-400">Steady upward growth across mid-market enterprise tiers.</p>
                    </div>
                    <div className="flex items-end gap-3 h-20 pt-4 px-2">
                      {[
                        { month: "Jan", val: 35 },
                        { month: "Feb", val: 42 },
                        { month: "Mar", val: 58 },
                        { month: "Apr", val: 69 },
                        { month: "May", val: 82 },
                        { month: "Jun", val: 100 },
                      ].map((bar, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                          <div 
                            className="w-full bg-gradient-to-t from-indigo-600 to-purple-500 rounded-t hover:brightness-125 transition-all"
                            style={{ height: `${bar.val}%` }}
                          />
                          <span className="text-[9px] text-zinc-500 font-mono">{bar.month}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CHART 2: SUBSCRIPTION BREAKDOWN PIE */}
                  <div className="col-span-2 bg-zinc-950 border border-white/10 rounded-xl p-5 flex flex-col justify-between h-[180px]">
                    <div>
                      <h3 className="text-white text-xs font-bold tracking-tight">Active Plan Distribution</h3>
                      <p className="text-[10px] text-zinc-400">Total revenue contributions per subscriber tier.</p>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-[10px] text-zinc-400">Enterprise</span>
                          </div>
                          <span className="text-[10px] font-bold text-white font-mono">60%</span>
                        </div>
                        <div className="flex items-center gap-2 justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-500" />
                            <span className="text-[10px] text-zinc-400">Pro Teams</span>
                          </div>
                          <span className="text-[10px] font-bold text-white font-mono">32%</span>
                        </div>
                        <div className="flex items-center gap-2 justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-zinc-500" />
                            <span className="text-[10px] text-zinc-400">Free Trial</span>
                          </div>
                          <span className="text-[10px] font-bold text-white font-mono">8%</span>
                        </div>
                      </div>
                      
                      <div className="w-20 h-20 rounded-full border-[8px] border-indigo-600/20 relative flex items-center justify-center flex-shrink-0">
                        <div className="absolute inset-0 rounded-full border-[8px] border-transparent border-t-emerald-500 border-r-indigo-500 rotate-45" />
                        <span className="text-[9px] font-bold text-white">SaaS KPI</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* QUICK START STATS LOCK BANNER */}
                <div className="bg-gradient-to-r from-indigo-900/30 via-zinc-900 to-indigo-900/10 border border-indigo-500/20 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
                      <Award size={18} />
                    </div>
                    <div>
                      <h4 className="text-white text-xs font-bold tracking-tight">Global Feature Restrictions Active</h4>
                      <p className="text-[10px] text-zinc-400">
                        Features toggled on the Branding tab instantly enable or disable capabilities globally across the active designer viewports.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveAdminTab("branding")}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-lg shadow transition-colors"
                  >
                    Adjust Toggles
                  </button>
                </div>

              </div>
            )}

            {/* TAB 2: BRANDING & FEATURES SETTINGS */}
            {activeAdminTab === "branding" && (
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                <div className="grid grid-cols-2 gap-6">
                  
                  {/* APP NAME BRANDING */}
                  <div className="bg-zinc-950 border border-white/10 rounded-xl p-5 space-y-4">
                    <div>
                      <h3 className="text-white text-xs font-bold tracking-tight">White-label SaaS Branding</h3>
                      <p className="text-[10px] text-zinc-400">Rebrand the customizer title and typography globally.</p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Platform SaaS Name</label>
                        <input
                          type="text"
                          value={saasConfig.appName}
                          onChange={(e) => updateSaasConfig({ appName: e.target.value })}
                          className="bg-zinc-900 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition-all"
                          placeholder="e.g. Customizer Pro"
                        />
                      </div>

                      {/* BRANDING ACCENT COLOR */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Dynamic Accent Theme</label>
                        <div className="grid grid-cols-5 gap-1.5">
                          {themeColors.map((color) => {
                            const isSelected = saasConfig.themeColor === color.value;
                            return (
                              <button
                                key={color.value}
                                onClick={() => updateSaasConfig({ themeColor: color.value })}
                                className={`h-10 rounded-lg flex flex-col items-center justify-center border transition-all ${
                                  isSelected 
                                    ? `border-white bg-zinc-800 scale-105 shadow-md` 
                                    : "border-transparent bg-zinc-900/60 hover:bg-zinc-900"
                                }`}
                                title={color.name}
                              >
                                <span className={`w-3.5 h-3.5 rounded-full ${color.bg} border border-white/20`} />
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* FREE LIMIT SCALE */}
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Free Saves Limit</label>
                          <input
                            type="number"
                            value={saasConfig.pricingTiers.freeLimit}
                            onChange={(e) => updateSaasConfig({ pricingTiers: { ...saasConfig.pricingTiers, freeLimit: Math.max(1, parseInt(e.target.value) || 1) } })}
                            className="bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Pro Monthly Price</label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">$</span>
                            <input
                              type="number"
                              value={saasConfig.pricingTiers.proPrice}
                              onChange={(e) => updateSaasConfig({ pricingTiers: { ...saasConfig.pricingTiers, proPrice: Math.max(0, parseInt(e.target.value) || 0) } })}
                              className="bg-zinc-900 border border-white/10 rounded-lg pl-6 pr-2.5 py-1.5 text-xs text-white focus:outline-none w-full"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* FEATURE TOGGLES */}
                  <div className="bg-zinc-950 border border-white/10 rounded-xl p-5 space-y-4">
                    <div>
                      <h3 className="text-white text-xs font-bold tracking-tight">SaaS Feature Entitlements</h3>
                      <p className="text-[10px] text-zinc-400">Dynamically toggle which customizer features are unlocked in the app.</p>
                    </div>

                    <div className="space-y-3.5 divide-y divide-white/5">
                      {/* AI TEXTURE GENERATOR */}
                      <div className="flex items-center justify-between pt-1.5">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                            AI Texture Generation
                            <Sparkles size={11} className="text-purple-400 animate-pulse" />
                          </span>
                          <span className="text-[9px] text-zinc-500">Renders material styles using Gemini API prompts.</span>
                        </div>
                        <button
                          onClick={() => toggleSaasFeature("aiGen")}
                          className={`text-2xl transition-colors focus:outline-none ${
                            saasConfig.enabledFeatures.aiGen ? "text-indigo-500" : "text-zinc-600"
                          }`}
                        >
                          {saasConfig.enabledFeatures.aiGen ? <ToggleRight size={38} /> : <ToggleLeft size={38} />}
                        </button>
                      </div>

                      {/* SEAMLESS PBR */}
                      <div className="flex items-center justify-between pt-3">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-white">Seamless PBR Maps (Camera Capture)</span>
                          <span className="text-[9px] text-zinc-500">Generates Normal & Roughness maps on raw pictures.</span>
                        </div>
                        <button
                          onClick={() => toggleSaasFeature("pbrGen")}
                          className={`text-2xl transition-colors focus:outline-none ${
                            saasConfig.enabledFeatures.pbrGen ? "text-indigo-500" : "text-zinc-600"
                          }`}
                        >
                          {saasConfig.enabledFeatures.pbrGen ? <ToggleRight size={38} /> : <ToggleLeft size={38} />}
                        </button>
                      </div>

                      {/* MEASUREMENT DIMENSIONS */}
                      <div className="flex items-center justify-between pt-3">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-white">Dimension Measurements</span>
                          <span className="text-[9px] text-zinc-500">Display 3D dimension line grids with sizing stats.</span>
                        </div>
                        <button
                          onClick={() => toggleSaasFeature("measurements")}
                          className={`text-2xl transition-colors focus:outline-none ${
                            saasConfig.enabledFeatures.measurements ? "text-indigo-500" : "text-zinc-600"
                          }`}
                        >
                          {saasConfig.enabledFeatures.measurements ? <ToggleRight size={38} /> : <ToggleLeft size={38} />}
                        </button>
                      </div>

                      {/* VIDEO RECORDING CAPTURE */}
                      <div className="flex items-center justify-between pt-3">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-white">Video Studio Export</span>
                          <span className="text-[9px] text-zinc-500">Render 360° turntable animations with direct MP4 export.</span>
                        </div>
                        <button
                          onClick={() => toggleSaasFeature("videoCapture")}
                          className={`text-2xl transition-colors focus:outline-none ${
                            saasConfig.enabledFeatures.videoCapture ? "text-indigo-500" : "text-zinc-600"
                          }`}
                        >
                          {saasConfig.enabledFeatures.videoCapture ? <ToggleRight size={38} /> : <ToggleLeft size={38} />}
                        </button>
                      </div>

                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* TAB 3: TENANT SUBSCRIPTION MANAGER */}
            {activeAdminTab === "tenants" && (
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                <div className="grid grid-cols-3 gap-6">
                  
                  {/* TENANTS LIST AND CONTROLLER */}
                  <div className="col-span-2 bg-zinc-950 border border-white/10 rounded-xl p-5 space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-white text-xs font-bold tracking-tight">Active Tenant Accounts</h3>
                        <p className="text-[10px] text-zinc-400">View active SaaS customer companies configured on this instance.</p>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                        {filteredTenants.length} tenants
                      </span>
                    </div>

                    {/* SEARCH & FILTERS */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                          type="text"
                          value={tenantSearch}
                          onChange={(e) => setTenantSearch(e.target.value)}
                          className="bg-zinc-900 border border-white/10 rounded px-2.5 pl-8 py-1.5 text-[11px] text-white focus:outline-none focus:border-indigo-500 w-full"
                          placeholder="Search tenant domain..."
                        />
                      </div>
                      <div className="flex gap-1">
                        {(["All", "Free", "Pro", "Enterprise"] as const).map((tier) => (
                          <button
                            key={tier}
                            onClick={() => setTenantFilter(tier)}
                            className={`px-2 py-1 text-[10px] font-semibold rounded border transition-colors ${
                              tenantFilter === tier
                                ? "bg-indigo-600 text-white border-indigo-500"
                                : "bg-zinc-900 text-zinc-400 border-white/5 hover:text-white"
                            }`}
                          >
                            {tier}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* TABLE LIST */}
                    <div className="border border-white/10 rounded-lg overflow-hidden">
                      <div className="grid grid-cols-4 bg-zinc-900 px-3 py-2 border-b border-white/10 text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                        <span>Tenant Name</span>
                        <span>Billing Plan</span>
                        <span>Service Status</span>
                        <span className="text-right">Actions</span>
                      </div>
                      <div className="divide-y divide-white/5 max-h-[220px] overflow-y-auto custom-scrollbar">
                        {filteredTenants.length === 0 ? (
                          <div className="p-6 text-center text-[11px] text-zinc-500 font-medium bg-zinc-900/10">
                            No tenants match this search or tier filter.
                          </div>
                        ) : (
                          filteredTenants.map((tenant) => (
                            <div key={tenant.id} className="grid grid-cols-4 px-3 py-2.5 text-xs text-white items-center hover:bg-white/5 transition-colors">
                              <span className="font-semibold truncate">{tenant.name}</span>
                              <div>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                                  tenant.tier === "Enterprise"
                                    ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                                    : tenant.tier === "Pro"
                                      ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                      : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                                }`}>
                                  {tenant.tier}
                                </span>
                              </div>
                              <div>
                                <span className={`flex items-center gap-1 text-[10px] ${
                                  tenant.status === "Active" ? "text-emerald-400" : "text-amber-500"
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    tenant.status === "Active" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                                  }`} />
                                  {tenant.status}
                                </span>
                              </div>
                              <div className="text-right">
                                <button
                                  onClick={() => deleteSaasTenant(tenant.id)}
                                  className="p-1 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded transition-colors"
                                  title="Terminate subscriber contract"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ADD NEW TENANT */}
                  <div className="bg-zinc-950 border border-white/10 rounded-xl p-5 space-y-4">
                    <div>
                      <h3 className="text-white text-xs font-bold tracking-tight">Provision Tenant</h3>
                      <p className="text-[10px] text-zinc-400">Instantly provision and simulate a new customer workspace subscription.</p>
                    </div>

                    <form onSubmit={handleAddTenant} className="space-y-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Company / Team Name</label>
                        <input
                          type="text"
                          value={newTenantName}
                          onChange={(e) => setNewTenantName(e.target.value)}
                          className="bg-zinc-900 border border-white/10 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none"
                          placeholder="e.g. Flight Club"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Subscription Tier</label>
                        <select
                          value={newTenantTier}
                          onChange={(e) => setNewTenantTier(e.target.value as any)}
                          className="bg-zinc-900 border border-white/10 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                        >
                          <option value="Free">Free Basic Plan</option>
                          <option value="Pro">Pro Premium Team (${saasConfig.pricingTiers.proPrice}/mo)</option>
                          <option value="Enterprise">Enterprise Dedicated ($299/mo)</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/10"
                      >
                        <Plus size={14} /> Provision Subscriber
                      </button>
                    </form>
                  </div>

                </div>
              </div>
            )}

            {/* TAB 4: MATERIALS CONFIGURATION */}
            {activeAdminTab === "materials" && (
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                <div className="grid grid-cols-3 gap-6">
                  
                  {/* PRESETS LIST AND TIER CONTROLLERS */}
                  <div className="col-span-2 bg-zinc-950 border border-white/10 rounded-xl p-5 space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-white text-xs font-bold tracking-tight">Active Materials & Presets Lockouts</h3>
                        <p className="text-[10px] text-zinc-400">Configure which material presets require a Pro/Enterprise account.</p>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                        {materials.length} Presets
                      </span>
                    </div>

                    {/* TABLE LIST */}
                    <div className="border border-white/10 rounded-lg overflow-hidden">
                      <div className="grid grid-cols-4 bg-zinc-900 px-3 py-2 border-b border-white/10 text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                        <span>Material Spec</span>
                        <span>Roughness / Metal</span>
                        <span>Pricing Tier</span>
                        <span className="text-right">Actions</span>
                      </div>
                      <div className="divide-y divide-white/5 max-h-[220px] overflow-y-auto custom-scrollbar">
                        {materials.map((mat) => (
                          <div key={mat.id} className="grid grid-cols-4 px-3 py-2.5 text-xs text-white items-center hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-2">
                              <span 
                                className="w-3 h-3 rounded-full border border-white/20" 
                                style={{ backgroundColor: mat.color }} 
                              />
                              <span className="font-semibold truncate">{mat.name}</span>
                            </div>
                            <span className="font-mono text-[10px] text-zinc-500">
                              R: {mat.roughness} · M: {mat.metalness || 0}
                            </span>
                            <div>
                              <button
                                onClick={() => {
                                  // Toggle premium on click
                                  const updated = { ...mat, isPremium: !mat.isPremium };
                                  addMaterial(updated); // Replacing re-adds and updates
                                }}
                                className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-colors flex items-center gap-1 ${
                                  mat.isPremium
                                    ? "bg-amber-500/15 text-amber-400 border-amber-500/20 hover:bg-amber-500/25"
                                    : "bg-emerald-500/15 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/25"
                                }`}
                              >
                                {mat.isPremium ? <Lock size={8} /> : null}
                                {mat.isPremium ? "Premium Pro" : "Free Tier"}
                              </button>
                            </div>
                            <div className="text-right">
                              <button
                                onClick={() => removeMaterial(mat.id)}
                                className="p-1 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded transition-colors"
                                title="Delete preset"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ADD NEW MATERIAL PRESET */}
                  <div className="bg-zinc-950 border border-white/10 rounded-xl p-5 space-y-4">
                    <div>
                      <h3 className="text-white text-xs font-bold tracking-tight">Create Preset</h3>
                      <p className="text-[10px] text-zinc-400">Introduce a custom material preset option available to your active tenants.</p>
                    </div>

                    <form onSubmit={handleAddMaterial} className="space-y-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Material Name</label>
                        <input
                          type="text"
                          value={newMatName}
                          onChange={(e) => setNewMatName(e.target.value)}
                          className="bg-zinc-900 border border-white/10 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none"
                          placeholder="e.g. Suede Carbon"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Base Color</label>
                          <div className="flex gap-1.5">
                            <input
                              type="color"
                              value={newMatColor}
                              onChange={(e) => setNewMatColor(e.target.value)}
                              className="bg-zinc-900 border border-white/10 rounded h-7 w-8 p-0 cursor-pointer"
                            />
                            <input
                              type="text"
                              value={newMatColor}
                              onChange={(e) => setNewMatColor(e.target.value)}
                              className="bg-zinc-900 border border-white/10 rounded px-1.5 text-[10px] text-white focus:outline-none flex-1 font-mono uppercase"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Material Type</label>
                          <select
                            value={newMatType}
                            onChange={(e) => setNewMatType(e.target.value)}
                            className="bg-zinc-900 border border-white/10 focus:border-indigo-500 rounded h-7 text-[10px] text-white focus:outline-none px-1"
                          >
                            <option value="fabric">Fabric</option>
                            <option value="leather">Leather</option>
                            <option value="metal">Metal</option>
                            <option value="rubber">Rubber</option>
                            <option value="plastic">Glossy Plastic</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Roughness ({newMatRoughness})</label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={newMatRoughness}
                            onChange={(e) => setNewMatRoughness(parseFloat(e.target.value))}
                            className="accent-indigo-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer mt-2"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Metalness ({newMatMetalness})</label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={newMatMetalness}
                            onChange={(e) => setNewMatMetalness(parseFloat(e.target.value))}
                            className="accent-indigo-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer mt-2"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Preset Plan Lock</label>
                        <div className="flex gap-3 mt-1">
                          <button
                            type="button"
                            onClick={() => setNewMatTier("Free")}
                            className={`flex-1 py-1 rounded text-[10px] font-bold border transition-colors ${
                              newMatTier === "Free"
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                                : "bg-zinc-900 text-zinc-500 border-transparent"
                            }`}
                          >
                            Free Tier
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewMatTier("Premium")}
                            className={`flex-1 py-1 rounded text-[10px] font-bold border transition-colors ${
                              newMatTier === "Premium"
                                ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                                : "bg-zinc-900 text-zinc-500 border-transparent"
                            }`}
                          >
                            Premium Lock
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/10"
                      >
                        <Plus size={14} /> Add Preset Option
                      </button>
                    </form>
                  </div>

                </div>
              </div>
            )}

            {/* TAB 5: USER AUTHORIZATION & ACCESS CONTROL */}
            {activeAdminTab === "users" && (
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck size={16} className="text-indigo-400" />
                      User Authorization & Access Control
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Approve registered accounts to give them access to the 3D Customizer, or suspend users to block workspace entry.
                    </p>
                  </div>
                  <button
                    onClick={loadProfiles}
                    disabled={loadingProfiles}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950 border border-white/10 hover:bg-zinc-900 text-zinc-300 hover:text-white text-[11px] font-semibold transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw size={12} className={loadingProfiles ? "animate-spin" : ""} />
                    <span>Sync Profiles</span>
                  </button>
                </div>

                {/* USER STATISTICS OVERVIEW CARDS */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-zinc-950/60 border border-white/5 rounded-xl p-3.5 flex flex-col relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-all duration-300" />
                    <div className="flex items-center justify-between mb-1 z-10">
                      <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Total Users</span>
                      <Users size={14} className="text-indigo-400" />
                    </div>
                    <span className="text-xl font-bold text-white z-10">{profiles.length}</span>
                    <span className="text-[9px] text-zinc-500 mt-0.5 font-medium">Registered profiles</span>
                  </div>

                  <div className="bg-zinc-950/60 border border-white/5 rounded-xl p-3.5 flex flex-col relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all duration-300" />
                    <div className="flex items-center justify-between mb-1 z-10">
                      <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Approved</span>
                      <UserCheck size={14} className="text-emerald-400" />
                    </div>
                    <span className="text-xl font-bold text-emerald-400 z-10">
                      {profiles.filter((p) => p.status === "approved").length}
                    </span>
                    <span className="text-[9px] text-zinc-500 mt-0.5 font-medium">Full active access</span>
                  </div>

                  <div className="bg-zinc-950/60 border border-white/5 rounded-xl p-3.5 flex flex-col relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-all duration-300" />
                    <div className="flex items-center justify-between mb-1 z-10">
                      <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Pending Approval</span>
                      <Clock size={14} className="text-amber-400 animate-pulse" />
                    </div>
                    <span className={`text-xl font-bold z-10 ${profiles.filter((p) => p.status === "pending").length > 0 ? "text-amber-400 animate-pulse" : "text-white"}`}>
                      {profiles.filter((p) => p.status === "pending").length}
                    </span>
                    <span className="text-[9px] text-zinc-500 mt-0.5 font-medium">Awaiting approval</span>
                  </div>

                  <div className="bg-zinc-950/60 border border-white/5 rounded-xl p-3.5 flex flex-col relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/5 rounded-full blur-xl group-hover:bg-red-500/10 transition-all duration-300" />
                    <div className="flex items-center justify-between mb-1 z-10">
                      <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Blocked</span>
                      <UserX size={14} className="text-red-400" />
                    </div>
                    <span className="text-xl font-bold text-red-400 z-10">
                      {profiles.filter((p) => p.status === "blocked").length}
                    </span>
                    <span className="text-[9px] text-zinc-500 mt-0.5 font-medium">Access suspended</span>
                  </div>
                </div>

                {/* SEARCH & FILTERS ROW */}
                <div className="flex gap-3 bg-zinc-950/40 p-3 rounded-xl border border-white/5">
                  <div className="flex-1 relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Search users by email..."
                      value={profilesSearch}
                      onChange={(e) => setProfilesSearch(e.target.value)}
                      className="w-full bg-zinc-950/60 border border-white/5 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-all font-sans"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter size={12} className="text-zinc-500" />
                    <select
                      value={profilesFilter}
                      onChange={(e) => setProfilesFilter(e.target.value as any)}
                      className="bg-zinc-950/60 border border-white/5 rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-300 focus:outline-none focus:border-indigo-500/50 transition-all font-semibold font-sans"
                    >
                      <option value="all">All Statuses</option>
                      <option value="pending">Pending Approval</option>
                      <option value="approved">Approved</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </div>
                </div>

                {/* USER PROFILES LIST CONTAINER */}
                <div className="bg-zinc-950 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                  {loadingProfiles && profiles.length === 0 ? (
                    <div className="p-12 flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                      <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">Syncing profiles database...</span>
                    </div>
                  ) : profiles.filter((p) => {
                    const matchesSearch = p.email.toLowerCase().includes(profilesSearch.toLowerCase());
                    const matchesFilter = profilesFilter === "all" || p.status === profilesFilter;
                    return matchesSearch && matchesFilter;
                  }).length === 0 ? (
                    <div className="p-12 flex flex-col items-center justify-center text-center gap-2">
                      <Users size={32} className="text-zinc-600 mb-1" />
                      <h4 className="text-xs font-bold text-zinc-400">No registered profiles found</h4>
                      <p className="text-[10px] text-zinc-500 max-w-xs leading-relaxed">
                        {profilesSearch || profilesFilter !== "all" 
                          ? "Adjust or clear your search terms and filters to view more profiles."
                          : "New signups will automatically be queued here for access authorization."}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse font-sans">
                        <thead>
                          <tr className="bg-zinc-900 border-b border-white/10 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                            <th className="p-4">User Profile / Email</th>
                            <th className="p-4">Registration Date</th>
                            <th className="p-4">Access Status</th>
                            <th className="p-4 text-right">Actions / Controls</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-xs text-zinc-300">
                          {profiles.filter((p) => {
                            const matchesSearch = p.email.toLowerCase().includes(profilesSearch.toLowerCase());
                            const matchesFilter = profilesFilter === "all" || p.status === profilesFilter;
                            return matchesSearch && matchesFilter;
                          }).map((profile) => {
                            const isSelf = profile.email === "kitoruyasiru@gmail.com";
                            const isPending = profile.status === "pending";
                            const isApproved = profile.status === "approved";
                            const isBlocked = profile.status === "blocked";
                            const isOperating = profileActionUid === profile.uid;

                            return (
                              <tr key={profile.uid} className="hover:bg-white/[0.02] transition-colors">
                                <td className="p-4">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-white font-bold tracking-tight">
                                      {profile.email || "Anonymous Emulated Sandbox Account"}
                                    </span>
                                    <span className="text-[9px] font-mono text-zinc-500">
                                      UID: {profile.uid} {isSelf && "• Primary Admin Key"}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-4 text-zinc-400 font-medium">
                                  {profile.requestedAt ? new Date(profile.requestedAt).toLocaleString() : "Pre-configured"}
                                </td>
                                <td className="p-4">
                                  <div className="flex">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-extrabold tracking-wide uppercase ${
                                      isApproved 
                                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" 
                                        : isBlocked 
                                        ? "text-red-400 bg-red-500/10 border-red-500/20" 
                                        : "text-amber-400 bg-amber-500/10 border-amber-500/20 animate-pulse"
                                    }`}>
                                      {isApproved ? (
                                        <>
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                          Approved
                                        </>
                                      ) : isBlocked ? (
                                        <>
                                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                          Blocked
                                        </>
                                      ) : (
                                        <>
                                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                          Pending Request
                                        </>
                                      )}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-4 text-right">
                                  {isSelf ? (
                                    <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                                      Protected Admin Account
                                    </span>
                                  ) : (
                                    <div className="flex gap-2 justify-end">
                                      {/* Approve Option */}
                                      {!isApproved && (
                                        <button
                                          onClick={() => handleUpdateStatus(profile.uid, "approved")}
                                          disabled={isOperating}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/30 font-bold text-[10px] uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                                          title="Approve User Access"
                                        >
                                          {isOperating ? (
                                            <div className="w-3.5 h-3.5 border border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                                          ) : (
                                            <UserCheck size={12} />
                                          )}
                                          <span>Approve</span>
                                        </button>
                                      )}

                                      {/* Block Option */}
                                      {!isBlocked && (
                                        <button
                                          onClick={() => handleUpdateStatus(profile.uid, "blocked")}
                                          disabled={isOperating}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 hover:border-red-500/30 font-bold text-[10px] uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                                          title="Block/Suspend User Access"
                                        >
                                          {isOperating ? (
                                            <div className="w-3.5 h-3.5 border border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                                          ) : (
                                            <UserX size={12} />
                                          )}
                                          <span>Block</span>
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-indigo-950/20 border border-indigo-500/20 rounded-xl flex items-start gap-3">
                  <ShieldCheck size={18} className="text-indigo-400 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-white uppercase tracking-wider block">Access Protocol Notice</span>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      This panel integrates direct synchronization with the Firebase Firestore database schema. Approved users gain immediate entry to the 3D customizer. Blocked or pending users are immediately routed to a secure access-gated screen upon logging in.
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};
