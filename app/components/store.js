import { create } from 'zustand';
import { temporal } from 'zundo';

export const INVENTORY = {
  frames: [
    { id: 'bottom_plate', label: 'Bottom Plate', type: 'bottom_plate' },
    { id: 'top_plate', label: 'Top Plate', type: 'top_plate' },
    { id: 'arm', label: 'Arm', type: 'arm' },
  ],
  propulsion: [
    { id: 'motor', label: 'Motor', type: 'motor' },
    { id: 'propellor_cw', label: 'Propeller (CW)', type: 'propellor_cw' },
    { id: 'propellor_ccw', label: 'Propeller (CCW)', type: 'propellor_ccw' },
  ],
  electronics: [
    { id: 'fc', label: 'Flight Controller', type: 'fc' },
    { id: 'esc', label: 'ESC (4-in-1)', type: 'esc' },
    { id: 'battery', label: 'Lipo Battery', type: 'battery' },
    { id: 'receiver', label: 'Receiver', type: 'receiver' },
    { id: 'gps_module', label: 'GPS Module', type: 'gps_module' },
  ]
};

export const useDroneStore = create(
  temporal(
    (set, get) => ({
      parts: [],
      activePartId: null,
      isCarrying: false,
      draggedPartType: null,

      setDraggedPartType: (type) => set({ draggedPartType: type }),

      spawnPart: (partType, position) => { 
        const uniqueId = `${partType}_${Date.now()}`;
        set((state) => ({
          parts: [...state.parts, {
            id: uniqueId,
            type: partType,
            position: position, 
            rotation: [0, 0, 0], 
            isLocked: false,
          }],
          activePartId: uniqueId,
          isCarrying: false 
        }));
      },

      selectPart: (id) => {
        const part = get().parts.find(p => p.id === id);
        if (part && !get().isCarrying) {
          set({ activePartId: id });
        }
      },
      
      // Updates position (X, Z) while preserving current Y (height)
      updatePartPosition: (id, newX, newZ) => set((state) => {
        const part = state.parts.find(p => p.id === id);
        if(!part) return {};
        return {
          parts: state.parts.map(p => 
            p.id === id ? { ...p, position: [newX, part.position[1], newZ] } : p
          )
        };
      }),

      setPartHeight: (id, height) => set((state) => {
        const part = state.parts.find(p => p.id === id);
        if (!part) return {};
        return {
          parts: state.parts.map(p => 
            p.id === id ? { ...p, position: [part.position[0], height, part.position[2]] } : p
          )
        };
      }),

      rotateActivePart: () => {
        const { activePartId, parts } = get();
        if (!activePartId) return;
        const part = parts.find(p => p.id === activePartId);
        // Rotating by 45 degrees (PI/4) for smoother manual control
        set((state) => ({
          parts: state.parts.map(p => 
            p.id === activePartId ? { ...p, rotation: [0, part.rotation[1] + (Math.PI / 4), 0] } : p
          )
        }));
      },

      lockActivePart: () => {
        set((state) => ({
          parts: state.parts.map(p => 
            p.id === state.activePartId ? { ...p, isLocked: true } : p
          ),
          activePartId: null,
          isCarrying: false
        }));
        // Snapshot for Undo/Redo
        useDroneStore.temporal.getState().resume();
      },

      deletePart: (id) => set((state) => ({
        parts: state.parts.filter(p => p.id !== id),
        activePartId: null,
        isCarrying: false
      })),
    }),
    {
      limit: 20,
      partialize: (state) => ({ parts: state.parts }),
    }
  )
);