export const CITU_CAMPUS_NAME = "Cebu Institute of Technology - University";
export const CITU_CAMPUS_SHORT_NAME = "CIT-U";

export const CITU_CAMPUS_CENTER: [number, number] = [
  123.88047,
  10.29578,
];

export const CITU_DEFAULT_ZOOM = 17.2;
export const CITU_DEFAULT_PITCH = 55;
export const CITU_DEFAULT_BEARING = -28;

export const CITU_MAP_BOUNDS: [[number, number], [number, number]] = [
  [123.8755, 10.2907],
  [123.8855, 10.3005],
];

export const CITU_LOCATION_BOUNDS = {
  minLng: 123.8789,
  minLat: 10.2937,
  maxLng: 123.882,
  maxLat: 10.2979,
};

export type CituBuildingLabel = {
  name: string;
  fullName?: string;
  coords: [number, number];
};

export const CITU_BUILDING_LABELS: CituBuildingLabel[] = [
  {
    name: "RTL",
    fullName: "Don Rodolfo T. Lizares Building",
    coords: [123.8805369, 10.2947275],
  },
  {
    name: "RTL 101-108",
    fullName: "Smart Classroom",
    coords: [123.88025, 10.2949],
  },
  {
    name: "ALLIED",
    fullName: "Allied Engineering Building",
    coords: [123.8796881, 10.2952557],
  },
  {
    name: "NGE",
    fullName: "Nicolas G. Escario Building",
    coords: [123.8811381, 10.2943038],
  },
  {
    name: "LINK",
    coords: [123.8804013, 10.2952641],
  },
  {
    name: "G-LECROOM",
    coords: [123.8793966, 10.2960048],
  },
  {
    name: "Elementary Rooms",
    fullName: "Smart Classroom",
    coords: [123.8804742, 10.2961022],
  },
  {
    name: "SAL",
    fullName: "Don Simplicio A. Lizares Building",
    coords: [123.8798881, 10.2954529],
  },
  {
    name: "GYM",
    coords: [123.8795075, 10.2963173],
  },
  {
    name: "P.E AREA",
    coords: [123.8799354, 10.2960535],
  },
  {
    name: "ACAD",
    fullName: "Academic Building",
    coords: [123.8812557, 10.2958206],
  },
  {
    name: "GLE",
    fullName: "Gregorio L. Escario Building",
    coords: [123.8811285, 10.2953116],
  },
  {
    name: "G-PHYSLAB",
    coords: [123.8809178, 10.2951686],
  },
];
