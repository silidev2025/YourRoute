const GLE_FLOORS = [2, 3, 4, 5, 6, 7, 8] as const;

export const GLE_ROOM_CODES = GLE_FLOORS.flatMap((floor) =>
  Array.from({ length: 6 }, (_, index) => `GLE ${floor}0${index + 1}`),
);

function getFloorLabel(floor: number) {
  if (floor === 2) return "2nd";
  if (floor === 3) return "3rd";
  return `${floor}th`;
}

export function getGleRoomInfo(value: string) {
  const match = /^GLE\s*([2-8])0([1-6])$/i.exec(value.trim());
  if (!match) return null;

  const floor = Number(match[1]);
  const roomIndex = Number(match[2]);
  const roomCode = `GLE ${floor}0${roomIndex}`;
  const staircase = roomIndex <= 3 ? "left" : "right";

  return {
    roomCode,
    floor,
    roomIndex,
    directions: `${roomCode} is on the ${getFloorLabel(floor)} floor. Use the ${staircase} staircase; rooms are numbered from x01 on the left to x06 on the right.`,
  };
}
