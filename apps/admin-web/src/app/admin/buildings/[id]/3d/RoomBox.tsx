'use client';

import React, { useRef, useState } from 'react';
import { Mesh } from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Room3D } from './types';

const ROOM_COLORS = {
  vacant: '#cbd5e0',
  occupied: '#48bb78',
  maintenance: '#ed8936',
  selected: '#ecc94b',
  hover: '#a0aec0',
};

interface RoomBoxProps {
  room: Room3D;
  selected: boolean;
  onSelect: (room: Room3D) => void;
}

export function RoomBox({ room, selected, onSelect }: RoomBoxProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const color =
    selected ? ROOM_COLORS.selected
    : hovered ? ROOM_COLORS.hover
    : ROOM_COLORS[room.status];

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(room);
  };

  return (
    <group
      position={[room.position.x, room.position.y, room.position.z]}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <mesh ref={meshRef} castShadow receiveShadow>
        <boxGeometry args={[room.width, room.height, room.depth]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <Html
        position={[0, room.height / 2 + 0.3, 0]}
        center
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          fontSize: 12,
          fontWeight: 600,
          color: '#1a202c',
          textShadow: '0 0 2px white',
        }}
      >
        {room.name}
      </Html>
    </group>
  );
}
