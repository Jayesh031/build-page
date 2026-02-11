"use client";
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useStore } from 'zustand';
import { ChevronRight, ChevronLeft, RotateCcw, Box, Layers, Zap, Cpu, Settings, Trash2, Move, Sliders } from 'lucide-react';

import DroneScene from './components/DroneScene'; 
import { useDroneStore, INVENTORY, VARIANTS } from './components/store'; 
import { useTheme } from './components/ThemeProvider'; 

// --- ANIMATED TRASH BUTTON ---
const TrashButton = ({ onClick, isDark }) => {
  const container = useRef();
  const lid = useRef();
  const bin = useRef();

  useGSAP(() => {
    gsap.set(lid.current, { rotation: 0, transformOrigin: "bottom right" });
  }, { scope: container });

  const handleMouseEnter = () => {
    gsap.to(lid.current, { rotation: -30, duration: 0.2, ease: "back.out(1.7)" });
    gsap.to(bin.current, { scale: 1.1, duration: 0.2 });
  };

  const handleMouseLeave = () => {
    gsap.to(lid.current, { rotation: 0, duration: 0.2, ease: "power2.out" });
    gsap.to(bin.current, { scale: 1, duration: 0.2 });
  };

  return (
    <button 
      ref={container}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-300
        ${isDark ? "text-slate-400 hover:text-red-400 hover:bg-red-900/20" : "text-slate-400 hover:text-red-500 hover:bg-red-50"}
      `}
    >
      <svg ref={bin} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18"></path>
        <path ref={lid} d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
      </svg>
    </button>
  );
};

export default function BuilderPage() {
  const { theme } = useTheme(); 
  // Force a re-render or check if theme is undefined initially
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = theme === 'dark';

  // Store Hooks
  const parts = useDroneStore((s) => s.parts);
  const activePartId = useDroneStore((s) => s.activePartId);
  const setDraggedPartType = useDroneStore((s) => s.setDraggedPartType);
  const setConfiguredVariantData = useDroneStore((s) => s.setConfiguredVariantData);
  const lockActivePart = useDroneStore((s) => s.lockActivePart);
  const updatePartPosition = useDroneStore((s) => s.updatePartPosition);
  const rotateActivePart = useDroneStore((s) => s.rotateActivePart);
  const resetScene = useDroneStore((s) => s.resetScene);
  const deletePart = useDroneStore((s) => s.deletePart);
  const placementMode = useDroneStore((s) => s.placementMode);
  const togglePlacementMode = useDroneStore((s) => s.togglePlacementMode);
  const { undo, redo, pastStates, futureStates } = useStore(useDroneStore.temporal, (state) => state);

  // Local UI State
  const [selectedPartType, setSelectedPartType] = useState('bottom_plate'); 
  const [selectedVariant, setSelectedVariant] = useState('');
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);

  const activePart = parts.find(p => p.id === activePartId);

  // --- HELPERS ---
  const getIcon = (type) => {
    if (type.includes('motor')) return <Zap size={18} />;
    if (type.includes('propellor')) return <RotateCcw size={18} />; 
    if (['fc', 'esc', 'receiver', 'gps_module'].includes(type)) return <Cpu size={18} />;
    if (type === 'battery') return <Box size={18} />;
    return <Layers size={18} />;
  };

  const getFriendlyName = (type) => {
    for (const cat in INVENTORY) {
      const found = INVENTORY[cat].find(i => i.type === type);
      if (found) return found.label;
    }
    return type;
  };

  const handleInventoryClick = (type) => {
     setSelectedPartType(type);
     setSelectedVariant(''); 
     setConfiguredVariantData({ type, variant: null }); 
  };

  // --- STYLING CONSTANTS (Glassmorphism) ---
  // Dark: Deep slate/black with blur. Light: Frosty white with blur.
  const glassPanel = isDark 
    ? "bg-slate-900/80 border-slate-700/50 text-slate-200 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]" 
    : "bg-white/80 border-white/50 text-slate-800 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)]";
    
  const glassInput = isDark
    ? "bg-slate-800/50 border-slate-600 text-slate-200 focus:border-blue-500"
    : "bg-white/60 border-slate-200 text-slate-700 focus:border-blue-500";

  const accentColor = isDark ? "text-cyan-400" : "text-blue-600";
  const activeItemBg = isDark ? "bg-cyan-500/20 border-cyan-500/50" : "bg-blue-500/10 border-blue-500/30";

  if (!mounted) return null; // Prevent hydration mismatch

  return (
    <div className={`relative h-screen w-screen overflow-hidden ${isDark ? "bg-slate-950" : "bg-slate-50"}`}>
      
      {/* 1. FULL SCREEN 3D BACKGROUND */}
      <div className="absolute inset-0 z-0">
         <DroneScene isDark={isDark} />
      </div>

      {/* 2. UI LAYER (Pointer events none allows clicking through to canvas where UI isn't) */}
      <div className="absolute inset-0 z-10 pointer-events-none pt-20 flex justify-between p-4">
        
        {/* --- LEFT PANEL: INVENTORY --- */}
        <motion.div 
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: isLeftCollapsed ? -260 : 0, opacity: 1 }}
          className={`pointer-events-auto relative flex flex-col w-72 h-[calc(100vh-6rem)] rounded-3xl backdrop-blur-xl border border-t-white/10 ${glassPanel}`}
        >
          {/* Collapse Toggle */}
          <button 
            onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
            className={`absolute -right-4 top-6 w-8 h-8 rounded-full flex items-center justify-center shadow-lg border backdrop-blur-md transition-all
              ${isDark ? "bg-slate-800 border-slate-600 text-slate-200" : "bg-white border-slate-200 text-slate-600"}`}
          >
            {isLeftCollapsed ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
          </button>

          {/* Header */}
          <div className={`p-5 border-b ${isDark ? "border-white/5" : "border-black/5"}`}>
            <h2 className={`text-xs font-bold uppercase tracking-[0.2em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Component Library
            </h2>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-rounded">
            {Object.entries(INVENTORY).map(([category, items]) => (
              <div key={category}>
                <h3 className={`text-[10px] font-bold uppercase mb-3 opacity-60 ml-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>{category}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {items.map((item) => {
                    const isSelected = selectedPartType === item.type;
                    return (
                      <div 
                        key={item.id}
                        draggable={true}
                        onClick={() => handleInventoryClick(item.type)} 
                        onDragStart={() => { handleInventoryClick(item.type); setDraggedPartType(item.type); }}
                        onDragEnd={() => setDraggedPartType(null)}
                        className={`
                          cursor-pointer group relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200
                          ${isSelected 
                              ? `${activeItemBg} ring-1 ring-offset-0 ${isDark ? "ring-cyan-500/50" : "ring-blue-500/30"}`
                              : `border-transparent hover:scale-[1.02] ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-white/40 hover:bg-white/70"}`
                          }
                        `}
                      >
                        <div className={`mb-2 opacity-80 transition-transform group-hover:scale-110 ${isSelected ? accentColor : ""}`}>
                          {getIcon(item.type)}
                        </div>
                        <span className={`text-[10px] font-bold text-center leading-tight ${isSelected ? accentColor : "opacity-70"}`}>
                            {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer Actions */}
          <div className={`p-4 border-t grid grid-cols-2 gap-2 ${isDark ? "border-white/5" : "border-black/5"}`}>
             <button onClick={() => undo()} disabled={pastStates.length === 0}
               className={`py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all
                 ${isDark ? "hover:bg-white/10 disabled:opacity-30" : "hover:bg-black/5 disabled:opacity-30"}`}>
               Undo
             </button>
             <button onClick={() => redo()} disabled={futureStates.length === 0}
               className={`py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all
                 ${isDark ? "hover:bg-white/10 disabled:opacity-30" : "hover:bg-black/5 disabled:opacity-30"}`}>
               Redo
             </button>
          </div>
        </motion.div>


        {/* --- RIGHT PANEL: CONFIG & BUILD --- */}
        <motion.div 
           initial={{ x: 300, opacity: 0 }}
           animate={{ x: isRightCollapsed ? 260 : 0, opacity: 1 }}
           className={`pointer-events-auto relative flex flex-col w-80 h-[calc(100vh-6rem)] rounded-3xl backdrop-blur-xl border border-t-white/10 ${glassPanel}`}
        >
          {/* Collapse Toggle */}
          <button 
            onClick={() => setIsRightCollapsed(!isRightCollapsed)}
            className={`absolute -left-4 top-6 w-8 h-8 rounded-full flex items-center justify-center shadow-lg border backdrop-blur-md transition-all
              ${isDark ? "bg-slate-800 border-slate-600 text-slate-200" : "bg-white border-slate-200 text-slate-600"}`}
          >
            {isRightCollapsed ? <ChevronLeft size={16}/> : <ChevronRight size={16}/>}
          </button>

          <div className={`p-5 border-b ${isDark ? "border-white/5" : "border-black/5"}`}>
            <h2 className={`text-xs font-bold uppercase tracking-[0.2em] mb-4 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Configurator</h2>
            
            {/* Active Selection Display */}
            <div className={`p-4 rounded-2xl mb-4 border ${isDark ? "bg-black/20 border-white/5" : "bg-white/40 border-black/5"}`}>
              <div className="flex items-center gap-3 mb-1">
                 <div className={`${accentColor}`}>{getIcon(selectedPartType)}</div>
                 <span className="text-sm font-extrabold tracking-wide">{getFriendlyName(selectedPartType)}</span>
              </div>
              <div className="text-[10px] opacity-50 ml-8 font-mono">
                 {VARIANTS[selectedPartType]?.length > 0 ? "Select specs below" : "Standard Component"}
              </div>
            </div>

            {/* Variant Selector */}
            {VARIANTS[selectedPartType]?.length > 0 && (
               <div className="relative">
                 <select 
                   className={`w-full p-3 pl-3 rounded-xl text-xs font-bold appearance-none outline-none transition-all ${glassInput}`}
                   value={selectedVariant}
                   onChange={(e) => {
                      setSelectedVariant(e.target.value);
                      setConfiguredVariantData({ type: selectedPartType, variant: e.target.value });
                   }}
                 >
                   <option value="">Select Variant...</option>
                   {VARIANTS[selectedPartType].map(v => <option key={v} value={v}>{v}</option>)}
                 </select>
                 <div className="absolute right-3 top-3 pointer-events-none opacity-50"><ChevronDownIcon /></div>
               </div>
            )}
          </div>

          {/* Current Build List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
             <h3 className={`text-[10px] font-bold uppercase mb-3 opacity-60 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
               Installed Parts <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] ${isDark ? "bg-white/10" : "bg-black/5"}`}>{parts.length}</span>
             </h3>
             
             <AnimatePresence>
             {parts.map((p) => (
               <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  key={p.id} 
                  className={`p-3 rounded-xl border flex justify-between items-center group transition-all
                  ${isDark ? "bg-white/5 border-white/5 hover:border-white/20" : "bg-white/60 border-black/5 hover:border-blue-300"}`}
               >
                 <div className="flex items-center gap-3">
                   <div className={`p-1.5 rounded-lg ${isDark ? "bg-black/30 text-slate-400" : "bg-white text-slate-500"}`}>
                      {getIcon(p.type)}
                   </div>
                   <div>
                     <div className="text-[11px] font-bold leading-tight">{getFriendlyName(p.type)}</div>
                     <div className="text-[9px] font-mono opacity-50">{p.variant !== '-' ? p.variant : 'STD'}</div>
                   </div>
                 </div>
                 <TrashButton onClick={() => deletePart(p.id)} isDark={isDark} />
               </motion.div>
             ))}
             </AnimatePresence>
             
             {parts.length === 0 && (
               <div className="h-32 flex flex-col items-center justify-center text-center opacity-30">
                  <Box size={32} strokeWidth={1} className="mb-2"/>
                  <span className="text-xs">Workspace Empty</span>
               </div>
             )}
          </div>
          
          {/* Reset Action */}
          <div className={`p-4 ${isDark ? "border-t border-white/5" : "border-t border-black/5"}`}>
            <button onClick={resetScene} className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-red-500 hover:bg-red-500/10 transition-colors">
              Reset Build
            </button>
          </div>
        </motion.div>
      </div>


      {/* 3. BOTTOM FLOATING CONTROL DECK (Contextual) */}
      <AnimatePresence>
      {activePartId && (
        <motion.div 
           initial={{ y: 100, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           exit={{ y: 100, opacity: 0 }}
           className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 pointer-events-auto"
        >
          <div className={`flex items-center gap-4 p-3 pr-6 rounded-2xl backdrop-blur-xl border border-t-white/20 shadow-2xl ${glassPanel}`}>
             
             {/* Part Info */}
             <div className="flex items-center gap-3 pl-2 border-r border-white/10 pr-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeItemBg} ${accentColor}`}>
                   {activePart && getIcon(activePart.type)}
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase opacity-50">Editing</div>
                  <div className="text-xs font-bold whitespace-nowrap">{activePart ? getFriendlyName(activePart.type) : "Part"}</div>
                </div>
             </div>

             {/* Tools */}
             <div className="flex items-center gap-2">
                <button onClick={rotateActivePart} className={`p-2.5 rounded-xl transition-all ${isDark ? "hover:bg-white/10" : "hover:bg-black/5"}`} title="Rotate 45°">
                   <RotateCcw size={18} />
                </button>
                
                <div className={`h-8 w-px mx-1 ${isDark ? "bg-white/10" : "bg-black/10"}`}></div>

                {/* Mode Toggle */}
                <div className={`flex p-1 rounded-xl ${isDark ? "bg-black/30" : "bg-slate-200/50"}`}>
                   <button 
                     onClick={togglePlacementMode}
                     className={`p-2 rounded-lg transition-all ${placementMode === 'free' ? (isDark ? "bg-slate-700 text-cyan-400 shadow-sm" : "bg-white text-blue-600 shadow-sm") : "opacity-50"}`}
                   >
                     <Move size={16} />
                   </button>
                   <button 
                     onClick={togglePlacementMode}
                     className={`p-2 rounded-lg transition-all ${placementMode === 'precision' ? (isDark ? "bg-slate-700 text-cyan-400 shadow-sm" : "bg-white text-blue-600 shadow-sm") : "opacity-50"}`}
                   >
                     <Sliders size={16} />
                   </button>
                </div>
             </div>

             {/* Dynamic Controls */}
             {placementMode === 'precision' && activePart ? (
               <div className="flex gap-3 px-2">
                 {['X', 'Y', 'Z'].map((axis, i) => (
                    <div key={axis} className="flex flex-col w-16">
                       <label className="text-[9px] font-bold opacity-50 mb-1 text-center">{axis}</label>
                       <input 
                         type="number" 
                         step="0.5"
                         value={activePart.position[i].toFixed(1)}
                         onChange={(e) => {
                             const newPos = [...activePart.position];
                             newPos[i] = parseFloat(e.target.value);
                             updatePartPosition(activePart.id, newPos[0], newPos[1], newPos[2]);
                         }}
                         className={`w-full text-center p-1 rounded text-xs font-mono bg-transparent border-b ${isDark ? "border-white/20 focus:border-cyan-500" : "border-black/20 focus:border-blue-500"} outline-none`}
                       />
                    </div>
                 ))}
               </div>
             ) : (
                <div className="flex flex-col w-32 px-2">
                    <div className="flex justify-between text-[9px] font-bold opacity-50 mb-1">
                      <span>HEIGHT</span>
                      <span>{activePart?.position[1].toFixed(1)}m</span>
                    </div>
                    <input 
                      type="range" min="0" max="50" step="0.5"
                      value={activePart?.position[1] || 0}
                      onChange={(e) => updatePartPosition(activePart.id, undefined, parseFloat(e.target.value), undefined)}
                      className="w-full h-1 bg-slate-400/30 rounded-full appearance-none accent-current cursor-ew-resize"
                    />
                </div>
             )}

             <button 
               onClick={lockActivePart}
               className="ml-2 px-6 py-3 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
             >
               DONE
             </button>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

    </div>
  );
}

// Simple SVG Icon helper
const ChevronDownIcon = () => (
  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 1L5 5L9 1" />
  </svg>
);