'use client';

import React from 'react';
import { RoomBox } from './RoomBox';
import type { Room3D } from './types';

interface FloorGroupProps {
  rooms: Room3D[];
  selectedRoom: Room3D | null;
  onSelectRoom: (room: Room3D) => void;
}

export function FloorGroup({ rooms, selectedRoom, onSelectRoom }: FloorGroupProps) {
  return (
    <>
      {rooms.map((room) => (
        <RoomBox
          key={room.id}
          room={room}
          selected={selectedRoom?.id === room.id}
          onSelect={onSelectRoom}
        />
      ))}
    </>
  );
}
