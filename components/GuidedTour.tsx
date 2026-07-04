import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Layers, 
  Sun, 
  Clapperboard, 
  Camera, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  HelpCircle,
  Play,
  RotateCw,
  Gift
} from "lucide-react";

interface GuidedTourProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  showLeftPanel: boolean;
  setShowLeftPanel: (show: boolean) => void;
}

interface Step {
  title: string;
  description: string;
  icon: React.ReactNode;
  selector: string; // DOM selector to highlight/target
  placement: "center" | "top" | "bottom" | "left" | "right";
  onEnter?: () => void;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({
  activeTab,
  setActiveTab,
  showLeftPanel,
  setShowLeftPanel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [windowSize, setWindowSize] = useState({ width: typeof window !== "undefined" ? window.innerWidth : 1200, height: typeof window !== "undefined" ? window.innerHeight : 800 });

  // Monitor resize to recalculate coords
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Check if tour was completed before
  useEffect(() => {
    const completed = localStorage.getItem("nk_shoe_customizer_tour_completed");
    if (!completed) {
      // Delay open slightly to let application bootstrap
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const steps: Step[] = [
    {
      title: "Welcome to 3D Shoe Customizer!",
      description: "Let's take 1 minute to explore the advanced features of this 3D shoe visualization platform. You can design custom materials with AI, record rotating turntable videos, and so much more!",
      icon: <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />,
      selector: "",
      placement: "center"
    },
    {
      title: "Shoe Parts (Layer List)",
      description: "The left panel displays a list of all shoe components (Sole, Midsole, Upper Body, etc.). Click on any row to select the specific part you want to paint or apply custom textures to.",
      icon: <Layers className="w-6 h-6 text-blue-400" />,
      selector: "#tour-left-panel",
      placement: "right",
      onEnter: () => {
        setShowLeftPanel(true);
      }
    },
    {
      title: "AI Texture Generator",
      description: "Harness the power of Gemini AI to create textures that have never existed before! Simply type a prompt like 'cracked lava', 'golden circuit board', or 'dragon scales'. The AI will paint high-quality seamless materials instantly.",
      icon: <Sparkles className="w-6 h-6 text-purple-400" />,
      selector: "#tour-right-panel",
      placement: "left",
      onEnter: () => {
        setActiveTab("mix");
      }
    },
    {
      title: "PBR Materials Customization",
      description: "Want to change how reflective or shiny the shoe is? The Materials tab provides you with professional-grade PBR material presets. Adjust Roughness, Metalness, or even connect a live webcam feed for dynamic rendering!",
      icon: <Layers className="w-6 h-6 text-green-400" />,
      selector: "#tour-right-panel",
      placement: "left",
      onEnter: () => {
        setActiveTab("materials");
      }
    },
    {
      title: "Lighting & Studio Calibration",
      description: "Change the studio's atmosphere to your liking. The Light tab allows you to calibrate custom HDRI environment rotation, shadow tilt, ambient brightness, and ground floor height.",
      icon: <Sun className="w-6 h-6 text-amber-400" />,
      selector: "#tour-right-panel",
      placement: "left",
      onEnter: () => {
        setActiveTab("light");
      }
    },
    {
      title: "Snapshots & Turntable Recording (MP4)",
      description: "Ready to show off your designs? Take instant high-resolution PNG snapshots, or launch the automated rotating studio turntable to record cinematic MP4 video loops!",
      icon: <Clapperboard className="w-6 h-6 text-red-500 animate-bounce" />,
      selector: "#tour-top-toolbar",
      placement: "bottom"
    },
    {
      title: "Ready to Unleash Your Creativity?",
      description: "Now it's your turn to craft futuristic shoe designs! If you ever need a guide again, simply press the help button at any time.",
      icon: <Gift className="w-6 h-6 text-yellow-400" />,
      selector: "",
      placement: "center"
    }
  ];

  // Run onEnter hook whenever step transition happens
  useEffect(() => {
    if (isOpen && steps[currentStep]?.onEnter) {
      steps[currentStep].onEnter?.();
    }
  }, [currentStep, isOpen]);

  // Track coordinates of target element
  useEffect(() => {
    if (!isOpen) {
      setCoords(null);
      return;
    }

    const currentSelector = steps[currentStep]?.selector;
    if (!currentSelector) {
      setCoords(null);
      return;
    }

    // Wait a brief tick for render updates
    const timer = setTimeout(() => {
      const element = document.querySelector(currentSelector);
      if (element) {
        const rect = element.getBoundingClientRect();
        setCoords({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      } else {
        setCoords(null);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [currentStep, isOpen, activeTab, showLeftPanel, windowSize]);

  if (!isOpen) {
    // Provide a neat subtle trigger button to restart tour if they already closed/completed it
    return (
      <button 
        onClick={() => {
          setCurrentStep(0);
          setIsOpen(true);
        }}
        className="fixed bottom-24 right-6 pointer-events-auto bg-zinc-900/90 border border-white/10 hover:border-blue-500 hover:bg-zinc-800 text-white p-3 rounded-full shadow-2xl flex items-center gap-2 text-xs transition-all duration-300 group z-40"
        title="Start Guided Tour"
        id="restart-tour-float"
      >
        <HelpCircle size={16} className="text-blue-500 animate-pulse group-hover:rotate-12 transition-transform" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-[100px] transition-all duration-500 ease-out font-medium">Start Tour</span>
      </button>
    );
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem("nk_shoe_customizer_tour_completed", "true");
    setIsOpen(false);
  };

  const step = steps[currentStep];

  // Helper styles to render the pointer card adjacent to coordinates
  const getPointerCardStyle = () => {
    if (!coords) return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    
    const spacing = 20;
    const cw = coords.left + coords.width / 2;
    const cy = coords.top + coords.height / 2;

    switch (step.placement) {
      case "right":
        return {
          top: `${coords.top + coords.height / 2}px`,
          left: `${coords.left + coords.width + spacing}px`,
          transform: "translateY(-50%)"
        };
      case "left":
        return {
          top: `${coords.top + coords.height / 2}px`,
          left: `${coords.left - spacing}px`,
          transform: "translate(-100%, -50%)"
        };
      case "bottom":
        return {
          top: `${coords.top + coords.height + spacing}px`,
          left: `${coords.left + coords.width / 2}px`,
          transform: "translateX(-50%)"
        };
      case "top":
        return {
          top: `${coords.top - spacing}px`,
          left: `${coords.left + coords.width / 2}px`,
          transform: "translate(-50%, -100%)"
        };
      default:
        return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    }
  };

  return (
    <div className="fixed inset-0 z-[999] pointer-events-auto">
      {/* SVG Mask Overlay for Spotlight */}
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/75 pointer-events-none transition-all duration-300"
          style={{
            clipPath: coords 
              ? `polygon(
                  0% 0%, 0% 100%, 
                  ${coords.left - 8}px 100%, 
                  ${coords.left - 8}px ${coords.top - 8}px, 
                  ${coords.left + coords.width + 8}px ${coords.top - 8}px, 
                  ${coords.left + coords.width + 8}px ${coords.top + coords.height + 8}px, 
                  ${coords.left - 8}px ${coords.top + coords.height + 8}px, 
                  ${coords.left - 8}px 100%, 
                  100% 100%, 100% 0%
                )` 
              : "none"
          }}
        />
      </AnimatePresence>

      {/* Target Spotlight Highlight Ring */}
      {coords && (
        <div 
          className="absolute pointer-events-none border border-yellow-400/60 rounded-xl transition-all duration-300 animate-pulse bg-transparent z-[1000] shadow-[0_0_20px_rgba(250,204,21,0.3)]"
          style={{
            top: `${coords.top - 8}px`,
            left: `${coords.left - 8}px`,
            width: `${coords.width + 16}px`,
            height: `${coords.height + 16}px`,
          }}
        />
      )}

      {/* Guidance Dialog Card */}
      <div 
        className="absolute transition-all duration-300 z-[1001] w-[calc(100vw-2rem)] sm:w-[420px] p-0.5 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-950 border border-white/10 shadow-2xl overflow-hidden"
        style={getPointerCardStyle()}
      >
        <div className="bg-zinc-950/95 rounded-[14px] p-5">
          {/* Header */}
          <div className="flex justify-between items-start mb-3 gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                {step.icon}
              </div>
              <h4 className="text-sm font-bold text-white tracking-wide">
                {step.title}
              </h4>
            </div>
            <button 
              onClick={handleComplete}
              className="p-1 hover:bg-white/10 rounded-full text-zinc-500 hover:text-white transition-colors"
              title="Skip Tour"
            >
              <X size={16} />
            </button>
          </div>

          {/* Description */}
          <p className="text-xs text-zinc-400 leading-relaxed min-h-[50px] mb-6">
            {step.description}
          </p>

          {/* Steps Progress and Navigation buttons */}
          <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl border border-white/5">
            {/* Step Counter */}
            <div className="flex gap-1 items-center px-1.5">
              {steps.map((_, idx) => (
                <div 
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStep 
                      ? "w-4 bg-blue-500" 
                      : idx < currentStep 
                        ? "w-1.5 bg-zinc-600" 
                        : "w-1.5 bg-zinc-800"
                  }`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handleBack}
                  className="px-2.5 py-1.5 text-[10px] uppercase font-bold text-zinc-400 hover:text-white flex items-center gap-1 transition-all"
                >
                  <ChevronLeft size={12} />
                  Back
                </button>
              )}
              
              <button
                onClick={handleNext}
                className="bg-blue-600 hover:bg-blue-500 text-white rounded px-3.5 py-1.5 text-[10px] uppercase font-bold flex items-center gap-1 transition-all shadow-md active:scale-95"
              >
                {currentStep === steps.length - 1 ? "Finish" : "Next"}
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
