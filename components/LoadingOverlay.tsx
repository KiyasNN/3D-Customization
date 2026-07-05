import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Loader2 } from "lucide-react";
import { useStore } from "../store";

export const LoadingOverlay = () => {
  const isModelLoading = useStore((s) => s.isModelLoading);
  const modelLoadingProgress = useStore((s) => s.modelLoadingProgress);
  const currentModel = useStore((s) => s.currentModel);

  return (
    <AnimatePresence>
      {isModelLoading && (
        <motion.div
          id="loading-overlay-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-md"
        >
          <div className="relative flex flex-col items-center max-w-md px-6 text-center">
            {/* Spinning glowing outer rings */}
            <div className="relative w-28 h-28 mb-8 flex items-center justify-center">
              {/* Outer spin ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
                className="absolute inset-0 rounded-full border-t-2 border-b-2 border-l-2 border-transparent border-t-blue-500 border-b-blue-400"
              />
              
              {/* Middle counter-spin ring */}
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 2.4, ease: "linear" }}
                className="absolute inset-2 rounded-full border-r-2 border-l-2 border-transparent border-r-indigo-500"
              />

              {/* Inner pulse circle */}
              <motion.div
                animate={{ scale: [0.85, 1.1, 0.85] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.2)]"
              >
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              </motion.div>
            </div>

            {/* Title & model name */}
            <motion.h3 
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="text-base font-medium text-white tracking-widest uppercase flex items-center gap-2 mb-2 font-sans"
            >
              Configuring 3D Canvas
            </motion.h3>

            <motion.p 
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="text-sm text-zinc-400 font-medium mb-8 px-4 truncate max-w-sm"
            >
              {currentModel?.name || 'Loading Model'}
            </motion.p>

            {/* Progress bar container */}
            <motion.div 
              initial={{ scaleX: 0.8, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="w-64 h-1.5 bg-zinc-900 rounded-full overflow-hidden relative mb-4 border border-zinc-800/50"
            >
              <motion.div 
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.5)]"
                style={{ width: `${modelLoadingProgress > 0 ? modelLoadingProgress : 12}%` }}
                transition={{ ease: "easeOut", duration: 0.2 }}
              />
            </motion.div>

            {/* Progress Text */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-xs text-zinc-500 font-mono tracking-widest uppercase"
            >
              {modelLoadingProgress > 0 ? `Loading Asset • ${modelLoadingProgress}%` : 'Communicating with loader...'}
            </motion.div>

            {/* Engine Status indicator */}
            <div className="mt-8 flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/60 border border-zinc-800/40 text-[10px] text-zinc-500 font-mono tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
              <span>Three.js Engine Online</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
