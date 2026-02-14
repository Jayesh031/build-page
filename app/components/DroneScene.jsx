import React, { Suspense, useMemo, useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { useGLTF, OrbitControls, Grid, Environment, ContactShadows } from '@react-three/drei';
import { useDroneStore } from './store'; 
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

function Model({ type, isGhost, isGhosted, ...props }) {
  const gltf = useGLTF(FILE_MAP[type]);
  // 1. Create a FRESH clone of the scene whenever the 'type' changes
  const scene = useMemo(() => gltf.scene.clone(), [gltf.scene, type]);
  
  const isWireframe = useDroneStore((s) => s.isWireframe);

  // 2. Apply Material Properties whenever state changes
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        // IMPORTANT: Ensure we have a unique material clone to modify
        if (!child.userData.originalMaterial) {
           child.userData.originalMaterial = child.material.clone();
        }
        // Always start from a fresh clone of the original material to avoid "stuck" states
        child.material = child.userData.originalMaterial.clone();

        // --- STATE 1: DRAGGING GHOST (Blue Hologram) ---
        if (isGhost) {
          child.material.transparent = true;
          child.material.opacity = 0.5;
          child.material.color.set('#3b82f6'); 
          child.material.wireframe = false;
          child.castShadow = false;
          child.receiveShadow = false;
        } 
        // --- STATE 2: SPECIFIC X-RAY (Selected Part) ---
        else if (isGhosted) {
          child.material.transparent = true;
          child.material.opacity = 0.25; // Clear glass look
          child.material.roughness = 0.1;
          child.material.metalness = 0.9;
          child.material.wireframe = false;
          child.castShadow = false;
          child.receiveShadow = false;
          
          // Optional: slight tint to show it's selected
          child.material.emissive = new THREE.Color("#00ffff");
          child.material.emissiveIntensity = 0.2;
        }
        // --- STATE 3: NORMAL ---
        else {
          // Reset to Standard
          child.material.transparent = false;
          child.material.opacity = 1.0;
          child.material.wireframe = isWireframe;
          child.castShadow = true;
          child.receiveShadow = true;
          child.material.emissive = new THREE.Color("black");
          child.material.emissiveIntensity = 0;

          // Special case for CCW Motor color
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
      position={props.position} 
      rotation={props.rotation}
      scale={1} 
      onDoubleClick={handlePartDoubleClick}
      onContextMenu={handlePartRightClick}
      onClick={(e) => { if(!isGhost) { e.stopPropagation(); props.onSelect(); } }}
    >
      <primitive object={scene} />
      {props.isActive && !isGhost && (
        <mesh position={[0, -5, 0]} rotation={[-Math.PI/2, 0, 0]}>
           <ringGeometry args={[8, 9, 32]} />
           <meshBasicMaterial color={props.isCarrying ? "#3b82f6" : "#ef4444"} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function DragManager() {
  const { camera, gl } = useThree();
  const draggedPartType = useDroneStore((s) => s.draggedPartType);
  const spawnPart = useDroneStore((s) => s.spawnPart);
  
  const ghostRef = useRef();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

  useEffect(() => {
    const canvas = gl.domElement;
    
    const handleDragOver = (e) => {
      e.preventDefault(); 
      if (!draggedPartType || !ghostRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera({ x, y }, camera);
      const target = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, target);
      if (target) {
        ghostRef.current.position.copy(target);
        ghostRef.current.visible = true;
      }
    };

    const handleDrop = (e) => {
      e.preventDefault();
      if (draggedPartType && ghostRef.current?.visible) {
        spawnPart(draggedPartType, ghostRef.current.position.toArray());
      }
      if (ghostRef.current) ghostRef.current.visible = false;
    };

    canvas.addEventListener('dragover', handleDragOver);
    canvas.addEventListener('drop', handleDrop);
    return () => { canvas.removeEventListener('dragover', handleDragOver); canvas.removeEventListener('drop', handleDrop); };
  }, [camera, gl.domElement, draggedPartType, plane, raycaster, spawnPart]);

  if (draggedPartType) {
    return (
      <group ref={ghostRef} visible={false}>
        <Model type={draggedPartType} isGhost={true} position={[0,0,0]} rotation={[0,0,0]} />
      </group>
    );
  }
  return null;
}

// SAFE CAMERA MANAGER
function CameraManager() {
  const { camera, gl } = useThree();
  const controlsRef = useRef(); 
  const setCameraActions = useDroneStore((s) => s.setCameraActions);
  const setMainControlsRef = useDroneStore((s) => s.setMainControlsRef);

  useEffect(() => {
    if (!controlsRef.current) return;

    setMainControlsRef(controlsRef);
    
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
  }, [camera, setCameraActions, setMainControlsRef]);

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

        <Suspense fallback={null}>
          {parts.map((part) => (
            <Model 
              key={part.id}
              type={part.type}
              position={part.position}
              rotation={part.rotation}
              isActive={part.id === activePartId}
              isCarrying={part.id === activePartId && isCarrying}
              // Pass the boolean correctly here
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