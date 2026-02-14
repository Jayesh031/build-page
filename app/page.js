"use client";
import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from 'zustand';
import { 
  ChevronRight, ChevronLeft, RotateCcw, Box, Layers, Zap, Cpu, 
  Move, Sliders, Minus, Plus, ChevronDown, Check, X as CloseIcon,
  Maximize, Eye, Grid as GridIcon, Cube, LayoutTemplate, EyeOff, Trash2,
  AlertTriangle, Scale, IndianRupee, Activity, Gauge, Hand
} from 'lucide-react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { GizmoHelper, GizmoViewport } from '@react-three/drei';

import DroneScene from './components/DroneScene'; 
import { useDroneStore, INVENTORY, VARIANTS } from './components/store'; 
import { useTheme } from './components/ThemeProvider'; 

// --- STYLES ---
const GlobalStyles = () => (
  <style jsx global>{`
    input[type=number]::-webkit-inner-spin-button, 
    input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
    input[type=number] { -moz-appearance: textfield; }
  `}</style>
);

const NavbarBackdrop = ({ isDark }) => {
  if (!isDark) return null;
  return <div className="fixed top-0 left-0 w-full h-24 bg-gradient-to-b from-[#090e1a] to-transparent z-40 pointer-events-none" />;
};

const Tooltip = ({ text, isDark }) => (
  <motion.div 
    initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: -5 }} exit={{ opacity: 0, y: 0 }}
    className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-[10px] font-bold rounded shadow-lg whitespace-nowrap z-50 pointer-events-none
      ${isDark ? "bg-slate-800 border border-cyan-500/30 text-cyan-50" : "bg-slate-800 text-white"}`}
  >
    {text}
    <div className={`absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent ${isDark ? "border-t-slate-800" : "border-t-slate-800"}`}></div>
  </motion.div>
);

const TrashButton = ({ onClick, isDark }) => {
  return (
    <button 
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200
        ${isDark 
          ? "text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:scale-110" 
          : "text-slate-400 hover:text-red-500 hover:bg-red-50 hover:scale-110"}`}
    >
      <Trash2 size={16} />
    </button>
  );
};

const CustomSelect = ({ options, value, onChange, isDark, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => { if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  const glassInput = isDark 
    ? "bg-slate-900/50 border-white/10 text-white hover:border-cyan-500/50 hover:bg-slate-900/80" 
    : "bg-white/60 border-slate-200 text-slate-700 hover:border-blue-400";

  return (
    <div className="relative w-full" ref={containerRef}>
      <button onClick={() => setIsOpen(!isOpen)} className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold border transition-all ${glassInput} ${isOpen ? (isDark ? 'ring-1 ring-cyan-500 border-cyan-500' : 'ring-2 ring-blue-500/50 border-blue-500') : ''}`}>
        <span className={!value ? "opacity-50" : ""}>{value || placeholder}</span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }}><ChevronDown size={14} /></motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className={`absolute top-full left-0 right-0 mt-2 z-50 rounded-xl border shadow-2xl overflow-hidden max-h-48 overflow-y-auto ${isDark ? "bg-slate-900 border-cyan-500/30 shadow-cyan-500/10" : "bg-white border-slate-200"}`}>
            {options.map((opt) => (
              <button key={opt.label} onClick={() => { onChange(opt.label); setIsOpen(false); }} className={`w-full text-left px-4 py-3 text-xs font-bold transition-colors flex items-center justify-between ${isDark ? "hover:bg-cyan-500/10 text-slate-200 border-b border-white/5 last:border-0" : "hover:bg-slate-50 text-slate-700"} ${value === opt.label ? (isDark ? "bg-cyan-500/20 text-cyan-300" : "bg-blue-50 text-blue-600") : ""}`}>
                {opt.label} {value === opt.label && <Check size={12} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- GIZMO ---
function GizmoSync({ mainControlsRef }) {
   const { camera } = useThree();
   useFrame(() => {
      if (mainControlsRef?.current?.object) {
         camera.quaternion.copy(mainControlsRef.current.object.quaternion);
         camera.position.set(0, 0, 100).applyQuaternion(camera.quaternion);
         camera.lookAt(0,0,0);
      }
   });
   return null;
}

const SidebarGizmo = ({ isDark }) => {
  const mainControlsRef = useDroneStore((s) => s.mainControlsRef);
  return (
    <div className="w-full h-full">
      <Canvas gl={{ alpha: true }} camera={{ position: [0, 0, 100], fov: 45 }}>
        <GizmoSync mainControlsRef={mainControlsRef} />
        <GizmoHelper alignment="center" renderPriority={1}>
          <GizmoViewport axisColors={['#9d4b4b', '#2f7f4f', '#3b5b9d']} labelColor={isDark ? "white" : "black"} />
        </GizmoHelper>
        <ambientLight intensity={1} />
      </Canvas>
    </div>
  );
};

// --- FLIGHT STATUS BAR ---
const FlightStatusBar = ({ isDark }) => {
  const parts = useDroneStore((s) => s.parts);
  
  const stats = useMemo(() => {
    let totalWeight = 0;
    let totalPrice = 0;
    let totalThrust = 0;
    let voltage = 0;
    let maxEscVoltage = 999;
    let warnings = [];

    parts.forEach(p => {
      const variantList = VARIANTS[p.type];
      const data = variantList?.find(v => v.label === p.variant);
      
      if (data) {
        totalWeight += data.weight || 0;
        totalPrice += data.price || 0;
        
        if (p.type === 'battery') voltage = data.voltage || 0;
        if (p.type === 'esc') maxEscVoltage = Math.min(maxEscVoltage, data.maxVoltage || 999);
        if (p.type.includes('motor')) totalThrust += (data.thrust || 0);
      }
    });

    if (voltage > maxEscVoltage) {
      warnings.push("VOLTAGE WARNING");
    }
    
    // TWR Calculation
    const twr = totalWeight > 0 ? (totalThrust / totalWeight).toFixed(1) : 0;

    return { totalWeight, totalPrice, twr, warnings };
  }, [parts]);

  return (
    <div className={`pointer-events-auto absolute top-24 left-1/2 transform -translate-x-1/2 z-30 flex items-center gap-4 px-6 py-3 rounded-full border backdrop-blur-xl shadow-2xl transition-all
      ${isDark ? "bg-[#0f172a]/80 border-cyan-500/30 text-slate-200" : "bg-white/90 border-slate-200 shadow-slate-200/50 text-slate-700"}`}>
      
      <div className={`pr-4 border-r ${isDark ? "border-cyan-500/20" : "border-slate-300"}`}>
        <Activity size={18} className={isDark ? "text-cyan-400" : "text-blue-600"} />
      </div>

      <div className="flex items-center gap-6">
         {/* Weight */}
         <div className="flex flex-col items-center">
            <span className="text-[9px] font-bold opacity-60 tracking-wider">WEIGHT</span>
            <div className="font-mono text-sm font-bold flex items-center gap-1">
               <Scale size={12} className={isDark ? "text-cyan-500" : "text-blue-500"}/>
               {stats.totalWeight}g
            </div>
         </div>

         {/* Price (INR) */}
         <div className="flex flex-col items-center">
            <span className="text-[9px] font-bold opacity-60 tracking-wider">COST</span>
            <div className="font-mono text-sm font-bold flex items-center gap-1">
               <IndianRupee size={12} className={isDark ? "text-emerald-400" : "text-green-600"}/>
               {stats.totalPrice.toLocaleString('en-IN')}
            </div>
         </div>

         {/* TWR */}
         <div className="flex flex-col items-center">
            <span className="text-[9px] font-bold opacity-60 tracking-wider">TWR</span>
            <div className={`font-mono text-sm font-bold flex items-center gap-1 ${stats.twr > 4 ? "text-emerald-500" : (stats.twr > 0 ? "text-amber-500" : "")}`}>
               <Gauge size={12} />
               {stats.twr > 0 ? `${stats.twr}:1` : "-"}
            </div>
         </div>
      </div>

      {/* Dynamic Warning Label */}
      <AnimatePresence>
        {stats.warnings.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, width: 0, scale: 0.8 }} 
            animate={{ opacity: 1, width: 'auto', scale: 1 }} 
            exit={{ opacity: 0, width: 0, scale: 0.8 }}
            className="flex items-center gap-2 pl-4 border-l border-red-500/30 overflow-hidden"
          >
             <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
                <AlertTriangle size={16} className="text-red-500" />
             </div>
             <span className="text-[10px] font-bold text-red-400 whitespace-nowrap">OVER VOLTAGE</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- MAIN BUILDER PAGE ---
export default function BuilderPage() {
  const { theme } = useTheme(); 
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = theme === 'dark';

  // Store
  const parts = useDroneStore((s) => s.parts);
  const activePartId = useDroneStore((s) => s.activePartId);
  const setDraggedPartType = useDroneStore((s) => s.setDraggedPartType);
  const setConfiguredVariantData = useDroneStore((s) => s.setConfiguredVariantData);
  const lockActivePart = useDroneStore((s) => s.lockActivePart);
  const updatePartPosition = useDroneStore((s) => s.updatePartPosition);
  const rotateActivePart = useDroneStore((s) => s.rotateActivePart);
  const resetScene = useDroneStore((s) => s.resetScene);
  const deletePart = useDroneStore((s) => s.deletePart);
  const updatePartVariant = useDroneStore((s) => s.updatePartVariant);
  const placementMode = useDroneStore((s) => s.placementMode);
  const togglePlacementMode = useDroneStore((s) => s.togglePlacementMode);
  const { undo, redo, pastStates, futureStates } = useStore(useDroneStore.temporal, (state) => state);

  // Viewport & Ghost Store
  const isGridVisible = useDroneStore((s) => s.isGridVisible);
  const isWireframe = useDroneStore((s) => s.isWireframe);
  const isExploded = useDroneStore((s) => s.isExploded);
  const isPanMode = useDroneStore((s) => s.isPanMode); // NEW
  const toggleGrid = useDroneStore((s) => s.toggleGrid);
  const toggleWireframe = useDroneStore((s) => s.toggleWireframe);
  const toggleExploded = useDroneStore((s) => s.toggleExploded);
  const togglePanMode = useDroneStore((s) => s.togglePanMode); // NEW
  const cameraActions = useDroneStore((s) => s.cameraActions);
  const togglePartGhost = useDroneStore((s) => s.togglePartGhost);

  // UI State
  const [selectedPartType, setSelectedPartType] = useState('bottom_plate'); 
  const [selectedVariant, setSelectedVariant] = useState('');
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [activeAxis, setActiveAxis] = useState('Y');
  const [hoveredBtn, setHoveredBtn] = useState(null);

  const activePart = parts.find(p => p.id === activePartId);

  // Sync Right Panel with Active Part
  useEffect(() => {
    if (activePartId) {
       const part = parts.find(p => p.id === activePartId);
       if (part) {
          setSelectedPartType(part.type);
          setSelectedVariant(part.variant);
       }
    }
  }, [activePartId, parts]);

  const handleVariantChange = (val) => {
     setSelectedVariant(val);
     if (activePartId) {
        updatePartVariant(activePartId, val);
     } else {
        setConfiguredVariantData({ type: selectedPartType, variant: val });
     }
  };

  // Helpers
  const getIcon = (type) => {
    if (type.includes('motor')) return <Zap size={18} />;
    if (type.includes('propellor')) return <RotateCcw size={18} />; 
    if (['fc', 'esc', 'receiver', 'gps_module'].includes(type)) return <Cpu size={18} />;
    if (type === 'battery') return <Box size={18} />;
    return <Layers size={18} />;
  };
  const getFriendlyName = (type) => INVENTORY.frames.find(i => i.type === type)?.label || INVENTORY.propulsion.find(i => i.type === type)?.label || INVENTORY.electronics.find(i => i.type === type)?.label || type;
  const handleInventoryClick = (type) => { setSelectedPartType(type); setSelectedVariant(''); setConfiguredVariantData({ type, variant: null }); };

  const getCurrentValue = () => {
    if(!activePart) return 0;
    let val = 0;
    if(activeAxis === 'X') val = activePart.position[0];
    if(activeAxis === 'Y') val = activePart.position[1];
    if(activeAxis === 'Z') val = activePart.position[2];
    return isNaN(val) ? 0 : val;
  };

  const handleValueChange = (val) => {
    if(!activePart) return;
    const safeVal = isNaN(val) ? 0 : val;
    
    const newPos = [...activePart.position];
    if(activeAxis === 'X') newPos[0] = safeVal;
    if(activeAxis === 'Y') newPos[1] = safeVal;
    if(activeAxis === 'Z') newPos[2] = safeVal;
    updatePartPosition(activePart.id, newPos[0], newPos[1], newPos[2]);
  };

  const containerClass = isDark 
    ? "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0f172a] via-[#090e1a] to-black text-slate-100" 
    : "bg-slate-50 text-slate-800";

  const glassPanel = isDark 
    ? "bg-[#0f172a]/80 backdrop-blur-xl border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]" 
    : "bg-white/90 border-white/50 shadow-xl";

  const accentColor = isDark ? "text-cyan-400" : "text-blue-600";
  const activeItemBg = isDark ? "bg-cyan-500/20 border-cyan-500/50 shadow-[inset_0_0_10px_rgba(6,182,212,0.2)]" : "bg-blue-500/10 border-blue-500/30";

  // Reusable Viewport Button
  const ViewBtn = ({ onClick, icon, active, tooltip }) => (
    <div className="relative group" onMouseEnter={() => setHoveredBtn(tooltip)} onMouseLeave={() => setHoveredBtn(null)}>
       <button onClick={onClick} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${active ? (isDark ? "bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.4)]" : "bg-blue-600 text-white") : (isDark ? "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-white")}`}>
         {icon}
       </button>
       {hoveredBtn === tooltip && <Tooltip text={tooltip} isDark={isDark} />}
    </div>
  );

  if (!mounted) return null; 

  return (
    <div className={`relative h-screen w-screen overflow-hidden ${containerClass}`}>
      <GlobalStyles />
      <NavbarBackdrop isDark={isDark} />

      <FlightStatusBar isDark={isDark} />

      <div className="absolute inset-0 z-0">
         <DroneScene isDark={isDark} isRightCollapsed={isRightCollapsed} />
      </div>

      <div className="absolute inset-0 z-10 pointer-events-none pt-24 flex justify-between p-4">
        
        {/* LEFT PANEL */}
        <motion.div initial={{ x: -300 }} animate={{ x: isLeftCollapsed ? -260 : 0 }} className={`pointer-events-auto relative flex flex-col w-72 h-[calc(100vh-8rem)] rounded-3xl border border-t-white/10 ${glassPanel}`}>
          <button onClick={() => setIsLeftCollapsed(!isLeftCollapsed)} className={`absolute -right-4 top-6 w-8 h-8 rounded-full flex items-center justify-center shadow-lg border backdrop-blur-md ${isDark ? "bg-slate-900 border-cyan-500/50 text-cyan-400 hover:bg-slate-800" : "bg-white border-slate-200 text-slate-600"}`}>
            {isLeftCollapsed ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
          </button>
          <div className={`p-5 border-b ${isDark ? "border-cyan-500/20" : "border-black/5"}`}><h2 className={`text-xs font-bold uppercase tracking-widest ${isDark ? "text-cyan-400/80" : "opacity-70"}`}>Library</h2></div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-rounded">
            {Object.entries(INVENTORY).map(([category, items]) => (
              <div key={category}>
                <h3 className={`text-[10px] font-bold uppercase mb-3 ml-1 ${isDark ? "text-slate-400" : "opacity-50"}`}>{category}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {items.map((item) => {
                    const isSelected = selectedPartType === item.type;
                    return (
                      <div key={item.id} draggable={true} onClick={() => handleInventoryClick(item.type)} onDragStart={() => { handleInventoryClick(item.type); setDraggedPartType(item.type); }} onDragEnd={() => setDraggedPartType(null)} 
                        className={`cursor-pointer group relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-300
                        ${isSelected ? `${activeItemBg} ring-1 ring-offset-0 ${isDark ? "ring-cyan-500/50" : "ring-blue-500/30"}` : `border-transparent hover:scale-[1.02] ${isDark ? "bg-slate-800/50 hover:bg-slate-800/80 hover:border-cyan-500/30" : "bg-white/40 hover:bg-white/70"}`}`}>
                        <div className={`mb-2 opacity-80 transition-transform group-hover:scale-110 ${isSelected ? accentColor : (isDark ? "text-slate-300" : "")}`}>{getIcon(item.type)}</div>
                        <span className={`text-[10px] font-bold text-center leading-tight ${isSelected ? accentColor : (isDark ? "text-slate-300" : "opacity-70")}`}>{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className={`p-4 border-t grid grid-cols-2 gap-2 ${isDark ? "border-cyan-500/20" : "border-black/5"}`}>
             <button onClick={() => undo()} disabled={pastStates.length === 0} className={`py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all shadow-lg ${isDark ? "bg-cyan-500/20 hover:bg-cyan-500/40 border-cyan-500/50 text-cyan-300 disabled:bg-slate-800 disabled:text-slate-600 disabled:border-transparent" : "bg-blue-100 hover:bg-blue-200 text-blue-700 disabled:bg-slate-100 disabled:text-slate-400"}`}>Undo</button>
             <button onClick={() => redo()} disabled={futureStates.length === 0} className={`py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all shadow-lg ${isDark ? "bg-cyan-500/20 hover:bg-cyan-500/40 border-cyan-500/50 text-cyan-300 disabled:bg-slate-800 disabled:text-slate-600 disabled:border-transparent" : "bg-blue-100 hover:bg-blue-200 text-blue-700 disabled:bg-slate-100 disabled:text-slate-400"}`}>Redo</button>
          </div>
        </motion.div>

        {/* RIGHT SIDEBAR */}
        <motion.div initial={{ x: 300 }} animate={{ x: isRightCollapsed ? 260 : 0 }} className="relative flex flex-col w-80 h-[calc(100vh-8rem)] gap-4">
           {/* Toggle */}
           <button onClick={() => setIsRightCollapsed(!isRightCollapsed)} className={`pointer-events-auto absolute -left-4 top-6 w-8 h-8 rounded-full flex items-center justify-center shadow-lg border backdrop-blur-md z-50 ${isDark ? "bg-slate-900 border-cyan-500/50 text-cyan-400 hover:bg-slate-800" : "bg-white border-slate-200 text-slate-600"}`}>
            {isRightCollapsed ? <ChevronLeft size={16}/> : <ChevronRight size={16}/>}
          </button>

           {/* --- TOP: VIEWPORT COMMAND CENTER --- */}
           <div className={`flex flex-col h-[30%] rounded-3xl backdrop-blur-xl border border-t-white/10 p-4 ${glassPanel} relative overflow-hidden pointer-events-auto`}>
              <div className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${isDark ? "text-cyan-400/80" : "text-slate-500 opacity-60"}`}>Viewport</div>
              <div className="flex h-full gap-3">
                 <div className="grid grid-cols-3 gap-2 content-start z-10">
                     <ViewBtn onClick={cameraActions.setTop} icon={<LayoutTemplate size={14}/>} tooltip="Top View" />
                     <ViewBtn onClick={cameraActions.setFront} icon={<Box size={14}/>} tooltip="Front View" />
                     <ViewBtn onClick={cameraActions.setSide} icon={<Box size={14} className="rotate-90"/>} tooltip="Side View" />
                     <div className="h-2 col-span-3"></div> 
                     
                     <ViewBtn onClick={togglePanMode} icon={<Hand size={14}/>} active={isPanMode} tooltip="Pan Mode (Hand Tool)" />
                     <ViewBtn onClick={toggleExploded} icon={<Layers size={14}/>} active={isExploded} tooltip="Exploded View" />
                     <ViewBtn onClick={toggleWireframe} icon={<Eye size={14}/>} active={isWireframe} tooltip="Global X-Ray" />
                     <ViewBtn onClick={toggleGrid} icon={<GridIcon size={14}/>} active={isGridVisible} tooltip="Toggle Grid" />
                     <ViewBtn onClick={cameraActions.reset} icon={<Maximize size={14}/>} tooltip="Reset View" />
                 </div>
                 <div className="flex-1 relative rounded-2xl border bg-black/5 overflow-hidden">
                     <SidebarGizmo isDark={isDark} />
                 </div>
              </div>
           </div>

           {/* --- BOTTOM: CONFIGURATOR (70%) --- */}
           <div className={`pointer-events-auto flex flex-col h-[70%] rounded-3xl backdrop-blur-xl border border-t-white/10 overflow-hidden ${glassPanel}`}>
              <div className={`p-5 border-b ${isDark ? "border-cyan-500/20" : "border-black/5"}`}>
                <h2 className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? "text-cyan-400/80" : "opacity-70"}`}>Configurator</h2>
                <div className={`p-3 rounded-xl mb-3 border flex items-center gap-3 ${isDark ? "bg-slate-900/50 border-cyan-500/30" : "bg-white/40 border-black/5"}`}>
                  <div className={`${accentColor}`}>{getIcon(selectedPartType)}</div>
                  <div className="flex-1">
                     <div className={`text-xs font-extrabold ${isDark ? "text-white" : "text-slate-800"}`}>{getFriendlyName(selectedPartType)}</div>
                     <div className={`text-[9px] font-mono ${isDark ? "text-slate-400" : "opacity-50"}`}>{VARIANTS[selectedPartType]?.length > 0 ? "Select Variant" : "Standard"}</div>
                  </div>
                </div>
                {VARIANTS[selectedPartType]?.length > 0 && (
                  <CustomSelect options={VARIANTS[selectedPartType]} value={selectedVariant} placeholder="Select Variant..." isDark={isDark} onChange={handleVariantChange} />
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <h3 className={`text-[10px] font-bold uppercase mb-3 ${isDark ? "text-slate-400" : "opacity-50"}`}>Installed ({parts.length})</h3>
                <AnimatePresence>
                  {parts.map((p) => (
                    <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`p-3 rounded-xl border flex justify-between items-center transition-colors ${isDark ? "bg-slate-800/30 border-cyan-500/10 hover:border-cyan-500/30" : "bg-white/60 border-black/5"}`}>
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${isDark ? "bg-slate-900 text-cyan-400" : "bg-white text-slate-500"}`}>{getIcon(p.type)}</div>
                        <div>
                          <div className={`text-[11px] font-bold ${isDark ? "text-slate-200" : ""}`}>{getFriendlyName(p.type)}</div>
                          <div className={`text-[9px] font-mono ${isDark ? "text-slate-500" : "opacity-50"}`}>{p.variant !== '-' ? p.variant : 'STD'}</div>
                        </div>
                      </div>
                      <TrashButton onClick={() => deletePart(p.id)} isDark={isDark} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              <div className={`p-4 mt-auto ${isDark ? "border-t border-cyan-500/20" : "border-t border-black/5"}`}>
                <button onClick={resetScene} className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-red-500 hover:bg-red-500/10 transition-colors">Reset Build</button>
              </div>
           </div>
        </motion.div>
      </div>

      {/* --- BOTTOM PANEL: PART CONTROLS --- */}
      <AnimatePresence>
      {activePartId && (
        <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-20 pointer-events-auto">
          <div className={`flex items-center gap-6 p-4 rounded-full backdrop-blur-2xl border shadow-2xl ${isDark ? "bg-[#0f172a]/90 border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.2)]" : "bg-white/90 border-white/80 shadow-slate-200/50"}`}>
             
             {/* Info */}
             <div className={`flex items-center gap-4 pl-2 border-r pr-6 relative ${isDark ? "border-cyan-500/20" : "border-gray-500/20"}`} onMouseEnter={() => setHoveredBtn("info")} onMouseLeave={() => setHoveredBtn(null)}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeItemBg} ${accentColor}`}>{activePart && getIcon(activePart.type)}</div>
                <div><div className={`text-[10px] font-bold uppercase ${isDark ? "text-slate-400" : "opacity-50"}`}>Selected</div><div className={`text-sm font-extrabold whitespace-nowrap ${isDark ? "text-white" : "text-slate-900"}`}>{activePart ? getFriendlyName(activePart.type) : "Part"}</div></div>
                {hoveredBtn === "info" && <Tooltip text="Current Active Part" isDark={isDark} />}
             </div>

             {/* Mode Toggles */}
             <div className="flex items-center gap-3">
                <div className="relative" onMouseEnter={() => setHoveredBtn("rotate")} onMouseLeave={() => setHoveredBtn(null)}>
                    <button onClick={rotateActivePart} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isDark ? "hover:bg-cyan-500/20 text-white" : "hover:bg-slate-100 text-slate-700"}`}><RotateCcw size={18} /></button>
                    {hoveredBtn === "rotate" && <Tooltip text="Rotate 45°" isDark={isDark} />}
                </div>

                <div className="relative" onMouseEnter={() => setHoveredBtn("ghost")} onMouseLeave={() => setHoveredBtn(null)}>
                    <button onClick={togglePartGhost} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${activePart?.isGhosted ? (isDark ? "bg-cyan-500 text-black" : "bg-blue-600 text-white") : (isDark ? "hover:bg-cyan-500/20 text-white" : "hover:bg-slate-100 text-slate-700")}`}>
                       {activePart?.isGhosted ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                    {hoveredBtn === "ghost" && <Tooltip text="X-Ray Selected Part" isDark={isDark} />}
                </div>

                <div className={`h-8 w-px mx-1 ${isDark ? "bg-cyan-500/20" : "bg-black/10"}`}></div>
                <div className={`flex p-1 rounded-full ${isDark ? "bg-slate-900/50 border border-cyan-500/20" : "bg-slate-100"}`}>
                   <div className="relative" onMouseEnter={() => setHoveredBtn("free")} onMouseLeave={() => setHoveredBtn(null)}>
                       <button onClick={togglePlacementMode} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${placementMode === 'free' ? (isDark ? "bg-cyan-500 text-black" : "bg-white text-blue-600 shadow-sm") : (isDark ? "text-slate-400" : "opacity-50 text-slate-400")}`}><Move size={16} /></button>
                       {hoveredBtn === "free" && <Tooltip text="Free Move" isDark={isDark} />}
                   </div>
                   <div className="relative" onMouseEnter={() => setHoveredBtn("precision")} onMouseLeave={() => setHoveredBtn(null)}>
                       <button onClick={togglePlacementMode} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${placementMode === 'precision' ? (isDark ? "bg-cyan-500 text-black" : "bg-white text-blue-600 shadow-sm") : (isDark ? "text-slate-400" : "opacity-50 text-slate-400")}`}><Sliders size={16} /></button>
                       {hoveredBtn === "precision" && <Tooltip text="Precision Sliders" isDark={isDark} />}
                   </div>
                </div>
             </div>

             <div className="flex items-center gap-4 min-w-[260px] px-2">
               {placementMode === 'precision' ? (
                 <>
                   <div className="flex gap-1">
                        {['X', 'Y', 'Z'].map(axis => (
                           <button key={axis} onClick={() => setActiveAxis(axis)} className={`w-8 h-8 rounded-full text-[10px] font-bold transition-all ${activeAxis === axis ? (isDark ? "bg-cyan-500 text-black" : "bg-blue-600 text-white") : (isDark ? "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700" : "bg-slate-100 text-slate-500 hover:text-slate-900")}`}>{axis}</button>
                        ))}
                   </div>
                   <div className="flex-1 flex items-center gap-2">
                      <button onClick={() => handleValueChange(parseFloat((getCurrentValue() - 0.5).toFixed(1)))} className={`w-8 h-8 flex items-center justify-center rounded-full hover:bg-opacity-20 ${isDark ? "bg-slate-800 text-white hover:bg-cyan-500/20" : "bg-slate-100 text-slate-700"}`}><Minus size={14}/></button>
                      <input type="number" value={getCurrentValue()} onChange={(e) => handleValueChange(parseFloat(e.target.value))} className={`w-16 h-8 text-center rounded-lg text-sm font-mono font-bold bg-transparent border outline-none ${isDark ? "border-cyan-500/30 text-white focus:border-cyan-500" : "border-slate-300 text-slate-800 focus:border-blue-500"}`} />
                      <button onClick={() => handleValueChange(parseFloat((getCurrentValue() + 0.5).toFixed(1)))} className={`w-8 h-8 flex items-center justify-center rounded-full hover:bg-opacity-20 ${isDark ? "bg-slate-800 text-white hover:bg-cyan-500/20" : "bg-slate-100 text-slate-700"}`}><Plus size={14}/></button>
                   </div>
                 </>
               ) : (
                 <div className="flex-1 flex items-center gap-3">
                    <span className={`text-[10px] font-bold w-10 ${isDark ? "text-slate-300" : "text-slate-600 opacity-60"}`}>ELEV</span>
                    <input type="range" min="0" max="50" step="0.5" value={activePart?.position[1] || 0} onChange={(e) => updatePartPosition(activePart.id, undefined, parseFloat(e.target.value), undefined)} className="flex-1 h-1.5 rounded-full appearance-none bg-slate-400/30 accent-current cursor-ew-resize"/>
                 </div>
               )}
             </div>

             <div className={`pl-6 ml-6 border-l relative ${isDark ? "border-cyan-500/20" : "border-gray-500/20"}`} onMouseEnter={() => setHoveredBtn("confirm")} onMouseLeave={() => setHoveredBtn(null)}>
                <button onClick={lockActivePart} className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"><Check size={20} /></button>
                {hoveredBtn === "confirm" && <Tooltip text="Confirm Position" isDark={isDark} />}
             </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}