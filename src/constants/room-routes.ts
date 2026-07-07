export type LngLat = [number, number];

export type RoomRouteStep = {
  id: string;
  label: string;
  coords: LngLat;
  instruction: string;
};

export type RoomRoute = {
  roomCode: string;
  buildingName: string;
  roomDirections: string;
  buildingDirections: string;
  steps: RoomRouteStep[];
};

export const ROOM_ROUTES: Record<string, RoomRoute> = {
  "GLE 201": {
    roomCode: "GLE 201",
    buildingName: "GLE Building",
    roomDirections: "Room route prototype for GLE 201.",
    buildingDirections:
      "Walk toward the GLE entrance, then use the left stairs toward the second floor.",
    steps: [
      {
        id: "sample-user-location",
        label: "Start",
        coords: [123.881021, 10.29485],
        instruction: "Start from the sample user location.",
      },
      {
        id: "gle-entrance",
        label: "GLE Entrance",
        coords: [123.881112, 10.295321],
        instruction: "Walk toward the GLE Building entrance.",
      },
      {
        id: "gle-left-stairs",
        label: "Left Stairs",
        coords: [123.881099, 10.29554],
        instruction: "Enter GLE and take the left stairs.",
      },
      {
        id: "gle-201-door",
        label: "GLE 201 Door",
        coords: [123.881132, 10.295492],
        instruction: "Continue to the GLE 201 door.",
      },
    ],
  },
};

export function getRoomRoute(roomCode: string) {
  return ROOM_ROUTES[roomCode] ?? null;
}
