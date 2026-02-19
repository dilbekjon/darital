'use client';

import React, { useRef, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { FloorGroup } from './FloorGroup';
import type { Building3DData, Room3D } from './types';

interface SceneContentProps {
  building: Building3DData;
  selectedRoom: Room3D | null;
  onSelectRoom: (room: Room3D) => void;
}

function SceneContent({ building, selectedRoom, onSelectRoom }: SceneContentProps) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 15, 10]} intensity={1} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-10, 10, -10]} intensity={0.4} />
      <Grid args={[50, 50]} cellSize={1} cellThickness={0.5} sectionSize={5} sectionThickness={1} fadeDistance={30} fadeStrength={1} infiniteGrid />
      <FloorGroup rooms={building.rooms} selectedRoom={selectedRoom} onSelectRoom={onSelectRoom} />
      <OrbitControls
        makeDefault
        enablePan
        enableZoom
        enableRotate
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 2 - 0.1}
      />
      {selectedRoom && <CameraFocus target={selectedRoom} />}
    </>
  );
}

function CameraFocus({ target }: { target: Room3D }) {
  const { camera, controls } = useThree();
  const goal = useRef(
    new THREE.Vector3(
      target.position.x + 3,
      target.position.y + target.height / 2 + 2,
      target.position.z + target.depth + 4,
    ),
  );
  const lookAtGoal = useRef(
    new THREE.Vector3(target.position.x, target.position.y + target.height / 2, target.position.z),
  );
  const framesLeft = useRef(60);

  useEffect(() => {
    goal.current.set(
      target.position.x + 3,
      target.position.y + target.height / 2 + 2,
      target.position.z + target.depth + 4,
    );
    lookAtGoal.current.set(target.position.x, target.position.y + target.height / 2, target.position.z);
    framesLeft.current = 60;
  }, [target.id, target.position.x, target.position.y, target.position.z, target.height]);

  useFrame(() => {
    if (framesLeft.current <= 0) return;
    framesLeft.current -= 1;
    camera.position.lerp(goal.current, 0.08);
    const lookAt = lookAtGoal.current;
    camera.lookAt(lookAt);
    const c = controls as any;
    if (c?.target) c.target.copy(lookAt);
  });

  return null;
}

interface Building3DViewerProps {
  building: Building3DData;
  selectedRoom: Room3D | null;
  onSelectRoom: (room: Room3D) => void;
}

export function Building3DViewer({ building, selectedRoom, onSelectRoom }: Building3DViewerProps) {
  return (
    <div className="w-full h-full min-h-[500px] bg-gray-900 rounded-lg overflow-hidden">
      <Canvas
        shadows
        camera={{ position: [12, 8, 12], fov: 50 }}
        gl={{ antialias: true }}
      >
        <SceneContent
          building={building}
          selectedRoom={selectedRoom}
          onSelectRoom={onSelectRoom}
        />
      </Canvas>
    </div>
  );
}
