import { create } from 'zustand';
import { temporal } from 'zundo';

// --- CONSTANTS ---
export const VARIANTS = {
  'battery': ['4S 1500mAh', '6S 1100mAh', '6S 1300mAh'],
  'motor_cw': ['1750KV', '1950KV', '2450KV', '2750KV'],
  'motor_ccw': ['1750KV', '1950KV', '2450KV', '2750KV'],
  'propellor_cw': ['5040 Tri-Blade', '5045 Bullnose', '5149 Freestyle'],
  'propellor_ccw': ['5040 Tri-Blade', '5045 Bullnose', '5149 Freestyle'],
  'fc': ['F405 Analog', 'F722 HD', 'H7 Extreme'],
  'esc': ['45A BlHeli_S', '55A BlHeli_32', '60A AM32'],
  'receiver': ['ELRS 2.4G', 'TBS Crossfire', 'FrSky R-XSR'],
  'gps_module': ['M8N Mini', 'M10 GPS', 'Beitian BN-880'],
  'bottom_plate': [], 
  'top_plate': [],
  'arm': []
};

export const INVENTORY = {
  frames: [
    { id: 'bottom_plate', label: 'Bottom Plate', type: 'bottom_plate' },
    { id: 'top_plate', label: 'Top Plate', type: 'top_plate' },
    { id: 'arm', label: 'Arm', type: 'arm' },
  ],
  propulsion: [
    { id: 'motor_cw', label: 'Motor (CW)', type: 'motor_cw' },
    { id: 'motor_ccw', label: 'Motor (CCW)', type: 'motor_ccw' },
    { id: 'propellor_cw', label: 'Propeller (CW)', type: 'propellor_cw' },
    { id: 'propellor_ccw', label: 'Propeller (CCW)', type: 'propellor_ccw' },
  ],
  electronics: [
    { id: 'fc', label: 'Flight Controller', type: 'fc' },
    { id: 'esc', label: 'ESC', type: 'esc' },
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
      
      // Placement Mode
      placementMode: 'free',
      togglePlacementMode: () => set((state) => ({ 
        placementMode: state.placementMode === 'free' ? 'precision' : 'free',
        isCarrying: false 
      })),

      // Configuration State
      configuredVariantData: null, 
      setConfiguredVariantData: (data) => set({ configuredVariantData: data }),

      setDraggedPartType: (type) => set({ draggedPartType: type }),

      spawnPart: (partType, position) => { 
        const uniqueId = `${partType}_${Date.now()}`;
        const { configuredVariantData } = get();
        
        let appliedVariant = '-';
        const availableVariants = VARIANTS[partType];
        
        // Auto-apply selected variant if it matches the dragged type
        if (availableVariants && availableVariants.length > 0) {
             if (configuredVariantData && configuredVariantData.type === partType && configuredVariantData.variant) {
                 appliedVariant = configuredVariantData.variant;
             } else {
                 appliedVariant = availableVariants[0]; // Default
             }
        }

        set((state) => ({
          parts: [...state.parts, {
            id: uniqueId,
            type: partType,
            variant: appliedVariant,
            position: position, 
            rotation: [0, 0, 0], 
            isLocked: false,
          }],
          activePartId: uniqueId,
          isCarrying: false,
        }));
      },

      selectPart: (id) => {
        const part = get().parts.find(p => p.id === id);
        if (part && !get().isCarrying) {
          set({ activePartId: id });
        }
      },
      
      updatePartPosition: (id, x, y, z) => set((state) => {
        const part = state.parts.find(p => p.id === id);
        if(!part) return {};
        const newX = x !== undefined ? x : part.position[0];
        const newY = y !== undefined ? y : part.position[1];
        const newZ = z !== undefined ? z : part.position[2];
        
        return {
          parts: state.parts.map(p => 
            p.id === id ? { ...p, position: [newX, newY, newZ] } : p
          )
        };
      }),

      rotateActivePart: () => {
        const { activePartId, parts } = get();
        if (!activePartId) return;
        const part = parts.find(p => p.id === activePartId);
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
        useDroneStore.temporal.getState().resume();
      },

      // Delete Function
      deletePart: (id) => set((state) => ({
        parts: state.parts.filter(p => p.id !== id),
        activePartId: null,
        isCarrying: false
      })),

      resetScene: () => {
        set({ parts: [], activePartId: null, isCarrying: false });
        useDroneStore.temporal.getState().clear();
      }
    }),
    {
      limit: 20,
      partialize: (state) => ({ parts: state.parts }),
    }
  )
);