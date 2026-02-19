/**
 * 3D Room Structure Viewer – data types and layout.
 * Rooms map to Darital "units"; we add computed position/dimensions for 3D.
 */

export type RoomStatus = 'vacant' | 'occupied' | 'maintenance';

export interface Room3D {
  id: string;
  name: string;
  width: number;
  depth: number;
  height: number;
  position: { x: number; y: number; z: number };
  status: RoomStatus;
  tenantId: string | null;
  tenantName: string | null;
  contractId: string | null;
  price: number;
  area: number | null;
  floor: number;
}

export interface Building3DData {
  id: string;
  name: string;
  address: string | null;
  floorsCount: number;
  rooms: Room3D[];
}

/** Default room size (meters) when not in DB */
const DEFAULT_ROOM_WIDTH = 4;
const DEFAULT_ROOM_DEPTH = 5;
const DEFAULT_ROOM_HEIGHT = 3;
const ROOM_SPACING = 0.5;
const FLOOR_HEIGHT = 3.5;

/**
 * Build a grid layout for units on a floor.
 * Returns x,z positions (y is floor index * FLOOR_HEIGHT).
 */
function gridPositionsForFloor(
  count: number,
  floorIndex: number,
  columns: number = 4,
): { x: number; z: number }[] {
  const positions: { x: number; z: number }[] = [];
  const rowWidth = columns * (DEFAULT_ROOM_WIDTH + ROOM_SPACING) - ROOM_SPACING;
  const startX = -rowWidth / 2 + (DEFAULT_ROOM_WIDTH + ROOM_SPACING) / 2;
  const startZ = 0;
  for (let i = 0; i < count; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    positions.push({
      x: startX + col * (DEFAULT_ROOM_WIDTH + ROOM_SPACING),
      z: startZ + row * (DEFAULT_ROOM_DEPTH + ROOM_SPACING),
    });
  }
  return positions;
}

/**
 * Map API building + units to Building3DData with auto layout.
 * Uses default dimensions and grid layout when DB has no width/depth/height/position.
 */
export function buildBuilding3DFromApi(apiBuilding: {
  id: string;
  name: string;
  address?: string | null;
  floorsCount?: number;
  units: Array<{
    id: string;
    name: string;
    price: number;
    area?: number | null;
    floor?: number | null;
    status: string;
    contracts?: Array<{ id: string; tenant?: { id: string; fullName: string } }>;
  }>;
}): Building3DData {
  const floorsCount = Math.max(1, apiBuilding.floorsCount ?? 1);
  const unitsByFloor: Record<number, typeof apiBuilding.units> = {};
  for (const u of apiBuilding.units) {
    const f = u.floor ?? 0;
    if (!unitsByFloor[f]) unitsByFloor[f] = [];
    unitsByFloor[f].push(u);
  }
  const rooms: Room3D[] = [];
  const columns = 4;
  for (let floorIndex = 0; floorIndex < floorsCount; floorIndex++) {
    const unitsOnFloor = unitsByFloor[floorIndex] ?? [];
    const positions = gridPositionsForFloor(unitsOnFloor.length, floorIndex, columns);
    unitsOnFloor.forEach((unit, i) => {
      const pos = positions[i] ?? { x: 0, z: 0 };
      const contract = unit.contracts?.[0];
      const tenant = contract?.tenant;
      const status: RoomStatus =
        unit.status === 'BUSY' ? 'occupied' : unit.status === 'MAINTENANCE' ? 'maintenance' : 'vacant';
      const area = unit.area ?? (DEFAULT_ROOM_WIDTH * DEFAULT_ROOM_DEPTH);
      rooms.push({
        id: unit.id,
        name: unit.name,
        width: DEFAULT_ROOM_WIDTH,
        depth: DEFAULT_ROOM_DEPTH,
        height: DEFAULT_ROOM_HEIGHT,
        position: {
          x: pos.x,
          y: floorIndex * FLOOR_HEIGHT,
          z: pos.z,
        },
        status,
        tenantId: tenant?.id ?? null,
        tenantName: tenant?.fullName ?? null,
        contractId: contract?.id ?? null,
        price: typeof unit.price === 'number' ? unit.price : Number(unit.price),
        area,
        floor: floorIndex,
      });
    });
  }
  return {
    id: apiBuilding.id,
    name: apiBuilding.name,
    address: apiBuilding.address ?? null,
    floorsCount,
    rooms,
  };
}

/**
 * EXTENSION NOTES (for later):
 * - Real floorplans: add width/depth/height (and optionally posX, posY, posZ) to Unit in Prisma;
 *   use them in buildBuilding3DFromApi when present, else keep grid layout.
 * - Custom layouts: store per-unit position/dimensions in DB or a JSON config per building.
 * - Blender GLB: load a GLB with useGLTF from drei, place it as floor/background; keep room boxes
 *   as clickable overlays or replace boxes with meshes from the GLB.
 */

/** Mock building for when API is not ready or for demos */
export function getMockBuilding3D(): Building3DData {
  return buildBuilding3DFromApi({
    id: 'mock-building',
    name: 'Demo Building',
    address: '123 Demo St',
    floorsCount: 2,
    units: [
      { id: 'u1', name: '101', price: 500, area: 20, floor: 0, status: 'FREE', contracts: [] },
      { id: 'u2', name: '102', price: 550, area: 22, floor: 0, status: 'BUSY', contracts: [{ id: 'c1', tenant: { id: 't1', fullName: 'John Doe' } }] },
      { id: 'u3', name: '103', price: 500, area: 20, floor: 0, status: 'FREE', contracts: [] },
      { id: 'u4', name: '201', price: 600, area: 25, floor: 1, status: 'FREE', contracts: [] },
      { id: 'u5', name: '202', price: 600, area: 25, floor: 1, status: 'MAINTENANCE', contracts: [] },
    ],
  });
}
