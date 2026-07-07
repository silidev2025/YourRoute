<script lang="ts">
  import {
    FillExtrusionLayer,
    GeoJSON,
    LineLayer,
    MapLibre,
    Marker,
  } from "svelte-maplibre";
  import {
    CITU_CAMPUS_CENTER,
    CITU_CAMPUS_NAME,
    CITU_CAMPUS_SHORT_NAME,
    CITU_BUILDING_LABELS,
    type CituBuildingLabel,
    CITU_DEFAULT_BEARING,
    CITU_DEFAULT_PITCH,
    CITU_DEFAULT_ZOOM,
    CITU_MAP_BOUNDS,
  } from "../../constants/campus";
  import { getAppData } from "../../lib/context";
  import {
    queryStore,
    locationStore,
    mapStore,
    navigationStore,
  } from "../../lib/store.svelte";
  import { untrack } from "svelte";
  import { fade } from "svelte/transition";
  import MapLibreGlDirections from "@maplibre/maplibre-gl-directions";
  import { Building2, University, UserRound } from "@lucide/svelte";
  import { MediaQuery } from "svelte/reactivity";
  import * as mapGl from "maplibre-gl";
  import type { LngLat } from "../../constants/room-routes";
  const { buildings, rooms } = getAppData();
  let directions: MapLibreGlDirections | undefined = $state.raw();

  let animationFrameId: number | null = $state(null);

  let isRotating = $state(false);
  let lastTimestamp = $state(0);
  let currentRotation = $state(0);
  let zoomLevel = $state(CITU_DEFAULT_ZOOM);
  let activeOfficialBuildingName = $state<string | null>(null);
  const SIDEPANEL_WIDTH = 25.75 * 16;
  const md = new MediaQuery("max-width:48rem");

  const calculatePadding = (md: boolean): mapGl.PaddingOptions => {
    if (md) {
      return {
        bottom: window.innerWidth / 2,
        left: 0,
      };
    }
    return {
      left: SIDEPANEL_WIDTH,
      bottom: 0,
    };
  };

  function isInsideCampusMapBounds(lon: number, lat: number) {
    return (
      lon >= CITU_MAP_BOUNDS[0][0] &&
      lon <= CITU_MAP_BOUNDS[1][0] &&
      lat >= CITU_MAP_BOUNDS[0][1] &&
      lat <= CITU_MAP_BOUNDS[1][1]
    );
  }

  function getBearing(from: LngLat, to: LngLat) {
    const fromLng = (from[0] * Math.PI) / 180;
    const fromLat = (from[1] * Math.PI) / 180;
    const toLng = (to[0] * Math.PI) / 180;
    const toLat = (to[1] * Math.PI) / 180;
    const deltaLng = toLng - fromLng;
    const y = Math.sin(deltaLng) * Math.cos(toLat);
    const x =
      Math.cos(fromLat) * Math.sin(toLat) -
      Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLng);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  }

  function rotateCamera(timestamp: number) {
    if (!mapStore.mapInstance || !isRotating) return;

    if (!lastTimestamp) lastTimestamp = timestamp;
    const delta = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    currentRotation = (currentRotation + delta / 150) % 360;
    mapStore.mapInstance.rotateTo(currentRotation, {
      duration: 0,
      padding: calculatePadding(untrack(() => md.current)),
    });

    animationFrameId = requestAnimationFrame(rotateCamera);
  }

  function startRotation() {
    stopRotation();
    if (!mapStore.mapInstance) return;
    isRotating = true;
    lastTimestamp = 0;
    currentRotation = mapStore.mapInstance.getBearing();
    animationFrameId = requestAnimationFrame(rotateCamera);
  }

  function stopRotation() {
    isRotating = false;
    lastTimestamp = 0;
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  function handleZoom() {
    if (!mapStore.mapInstance) return;
    zoomLevel = mapStore.mapInstance.getZoom();
  }

  $effect(() => {
    if (mapStore.mapInstance) {
      const map = mapStore.mapInstance;
      map.on("mousedown", stopRotation);
      map.on("touchstart", stopRotation);
      map.on("wheel", stopRotation);
      map.on("zoom", handleZoom);
      return () => {
        map.off("mousedown", stopRotation);
        map.off("touchstart", stopRotation);
        map.off("wheel", stopRotation);
        map.off("zoom", handleZoom);
      };
    }
  });

  $effect(() => {
    if (mapStore.mapInstance && !directions) {
      const initDirections = () => {
        if (!directions && mapStore.mapInstance) {
          directions = new MapLibreGlDirections(mapStore.mapInstance, {
            api: "https://routing.openstreetmap.de/routed-foot/route/v1",
            profile: "foot",
          });
        }
      };

      if (mapStore.mapInstance.isStyleLoaded()) {
        initDirections();
      } else {
        mapStore.mapInstance.once("load", initDirections);
      }
    }
  });

  $effect(() => {
    if (!directions) return;

    if (locationStore.routeOrigin && locationStore.destination) {
      directions.setWaypoints([
        locationStore.routeOrigin,
        locationStore.destination,
      ]);
    } else {
      directions.clear();
    }
  });

  $effect(() => {
    const category = queryStore.category;
    const type = queryStore.type;
    const value = queryStore.inputValue;
    const map = mapStore.mapInstance;

    if (!map) return;

    untrack(() => {
      stopRotation();
      map.off("moveend", startRotation);

      if (category === "building" && type === "result") {
        const currentBuilding = buildings.find(
          (building) => building.building_name === value,
        );

        if (
          currentBuilding &&
          currentBuilding.lon &&
          currentBuilding.lat &&
          isInsideCampusMapBounds(currentBuilding.lon, currentBuilding.lat)
        ) {
          map.flyTo({
            center: [currentBuilding.lon, currentBuilding.lat],
            zoom: 18,
            pitch: CITU_DEFAULT_PITCH,
            bearing: CITU_DEFAULT_BEARING,
            padding: calculatePadding(md.current),
            duration: 1500,
          });
          map.once("moveend", startRotation);
        }
      } else if (category === null) {
        activeOfficialBuildingName = null;
        map.flyTo({
          center: CITU_CAMPUS_CENTER,
          zoom: CITU_DEFAULT_ZOOM,
          pitch: CITU_DEFAULT_PITCH,
          bearing: CITU_DEFAULT_BEARING,
          duration: 1500,
        });
      } else if (category === "room") {
        const currentRoom = rooms.find((room) => room.code === value);
        if (
          currentRoom &&
          currentRoom.building &&
          currentRoom.building.lat &&
          currentRoom.building.lon &&
          isInsideCampusMapBounds(
            currentRoom.building.lon,
            currentRoom.building.lat,
          )
        ) {
          map.flyTo({
            center: [currentRoom.building.lon, currentRoom.building.lat],
            zoom: 18,
            pitch: CITU_DEFAULT_PITCH,
            bearing: CITU_DEFAULT_BEARING,
            padding: calculatePadding(md.current),
            duration: 1500,
          });
          map.once("moveend", startRotation);
        }
      }
    });
  });

  function handleMarkerClick(buildingName: string) {
    activeOfficialBuildingName = null;
    if (buildingName === queryStore.inputValue) return;
    queryStore.updateQuery({
      category: "building",
      type: "result",
      value: buildingName,
    });
    queryStore.inputValue = buildingName;
  }

  function handleOfficialBuildingClick(
    buildingLabel: CituBuildingLabel,
    event: MouseEvent,
  ) {
    event.stopPropagation();
    activeOfficialBuildingName = buildingLabel.name;
    stopRotation();

    if (!mapStore.mapInstance) return;

    mapStore.mapInstance.flyTo({
      center: buildingLabel.coords,
      zoom: Math.max(mapStore.mapInstance.getZoom(), 18),
      pitch: CITU_DEFAULT_PITCH,
      bearing: CITU_DEFAULT_BEARING,
      padding: calculatePadding(md.current),
      duration: 1200,
    });
    mapStore.mapInstance.once("moveend", startRotation);
  }

  let activeBuildingName = $derived.by(() => {
    if (!queryStore.category || queryStore.type !== "result") return null;
    switch (queryStore.category) {
      case "building":
        return queryStore.inputValue;
      case "room": {
        const currentRoom = rooms.find(
          (room) => room.code === queryStore.inputValue,
        );
        return currentRoom && currentRoom.building
          ? currentRoom.building.name
          : null;
      }
      default:
        return null;
    }
  });

  const activeRouteGeoJson = $derived.by(() => ({
    type: "FeatureCollection" as const,
    features: navigationStore.activeRoute
      ? [
          {
            type: "Feature" as const,
            properties: {},
            geometry: {
              type: "LineString" as const,
              coordinates: navigationStore.activeRoute.steps.map(
                (step) => step.coords,
              ),
            },
          },
        ]
      : [],
  }));

  const activeNavigationCoords = $derived.by(() => {
    if (!navigationStore.activeRoute) return null;
    if (navigationStore.mode === "live" && locationStore.coords) {
      return locationStore.coords;
    }
    return navigationStore.avatarCoords;
  });

  $effect(() => {
    const activeRoute = navigationStore.activeRoute;
    const mode = navigationStore.mode;
    const coords = locationStore.coords;

    if (activeRoute && mode === "live" && coords) {
      untrack(() => navigationStore.updateFromLivePosition(coords));
    }
  });

  $effect(() => {
    const map = mapStore.mapInstance;
    const activeRoute = navigationStore.activeRoute;
    const coords = activeNavigationCoords;

    if (!map || !activeRoute || !coords) return;

    const nextStep =
      activeRoute.steps[
        Math.min(
          navigationStore.activeStepIndex + 1,
          activeRoute.steps.length - 1,
        )
      ];

    untrack(() => {
      stopRotation();
      map.flyTo({
        center: coords,
        zoom: 19.3,
        pitch: 65,
        bearing: nextStep
          ? getBearing(coords, nextStep.coords)
          : map.getBearing(),
        padding: calculatePadding(md.current),
        duration: 900,
      });
    });
  });
</script>

<div class="map-container">
  <!-- <button
    onclick={() =>
      console.log(
        /**
         *
         * zoom 17.2 bearing -28
         * LAT 10.29578 LONG 123.88047
         */

        mapInstance?.getZoom(),
        mapInstance?.getBearing(),
        mapInstance?.getCenter(),
      )}
    style="position:fixed; left:50%; top:50%; z-index: 100;">log map</button
  > -->
  <MapLibre
    bind:map={mapStore.mapInstance}
    style="/liberty-customized.json"
    maxBounds={CITU_MAP_BOUNDS}
    center={CITU_CAMPUS_CENTER}
    zoom={CITU_DEFAULT_ZOOM}
    pitch={CITU_DEFAULT_PITCH}
    bearing={CITU_DEFAULT_BEARING}
    minZoom={15}
    class="map"
  >
    <FillExtrusionLayer
      sourceLayer="building"
      paint={{
        "fill-extrusion-color": "#aaa",
        "fill-extrusion-height": [
          "coalesce",
          ["to-number", ["get", "render_height"]],
          ["to-number", ["get", "height"]],
          12,
        ],
        "fill-extrusion-base": [
          "coalesce",
          ["to-number", ["get", "render_min_height"]],
          ["to-number", ["get", "min_height"]],
          0,
        ],
        "fill-extrusion-opacity": 0.6,
      }}
    />
    {#if navigationStore.activeRoute}
      <GeoJSON id="active-room-route" data={activeRouteGeoJson}>
        <LineLayer
          id="active-room-route-shadow"
          layout={{
            "line-cap": "round",
            "line-join": "round",
          }}
          paint={{
            "line-color": "#ffffff",
            "line-width": 10,
            "line-opacity": 0.9,
          }}
        />
        <LineLayer
          id="active-room-route-line"
          layout={{
            "line-cap": "round",
            "line-join": "round",
          }}
          paint={{
            "line-color": "hsl(5, 53%, 32%)",
            "line-width": 5,
            "line-opacity": 0.96,
          }}
        />
      </GeoJSON>
    {/if}
    <Marker lngLat={CITU_CAMPUS_CENTER}>
      <div class="pin active" title={CITU_CAMPUS_NAME}>
        <University size="20" />
        <div class="pin-label active">
          {CITU_CAMPUS_SHORT_NAME}
        </div>
      </div>
    </Marker>
    {#if zoomLevel >= 16.4}
      {#each CITU_BUILDING_LABELS as buildingLabel}
        <Marker lngLat={buildingLabel.coords}>
          <div class="official-label-anchor">
            <button
              type="button"
              class="official-building-pin"
              class:active={activeOfficialBuildingName === buildingLabel.name}
              title={buildingLabel.fullName ?? buildingLabel.name}
              onclick={(event) =>
                handleOfficialBuildingClick(buildingLabel, event)}
            >
              <div class="official-building-label">
                <strong>{buildingLabel.name}</strong>
              </div>
              <span class="official-building-icon">
                <Building2 size={18} />
              </span>
            </button>
          </div>
        </Marker>
      {/each}
    {/if}
    {#if activeNavigationCoords}
      <Marker lngLat={activeNavigationCoords}>
        <div
          class="navigator-avatar"
          title={navigationStore.currentStep?.label ?? "Navigation"}
        >
          <UserRound size="18" />
        </div>
      </Marker>
    {:else if locationStore.coords}
      <Marker
        lngLat={locationStore.coords}
        draggable={locationStore.mockMode}
        ondragend={(e) => locationStore.setMockCoords(e.lngLat)}
      >
        <div
          class="user-location-pin"
          class:mock={locationStore.mockMode}
        ></div>
      </Marker>
    {/if}
    {#each buildings as building}
      {#if building.lat && building.lon && isInsideCampusMapBounds(building.lon, building.lat)}
        <Marker
          lngLat={[building.lon, building.lat]}
          onclick={() => handleMarkerClick(building.building_name)}
        >
          <div
            class="pin"
            class:active={activeBuildingName === building.building_name}
            title={building.building_name}
          >
            <University size="20" />
            <div
              class="pin-label"
              class:active={zoomLevel >= 17}
              transition:fade
            >
              {building.building_name}
            </div>
          </div>
        </Marker>
      {/if}
    {/each}
  </MapLibre>
</div>

<style>
  .map-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
  }

  .user-location-pin {
    width: 1rem;
    height: 1rem;
    background-color: #4285f4;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
    position: relative;
    z-index: 70;
  }
  .user-location-pin.mock {
    background-color: #f59e0b;
    cursor: grab;
  }

  .navigator-avatar {
    display: grid;
    place-items: center;
    width: 2.35rem;
    height: 2.35rem;
    color: white;
    background-color: hsl(5, 53%, 32%);
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 0.25rem 0.8rem rgba(0, 0, 0, 0.35);
    position: relative;
    z-index: 90;
  }

  .navigator-avatar::after {
    content: "";
    position: absolute;
    top: -0.55rem;
    left: 50%;
    translate: -50% 0;
    width: 0;
    height: 0;
    border-left: 0.35rem solid transparent;
    border-right: 0.35rem solid transparent;
    border-bottom: 0.55rem solid hsl(5, 53%, 32%);
  }
  .user-location-pin::after {
    content: "";
    position: absolute;
    top: -5px;
    left: -5px;
    right: -5px;
    bottom: -5px;
    border-radius: 50%;
    border: 2px solid #4285f4;
    animation: pulsate 2s ease-out infinite;
    opacity: 0;
  }

  .official-label-anchor {
    position: relative;
    width: 0;
    height: 0;
    z-index: 80;
  }

  .official-building-pin {
    all: unset;
    position: absolute;
    left: 0;
    bottom: 0;
    translate: -50% 0;
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    color: white;
    background-color: hsl(5, 53%, 32%);
    border: 2px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 0.25rem rgba(0, 0, 0, 0.3);
    cursor: pointer;
    pointer-events: auto;
    transition:
      background-color 0.2s,
      transform 0.2s;
  }

  .official-building-pin:hover,
  .official-building-pin.active {
    background-color: hsl(5, 53%, 32%);
  }

  .official-building-pin.active::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 50%;
    outline: 0.125rem solid hsl(5, 53%, 40%);
    outline-offset: 0.125rem;
    pointer-events: none;
  }

  .official-building-icon {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    color: white;
  }

  .official-building-label {
    position: absolute;
    bottom: calc(100% + 0.45rem);
    left: 50%;
    translate: -50% 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: max-content;
    max-width: 8.25rem;
    padding: 0.25rem 0.55rem;
    color: white;
    background-color: hsl(5, 53%, 32%);
    border-radius: 0.5rem;
    box-shadow: 0 2px 0.25rem rgba(0, 0, 0, 0.25);
    line-height: 1.05;
    text-align: center;
    pointer-events: none;
    white-space: normal;
  }

  .official-building-label strong {
    font-size: 0.78rem;
    letter-spacing: 0;
    font-weight: 900;
    line-height: 1.05;
  }

  @keyframes pulsate {
    0% {
      transform: scale(0.5);
      opacity: 1;
    }
    100% {
      transform: scale(1.5);
      opacity: 0;
    }
  }

  .pin {
    line-height: 0;
    padding: 0.25rem;
    color: white;
    background-color: hsl(5, 53%, 32%);
    border: 2px solid white;
    border-radius: 50%;
    cursor: pointer;
    position: relative;
    box-shadow: 0 2px 0.25rem rgba(0, 0, 0, 0.3);
    transition:
      transform 0.2s,
      scale 1.5s;

    &.active {
      z-index: 60;

      &::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        outline: 0.125rem solid hsl(5, 53%, 40%);
        outline-offset: 0.125rem;
      }
      .pin-label {
        background-color: hsl(5, 53%, 32%);
        color: white;
        opacity: 1;
      }
    }
    .pin-label {
      line-height: initial;
      color: black;
      position: absolute;
      bottom: calc(100% + 0.5rem);
      left: 50%;
      translate: -50% 0;
      background-color: white;
      border-radius: 0.5rem;
      padding: 0.25rem 0.75rem;
      width: max-content;
      opacity: 0;
      transition: opacity 0.2s;
      pointer-events: none;
      &.active {
        opacity: 1;
      }
    }
  }

  .pin:hover {
    background-color: hsl(5, 53%, 40%);

    .pin-label {
      opacity: 1;
    }
  }
</style>
