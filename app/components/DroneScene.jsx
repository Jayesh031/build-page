import React, { Suspense, useMemo, useRef, useEffect, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Grid, Environment, ContactShadows } from '@react-three/drei';
import { useDroneStore, VARIANTS } from './store'; 
import * as THREE from 'three';

const FILE_MAP = {
  'bottom_plate': '/bottom_plate.glb',
  'top_plate': '/top_plate.glb',
  'arm': '/arm.glb',
  'motor_cw': '/motor.glb', 
  'motor_ccw': '/motor.glb', 
  'propellor_cw': '/propellor_cw.glb',
  'propellor_ccw': '/propellor_ccw.glb', 
  'fc': '/fc.glb',
  'esc': '/esc.glb',
  'battery': '/battery.glb',
  'receiver': '/receiver.glb',
  'gps_module': '/gps_module.glb'
};

Object.values(FILE_MAP).forEach(url => useGLTF.preload(url));

// --- COG VISUALIZER ---
function CoGVisualizer() {
  const parts = useDroneStore((s) => s.parts);
  const showCoG = useDroneStore((s) => s.showCoG);
  const isExploded = useDroneStore((s) => s.isExploded);

  const cog = useMemo(() => {
    if (parts.length === 0) return null;

    let totalWeight = 0;
    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;

    parts.forEach(part => {
        const variantData = VARIANTS[part.type]?.find(v => v.label === part.variant) || VARIANTS[part.type]?.[0];
        const weight = variantData?.weight || 0;

        if (weight > 0) {
            totalWeight += weight;
            sumX += part.position[0] * weight;
            sumY += part.position[1] * weight; 
            sumZ += part.position[2] * weight;
        }
    });

    if (totalWeight === 0) return null;

    return new THREE.Vector3(sumX / totalWeight, sumY / totalWeight, sumZ / totalWeight);
  }, [parts]); 

  if (!showCoG || !cog || isExploded) return null;

  return (
    <group position={cog}>
        <mesh>
            <sphereGeometry args={[2, 16, 16]} />
            <meshBasicMaterial color="#ef4444" wireframe />
        </mesh>
        <mesh>
            <sphereGeometry args={[1.5, 16, 16]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={0.8} />
        </mesh>
        <mesh position={[0, -10, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 20]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={0.6} />
        </mesh>
    </group>
  );
}

function Model({ type, position, rotation, isGhost, isGhosted, isActive, ...props }) {
  const gltf = useGLTF(FILE_MAP[type]);
  const scene = useMemo(() => gltf.scene.clone(), [gltf.scene, type]);
  const isWireframe = useDroneStore((s) => s.isWireframe);
  const isExploded = useDroneStore((s) => s.isExploded);
  const isArmed = useDroneStore((s) => s.isArmed); 
  
  const groupRef = useRef();
  const innerMeshRef = useRef();

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    let targetY = position[1]; 

    if (isExploded && !isGhost) {
       let offset = 0;
       if (type === 'battery') offset = 40;
       if (type === 'top_plate') offset = 30;
       if (type.includes('propellor')) offset = 20;
       if (type === 'fc') offset = 15;
       if (type === 'esc') offset = 8;
       if (type.includes('motor')) offset = 5;
       targetY += offset;
    }

    groupRef.current.position.x = position[0];
    groupRef.current.position.z = position[2];
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, delta * 10);
    groupRef.current.rotation.set(...rotation);

    if (isArmed && type.includes('propellor') && !isGhost) {
        const speed = 25 * delta; 
        const direction = type === 'propellor_cw' ? -1 : 1;
        if (innerMeshRef.current) {
            innerMeshRef.current.rotation.y += speed * direction;
        }
    }
  });

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        if (!child.userData.originalMaterial) {
           child.userData.originalMaterial = child.material.clone();
        }
        child.material = child.userData.originalMaterial.clone();

        if (isGhost) {
          child.material.transparent = true;
          child.material.opacity = 0.5;
          child.material.color.set('#3b82f6'); 
          child.material.wireframe = false;
          child.castShadow = false;
          child.receiveShadow = false;
        } 
        else if (isGhosted) {
          child.material.transparent = true;
          child.material.opacity = 0.25; 
          child.material.roughness = 0.1;
          child.material.metalness = 0.9;
          child.material.wireframe = false;
          child.castShadow = false;
          child.receiveShadow = false;
          child.material.emissive = new THREE.Color("#00ffff");
          child.material.emissiveIntensity = 0.2;
        }
        else {
          child.material.transparent = false;
          child.material.opacity = 1.0;
          child.material.wireframe = isWireframe;
          child.castShadow = true;
          child.receiveShadow = true;
          child.material.emissive = new THREE.Color("black");
          child.material.emissiveIntensity = 0;

          if (type === 'motor_ccw' && !isWireframe) {
             child.material.color.set('#ffcccc'); 
          }
        }
        child.material.needsUpdate = true;
      }
    });
  }, [scene, isGhost, isGhosted, type, isWireframe]);

  const handlePartRightClick = (e) => {
    e.nativeEvent.preventDefault(); 
    e.stopPropagation();
    useDroneStore.setState({ isCarrying: false });
  };

  const handlePartDoubleClick = (e) => {
    if(!isGhost) {
      e.stopPropagation();
      props.onSelect();
      props.onPickup();
    }
  };

  return (
    <group 
      ref={groupRef}
      scale={1} 
      onDoubleClick={handlePartDoubleClick}
      onContextMenu={handlePartRightClick}
      onClick={(e) => { if(!isGhost) { e.stopPropagation(); props.onSelect(); } }}
    >
      <group ref={innerMeshRef}>
          <primitive object={scene} />
      </group>

      {isActive && !isGhost && (
        <mesh position={[0, -5, 0]} rotation={[-Math.PI/2, 0, 0]}>
           <ringGeometry args={[8, 9, 32]} />
           <meshBasicMaterial color={props.isCarrying ? "#3b82f6" : "#ef4444"} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

// --- UPDATED DRAG MANAGER (With Frame Lock) ---
function DragManager() {
  const { camera, gl } = useThree();
  const draggedPartType = useDroneStore((s) => s.draggedPartType);
  const spawnPart = useDroneStore((s) => s.spawnPart);
  const parts = useDroneStore((s) => s.parts);
  
  const ghostRef = useRef();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const [snapPosition, setSnapPosition] = useState(null);

  const frame = useMemo(() => parts.find(p => p.type === 'bottom_plate'), [parts]);
  const frameSockets = useMemo(() => {
     if (!frame) return null;
     const variantData = VARIANTS['bottom_plate'].find(v => v.label === frame.variant) || VARIANTS['bottom_plate'][0];
     return variantData.sockets || null;
  }, [frame]);

  useFrame(() => {
    if (!draggedPartType || !ghostRef.current) return;
    
    // --- 1. FRAME LOCK LOGIC ---
    // If it's a bottom plate, FORCE it to 0,0,0 visually
    if (draggedPartType.includes('bottom_plate')) {
        ghostRef.current.position.set(0, 0, 0);
        return; // Skip normal logic
    }
    // ---------------------------

    if (snapPosition && ghostRef.current) {
        ghostRef.current.position.set(...snapPosition);
    }
  });

  useEffect(() => {
    const canvas = gl.domElement;
    
    const handleDragOver = (e) => {
      e.preventDefault(); 
      if (!draggedPartType || !ghostRef.current) return;
      
      // --- 1. FRAME LOCK LOGIC ---
      if (draggedPartType.includes('bottom_plate')) {
          ghostRef.current.position.set(0, 0, 0);
          ghostRef.current.visible = true;
          return;
      }
      // ---------------------------

      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera({ x, y }, camera);
      const target = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, target);
      
      if (target) {
        let bestSnap = null;
        let minDist = 5; 

        if (frame && frameSockets && frameSockets[draggedPartType]) {
            frameSockets[draggedPartType].forEach(offset => {
                const worldSnap = new THREE.Vector3(
                    frame.position[0] + offset[0], 
                    frame.position[1] + offset[1], 
                    frame.position[2] + offset[2]
                );
                const dist = worldSnap.distanceTo(target);
                if (dist < minDist) {
                    minDist = dist;
                    bestSnap = worldSnap.toArray();
                }
            });
        }

        if (bestSnap) {
            setSnapPosition(bestSnap);
            ghostRef.current.position.set(...bestSnap);
            ghostRef.current.scale.set(1.2, 1.2, 1.2);
        } else {
            setSnapPosition(null);
            ghostRef.current.position.copy(target);
            ghostRef.current.scale.set(1, 1, 1);
        }
        ghostRef.current.visible = true;
      }
    };

    const handleDrop = (e) => {
      e.preventDefault();
      if (draggedPartType && ghostRef.current?.visible) {
        // The store handles the 0,0,0 override, but we send the visual pos anyway
        const finalPos = snapPosition || ghostRef.current.position.toArray();
        spawnPart(draggedPartType, finalPos);
      }
      if (ghostRef.current) ghostRef.current.visible = false;
      setSnapPosition(null);
    };

    canvas.addEventListener('dragover', handleDragOver);
    canvas.addEventListener('drop', handleDrop);
    return () => { canvas.removeEventListener('dragover', handleDragOver); canvas.removeEventListener('drop', handleDrop); };
  }, [camera, gl.domElement, draggedPartType, plane, raycaster, spawnPart, frame, frameSockets, snapPosition]);

  if (draggedPartType) {
    return (
      <group ref={ghostRef} visible={false}>
        <Model type={draggedPartType} isGhost={true} position={[0,0,0]} rotation={[0,0,0]} />
        {snapPosition && (
            <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[1.5, 16, 16]} />
                <meshBasicMaterial color="#4ade80" transparent opacity={0.6} />
            </mesh>
        )}
      </group>
    );
  }
  return null;
}

function CameraManager() {
  const { camera, gl } = useThree();
  const controlsRef = useRef(); 
  const setCameraActions = useDroneStore((s) => s.setCameraActions);
  const setMainControlsRef = useDroneStore((s) => s.setMainControlsRef);
  const isPanMode = useDroneStore((s) => s.isPanMode);

  useEffect(() => {
    if (!controlsRef.current) return;

    setMainControlsRef(controlsRef);
    
    if (isPanMode) {
        controlsRef.current.mouseButtons.LEFT = THREE.MOUSE.PAN;
        controlsRef.current.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
    } else {
        controlsRef.current.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
        controlsRef.current.mouseButtons.RIGHT = THREE.MOUSE.PAN;
    }

    setCameraActions({
        reset: () => {
            if (controlsRef.current) {
                controlsRef.current.reset();
                camera.position.set(50, 50, 50);
                camera.lookAt(0,0,0);
            }
        },
        setTop: () => {
            camera.position.set(0, 100, 0);
            camera.lookAt(0,0,0);
        },
        setFront: () => {
            camera.position.set(0, 0, 100);
            camera.lookAt(0,0,0);
        },
        setSide: () => {
            camera.position.set(100, 0, 0);
            camera.lookAt(0,0,0);
        }
    });

    return () => {
        setMainControlsRef(null);
        setCameraActions({
            reset: () => {},
            setTop: () => {},
            setFront: () => {},
            setSide: () => {},
        });
    };
  }, [camera, setCameraActions, setMainControlsRef, isPanMode]);

  return <OrbitControls ref={controlsRef} args={[camera, gl.domElement]} makeDefault />;
}

export default function DroneScene({ isDark, isRightCollapsed }) {
  const parts = useDroneStore((state) => state.parts);
  const activePartId = useDroneStore((state) => state.activePartId);
  const isCarrying = useDroneStore((state) => state.isCarrying);
  const placementMode = useDroneStore((state) => state.placementMode);
  const selectPart = useDroneStore((state) => state.selectPart);
  const updatePartPosition = useDroneStore((state) => state.updatePartPosition);
  const isGridVisible = useDroneStore((state) => state.isGridVisible);

  const handlePlaneMove = (e) => {
    if (activePartId && isCarrying && placementMode === 'free') {
      e.stopPropagation();
      updatePartPosition(activePartId, e.point.x, undefined, e.point.z); 
    }
  };

  const handleBackgroundRightClick = (e) => {
    e.nativeEvent.preventDefault();
    if (isCarrying) {
      useDroneStore.setState({ isCarrying: false });
    }
  };

  return (
    <div className="w-full h-full">
      <Canvas shadows camera={{ position: [50, 50, 50], fov: 45 }}>
        <color attach="background" args={[isDark ? '#e2e8f0' : '#ffffff']} />
        
        <Environment preset="studio" /> 
        <directionalLight position={[10, 20, 10]} intensity={2} color="white" castShadow shadow-mapSize={[1024, 1024]} />
        <ambientLight intensity={0.8} color="white" />
        
        {isGridVisible && (
          <Grid 
            infiniteGrid 
            fadeDistance={250} 
            sectionColor={isDark ? "#94a3b8" : "#cbd5e1"} 
            cellColor={isDark ? "#cbd5e1" : "#e2e8f0"} 
            cellSize={10} 
            sectionSize={50} 
          />
        )}
        
        <ContactShadows position={[0, -0.01, 0]} opacity={0.4} scale={200} blur={2} far={10} />

        <CoGVisualizer />

        <Suspense fallback={null}>
          {parts.map((part) => (
            <Model 
              key={part.id}
              type={part.type}
              position={part.position}
              rotation={part.rotation}
              isActive={part.id === activePartId}
              isCarrying={part.id === activePartId && isCarrying}
              isGhosted={part.isGhosted}
              onSelect={() => selectPart(part.id)}
              onPickup={() => { 
                if(placementMode === 'free') {
                    selectPart(part.id); 
                    useDroneStore.setState({ isCarrying: true }); 
                } else {
                    selectPart(part.id); 
                }
              }}
            />
          ))}
          <DragManager />
        </Suspense>
        
        <CameraManager />
        
        <mesh 
            rotation={[-Math.PI / 2, 0, 0]} 
            position={[0, -0.01, 0]} 
            scale={1000} 
            visible={false} 
            onPointerMove={handlePlaneMove}
            onContextMenu={handleBackgroundRightClick} 
        >
          <planeGeometry />
        </mesh>
      </Canvas>
    </div>
  );
}