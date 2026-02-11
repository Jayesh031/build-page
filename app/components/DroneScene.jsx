import React, { Suspense, useMemo, useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { useGLTF, OrbitControls, Grid, Environment, ContactShadows, GizmoHelper, GizmoViewport } from '@react-three/drei';
import { useDroneStore } from './store'; 
import * as THREE from 'three';

// --- FILE MAPPING ---
const FILE_MAP = {
  'bottom_plate': '/bottom_plate.glb',
  'top_plate': '/top_plate.glb',
  'arm': '/arm.glb',
  'motor': '/motor.glb',
  'propellor_cw': '/propellor_cw.glb',
  'propellor_ccw': '/propellor_ccw.glb', 
  'fc': '/fc.glb',
  'esc': '/esc.glb',
  'battery': '/battery.glb',
  'receiver': '/receiver.glb',
  'gps_module': '/gps_module.glb'
};

// --- PRELOADER ---
// This prevents the "disappearing" bug by ensuring all assets are loaded before dragging starts.
Object.values(FILE_MAP).forEach(url => useGLTF.preload(url));

// --- 1. MODEL COMPONENT ---
function Model({ type, isGhost, ...props }) {
  const gltf = useGLTF(FILE_MAP[type]);
  const scene = useMemo(() => gltf.scene.clone(), [gltf.scene]);

  useMemo(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        if (isGhost) {
          child.material = child.material.clone();
          child.material.transparent = true;
          child.material.opacity = 0.5;
          child.material.color.set('#3b82f6'); 
          child.castShadow = false;
          child.receiveShadow = false;
        } else {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      }
    });
  }, [scene, isGhost]);

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
      scale={1} // LOCKED GLOBAL SCALE
      onDoubleClick={handlePartDoubleClick}
      onContextMenu={handlePartRightClick}
      onClick={(e) => { if(!isGhost) { e.stopPropagation(); props.onSelect(); } }}
    >
      <primitive object={scene} />
      
      {/* Selection Ring */}
      {props.isActive && !isGhost && (
        <mesh position={[0, -5, 0]} rotation={[-Math.PI/2, 0, 0]}>
           <ringGeometry args={[8, 9, 32]} />
           <meshBasicMaterial color={props.isCarrying ? "#3b82f6" : "#ef4444"} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

// --- 2. DRAG MANAGER ---
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

// --- MAIN SCENE ---
export default function DroneScene() {
  const parts = useDroneStore((state) => state.parts);
  const activePartId = useDroneStore((state) => state.activePartId);
  const isCarrying = useDroneStore((state) => state.isCarrying);
  const selectPart = useDroneStore((state) => state.selectPart);
  const updatePartPosition = useDroneStore((state) => state.updatePartPosition);
  
  const handlePlaneMove = (e) => {
    if (activePartId && isCarrying) {
      e.stopPropagation();
      updatePartPosition(activePartId, e.point.x, e.point.z);
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
        <color attach="background" args={['#f5f7fa']} />
        <Environment preset="city" /> 
        <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
        <ambientLight intensity={0.5} />
        
        <Grid 
          infiniteGrid 
          fadeDistance={250} 
          sectionColor="#cbd5e1" 
          cellColor="#e2e8f0" 
          cellSize={10} 
          sectionSize={50} 
        />
        
        <ContactShadows position={[0, -0.01, 0]} opacity={0.4} scale={200} blur={2} far={10} />

        {/* Separated Suspense for DragManager prevents flickering */}
        <Suspense fallback={null}>
          {parts.map((part) => (
            <Model 
              key={part.id}
              type={part.type}
              position={part.position}
              rotation={part.rotation}
              isActive={part.id === activePartId}
              isCarrying={part.id === activePartId && isCarrying}
              onSelect={() => selectPart(part.id)}
              onPickup={() => { selectPart(part.id); useDroneStore.setState({ isCarrying: true }); }}
            />
          ))}
        </Suspense>

        <Suspense fallback={null}>
           <DragManager />
        </Suspense>
        
        {/* Full 360 Rotation enabled (removed min/maxPolarAngle) */}
        <OrbitControls makeDefault />

        {/* BLENDER-STYLE AXIS WIDGET */}
        <GizmoHelper alignment="top-right" margin={[80, 80]}>
          <GizmoViewport axisColors={['#9d4b4b', '#2f7f4f', '#3b5b9d']} labelColor="white" />
        </GizmoHelper>
        
        {/* INVISIBLE FLOOR PLANE */}
        <mesh 
            rotation={[-Math.PI / 2, 0, 0]} 
            position={[0, -0.01, 0]} 
            scale={1000} // Increased scale to catch mouse events far away
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