"use client";
import DroneScene from './components/DroneScene'; 
import { useDroneStore, INVENTORY } from './components/store'; 
import { useStore } from 'zustand';

export default function BuilderPage() {
  const parts = useDroneStore((s) => s.parts);
  const activePartId = useDroneStore((s) => s.activePartId);
  const isCarrying = useDroneStore((s) => s.isCarrying);
  const setDraggedPartType = useDroneStore((s) => s.setDraggedPartType);
  
  const lockActivePart = useDroneStore((s) => s.lockActivePart);
  const setPartHeight = useDroneStore((s) => s.setPartHeight);
  const rotateActivePart = useDroneStore((s) => s.rotateActivePart);

  // Undo/Redo
  const { undo, redo, pastStates, futureStates } = useStore(useDroneStore.temporal, (state) => state);
  const historyDepth = pastStates.length;
  const futureDepth = futureStates.length;

  const activePart = parts.find(p => p.id === activePartId);
  const currentHeight = activePart ? activePart.position[1] : 0;

  // Helper to get icon based on type
  const getIcon = (type) => {
    if (type.includes('motor')) return '⚡';
    if (type.includes('propellor')) return '☢'; // Fan/Prop icon
    if (['fc', 'esc', 'receiver', 'gps_module'].includes(type)) return '💾';
    if (type === 'battery') return '🔋';
    return '🛠️'; // Frame parts
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 text-slate-800 font-sans relative">
      
      {/* SIDEBAR */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col z-10 relative shadow-xl">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <h1 className="font-extrabold text-xl tracking-tight text-slate-900">
            Drone<span className="text-blue-600">Lab</span>
          </h1>
          <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-1 rounded-full">BUILDER</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-8">
          {Object.entries(INVENTORY).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-[11px] font-bold text-slate-400 uppercase mb-3 tracking-widest">{category}</h3>
              <div className="grid grid-cols-2 gap-3">
                {items.map((item) => (
                  <div 
                    key={item.id}
                    draggable={true}
                    onDragStart={(e) => setDraggedPartType(item.type)}
                    onDragEnd={() => setDraggedPartType(null)}
                    className="cursor-grab active:cursor-grabbing bg-slate-50 hover:bg-white hover:shadow-md p-3 rounded-xl text-xs text-center border border-slate-200 hover:border-blue-400 transition-all group duration-200"
                  >
                    <div className="w-full h-12 bg-white rounded-lg mb-2 flex items-center justify-center text-2xl shadow-sm border border-slate-100">
                      {getIcon(item.type)}
                    </div>
                    <span className="font-medium text-slate-600 group-hover:text-blue-600">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-100 grid grid-cols-2 gap-3 bg-gray-50">
          <button onClick={() => undo()} disabled={historyDepth === 0} className="bg-white border border-gray-200 py-2 rounded-lg text-xs font-semibold hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white transition-colors text-slate-600">↩ Undo</button>
          <button onClick={() => redo()} disabled={futureDepth === 0} className="bg-white border border-gray-200 py-2 rounded-lg text-xs font-semibold hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white transition-colors text-slate-600">Redo ↪</button>
        </div>
      </div>

      {/* 3D AREA */}
      <div className="flex-1 relative">
        <DroneScene />
        
        {parts.length === 0 && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-slate-300 pointer-events-none text-center select-none">
            <div className="text-6xl mb-4 opacity-50">✥</div>
            <p className="text-lg font-medium">Drag parts to start building</p>
          </div>
        )}

        {/* CONTROL BAR (Bottom Center) */}
        {activePartId && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 w-[600px] max-w-full">
            <div className="bg-white/80 backdrop-blur-md border border-white/50 rounded-2xl p-4 shadow-2xl flex items-center gap-6 ring-1 ring-black/5">
              
              {/* Height Control */}
              <div className="flex-1">
                <div className="flex justify-between text-[11px] text-slate-500 mb-2 font-bold uppercase tracking-wider">
                  <span>Elevation (Y-Axis)</span>
                  <span className="text-blue-600 font-mono bg-blue-50 px-2 rounded">{currentHeight.toFixed(2)}m</span>
                </div>
                <input 
                  type="range" min="0" max="9.0" step="0.01"
                  value={currentHeight}
                  onChange={(e) => setPartHeight(activePartId, parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div className="h-8 w-px bg-slate-200 mx-2"></div>

              {/* Rotation Control */}
              <button 
                onClick={rotateActivePart} 
                className="w-12 h-12 bg-white hover:bg-slate-50 rounded-full border border-slate-200 flex items-center justify-center transition-all active:scale-95 text-xl shadow-sm text-slate-700" 
                title="Rotate 45°"
              >
                ⟳
              </button>

              {/* Lock Button */}
              <button 
                onClick={lockActivePart} 
                disabled={isCarrying} 
                className={`px-8 py-3 rounded-xl font-bold shadow-md transition-all flex items-center gap-2 
                  ${isCarrying 
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200" 
                    : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20"}`
                }
              >
                {isCarrying ? 'Placing...' : '✓ Fix Position'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}