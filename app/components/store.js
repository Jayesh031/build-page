import { create } from 'zustand';
import { temporal } from 'zundo';

// --- RICH DATA VARIANTS (Indian Rupees ₹) ---
export const VARIANTS = {
  'battery': [
    { label: '4S 1500mAh', weight: 175, price: 1850, voltage: 16.8, type: 'battery' },
    { label: '6S 1100mAh', weight: 190, price: 2450, voltage: 25.2, type: 'battery' },
    { label: '6S 1300mAh', weight: 210, price: 2899, voltage: 25.2, type: 'battery' } // High Voltage
  ],
  'motor_cw': [
    { label: '1750KV', weight: 32, price: 1699, maxVoltage: 25.2, thrust: 1300 },
    { label: '1950KV', weight: 32, price: 1699, maxVoltage: 25.2, thrust: 1400 },
    { label: '2450KV', weight: 30, price: 1549, maxVoltage: 16.8, thrust: 1100 },
    { label: '2750KV', weight: 30, price: 1549, maxVoltage: 16.8, thrust: 1200 }
  ],
  'motor_ccw': [
    { label: '1750KV', weight: 32, price: 1699, maxVoltage: 25.2, thrust: 1300 },
    { label: '1950KV', weight: 32, price: 1699, maxVoltage: 25.2, thrust: 1400 },
    { label: '2450KV', weight: 30, price: 1549, maxVoltage: 16.8, thrust: 1100 },
    { label: '2750KV', weight: 30, price: 1549, maxVoltage: 16.8, thrust: 1200 }
  ],
  'propellor_cw': [
    { label: '5040 Tri-Blade', weight: 4, price: 150 },
    { label: '5045 Bullnose', weight: 5, price: 150 },
    { label: '5149 Freestyle', weight: 4.5, price: 249 }
  ],
  'propellor_ccw': [
    { label: '5040 Tri-Blade', weight: 4, price: 150 },
    { label: '5045 Bullnose', weight: 5, price: 150 },
    { label: '5149 Freestyle', weight: 4.5, price: 249 }
  ],
  'fc': [
    { label: 'F405 Analog', weight: 8, price: 3500 },
    { label: 'F722 HD', weight: 9, price: 4800 },
    { label: 'H7 Extreme', weight: 10, price: 7500 }
  ],
  'esc': [
    { label: '45A BlHeli_S', weight: 12, price: 3200, maxVoltage: 16.8 }, // 4S Limit
    { label: '55A BlHeli_32', weight: 14, price: 5500, maxVoltage: 25.2 }, // 6S Limit
    { label: '60A AM32', weight: 15, price: 6200, maxVoltage: 25.2 }
  ],
  'receiver': [
    { label: 'ELRS 2.4G', weight: 1, price: 1200 },
    { label: 'TBS Crossfire', weight: 3, price: 2400 },
    { label: 'FrSky R-XSR', weight: 2, price: 1100 }
  ],
  'gps_module': [
    { label: 'M8N Mini', weight: 15, price: 1400 },
    { label: 'M10 GPS', weight: 10, price: 1950 },
    { label: 'Beitian BN-880', weight: 18, price: 1600 }
  ],
  'bottom_plate': [{ label: 'Standard Carbon', weight: 45, price: 1800 }], 
  'top_plate': [{ label: 'Standard Carbon', weight: 15, price: 800 }],
  'arm': [{ label: '5-inch Arm', weight: 12, price: 450 }]
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
      
      // Viewport State
      isGridVisible: true,
      isWireframe: false,
      toggleGrid: () => set((state) => ({ isGridVisible: !state.isGridVisible })),
      toggleWireframe: () => set((state) => ({ isWireframe: !state.isWireframe })),
      
      // Camera Control References
      mainControlsRef: null,
      setMainControlsRef: (ref) => set({ mainControlsRef: ref }),
      
      cameraActions: {
        reset: () => {},
        setTop: () => {},
        setFront: () => {},
        setSide: () => {},
      },
      setCameraActions: (actions) => set({ cameraActions: actions }),

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
        
        if (availableVariants && availableVariants.length > 0) {
             if (configuredVariantData && configuredVariantData.type === partType && configuredVariantData.variant) {
                 appliedVariant = configuredVariantData.variant;
             } else {
                 appliedVariant = availableVariants[0].label; 
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
            isGhosted: false, 
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
      
      // --- NEW ACTION: Update Existing Part Variant ---
      updatePartVariant: (id, variant) => set((state) => ({
        parts: state.parts.map(p => 
          p.id === id ? { ...p, variant: variant } : p
        )
      })),
      // ------------------------------------------------

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

      togglePartGhost: () => {
         const { activePartId } = get();
         if (!activePartId) return;
         set((state) => ({
           parts: state.parts.map(p => 
             p.id === activePartId ? { ...p, isGhosted: !p.isGhosted } : p
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