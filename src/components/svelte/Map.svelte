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
    CITU_LOCATION_BOUNDS,
    CITU_MAP_BOUNDS,
    findCituBuildingLabel,
  } from "../../constants/campus";
  import { getAppData } from "../../lib/context";
  import { preloadOfflineMapAssets } from "../../lib/offline-map-cache";
  import {
    queryStore,
    locationStore,
    mapStore,
    navigationStore,
  } from "../../lib/store.svelte";
  import { untrack } from "svelte";
  import { fade } from "svelte/transition";
  import MapLibreGlDirections from "@maplibre/maplibre-gl-directions";
  import {
    Building2,
    Route as RouteIcon,
    University,
    UserRound,
  } from "@lucide/svelte";
  import { MediaQuery } from "svelte/reactivity";
  import * as mapGl from "maplibre-gl";
  import type { LngLat } from "../../constants/room-routes";
  import { onMount } from "svelte";
  const { buildings, rooms } = getAppData();
  let directions: MapLibreGlDirections | undefined = $state.raw();

  let animationFrameId: number | null = $state(null);
  let isOnline = $state(true);
  let mapHasLoaded = $state(false);
  let mapHasErrored = $state(false);

  let isRotating = $state(false);
  let lastTimestamp = $state(0);
  let currentRotation = $state(0);
  let zoomLevel = $state(CITU_DEFAULT_ZOOM);
  let activeOfficialBuildingName = $state<string | null>(null);
  const SIDEPANEL_WIDTH = 25.75 * 16;
  const md = new MediaQuery("max-width:48rem");
  const OFFLINE_MAP_BOUNDS: [[number, number], [number, number]] = [
    [
      CITU_LOCATION_BOUNDS.minLng - 0.00045,
      CITU_LOCATION_BOUNDS.minLat - 0.00035,
    ],
    [
      CITU_LOCATION_BOUNDS.maxLng + 0.00045,
      CITU_LOCATION_BOUNDS.maxLat + 0.00035,
    ],
  ];

  onMount(() => {
    const updateOnlineStatus = () => {
      isOnline = navigator.onLine;
    };
    const cacheMapAssets = () => {
      void preloadOfflineMapAssets();
    };
    const handleOnline = () => {
      updateOnlineStatus();
      mapHasErrored = false;
      cacheMapAssets();
    };

    updateOnlineStatus();
    cacheMapAssets();
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", updateOnlineStatus);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  });

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

  function getOfflineMapPoint(lon: number, lat: number) {
    const [[minLng, minLat], [maxLng, maxLat]] = OFFLINE_MAP_BOUNDS;
    const x = ((lon - minLng) / (maxLng - minLng)) * 100;
    const y = (1 - (lat - minLat) / (maxLat - minLat)) * 100;

    return {
      x: Math.max(4, Math.min(96, x)),
      y: Math.max(4, Math.min(96, y)),
    };
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

  function handleMapLoad() {
    mapHasLoaded = true;
    mapHasErrored = false;
  }

  function handleMapError() {
    mapHasErrored = true;
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
    if (isOnline && mapStore.mapInstance && !directions) {
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
        const officialBuilding = findCituBuildingLabel(value);

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
        } else if (officialBuilding) {
          activeOfficialBuildingName = officialBuilding.name;
          map.flyTo({
            center: officialBuilding.coords,
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
        return (
          findCituBuildingLabel(queryStore.inputValue)?.name ??
          queryStore.inputValue
        );
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

  const offlineRoutePoints = $derived.by(() => {
    if (navigationStore.activeRoute) {
      return navigationStore.activeRoute.steps.map((step) =>
        getOfflineMapPoint(step.coords[0], step.coords[1]),
      );
    }

    const origin = locationStore.routeOrigin ?? locationStore.coords;
    if (origin && locationStore.destination) {
      return [
        getOfflineMapPoint(origin[0], origin[1]),
        getOfflineMapPoint(
          locationStore.destination[0],
          locationStore.destination[1],
        ),
      ];
    }

    return [];
  });

  const offlineRoutePolyline = $derived(
    offlineRoutePoints.map((point) => `${point.x},${point.y}`).join(" "),
  );

  const offlineUserPoint = $derived.by(() => {
    const coords = activeNavigationCoords ?? locationStore.coords;
    return coords ? getOfflineMapPoint(coords[0], coords[1]) : null;
  });

  const offlineDestinationPoint = $derived.by(() => {
    const activeRoute = navigationStore.activeRoute;
    const destination =
      activeRoute?.steps[activeRoute.steps.length - 1]?.coords ??
      locationStore.destination;

    return destination
      ? getOfflineMapPoint(destination[0], destination[1])
      : null;
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
    onload={handleMapLoad}
    onerror={handleMapError}
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
  {#if !isOnline && (mapHasErrored || !mapHasLoaded)}
    <div class="offline-map" aria-label="Offline campus map">
      <div class="offline-map-grid"></div>
      <svg
        class="offline-campus-layer"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path class="offline-road major" d="M -4 88 C 18 86 42 88 104 84" />
        <path class="offline-road" d="M 28 10 C 32 30 37 52 48 94" />
        <path class="offline-road" d="M 68 8 C 61 28 59 49 67 92" />
        <path class="offline-path" d="M 18 61 C 35 58 52 56 83 58" />
        <path class="offline-path" d="M 18 47 C 38 45 58 45 84 43" />
        <rect
          class="offline-green"
          x="24"
          y="35"
          width="18"
          height="15"
          rx="2"
        />
        <rect
          class="offline-green"
          x="48"
          y="51"
          width="12"
          height="19"
          rx="2"
        />
        <rect
          class="offline-building-footprint"
          x="31"
          y="61"
          width="22"
          height="7"
          rx="1"
        />
        <rect
          class="offline-building-footprint"
          x="48"
          y="38"
          width="20"
          height="8"
          rx="1"
        />
        <rect
          class="offline-building-footprint"
          x="56"
          y="66"
          width="17"
          height="7"
          rx="1"
        />
        <rect
          class="offline-building-footprint"
          x="70"
          y="43"
          width="13"
          height="8"
          rx="1"
        />
      </svg>
      {#if offlineRoutePolyline}
        <svg
          class="offline-route-layer"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <polyline
            class="offline-route-shadow"
            points={offlineRoutePolyline}
          />
          <polyline class="offline-route-line" points={offlineRoutePolyline} />
          {#each offlineRoutePoints as point}
            <circle
              class="offline-route-step"
              cx={point.x}
              cy={point.y}
              r="0.75"
            />
          {/each}
        </svg>
      {/if}
      <div class="offline-campus-label">
        <University size="20" />
        <span>{CITU_CAMPUS_SHORT_NAME}</span>
      </div>
      <div class="offline-map-status">Offline map</div>
      {#each CITU_BUILDING_LABELS as buildingLabel}
        {@const point = getOfflineMapPoint(
          buildingLabel.coords[0],
          buildingLabel.coords[1],
        )}
        <button
          type="button"
          class="offline-building-pin official"
          class:active={activeOfficialBuildingName === buildingLabel.name ||
            activeBuildingName === buildingLabel.name}
          style:left={`${point.x}%`}
          style:top={`${point.y}%`}
          title={buildingLabel.fullName ?? buildingLabel.name}
          onclick={(event) => handleOfficialBuildingClick(buildingLabel, event)}
        >
          <span class="offline-building-dot">
            <Building2 size="16" />
          </span>
          <span class="offline-building-label">
            <strong>{buildingLabel.name}</strong>
          </span>
        </button>
      {/each}
      {#if offlineDestinationPoint}
        <div
          class="offline-destination-pin"
          style:left={`${offlineDestinationPoint.x}%`}
          style:top={`${offlineDestinationPoint.y}%`}
          title="Destination"
        >
          <RouteIcon />
        </div>
      {/if}
      {#if offlineUserPoint}
        <div
          class="offline-user-pin"
          class:mock={locationStore.mockMode}
          style:left={`${offlineUserPoint.x}%`}
          style:top={`${offlineUserPoint.y}%`}
          title={locationStore.mockMode ? "Demo position" : "Your location"}
        >
          <UserRound size="16" />
        </div>
      {/if}
      {#each buildings as building}
        {#if building.lat && building.lon && isInsideCampusMapBounds(building.lon, building.lat)}
          {@const point = getOfflineMapPoint(building.lon, building.lat)}
          <button
            type="button"
            class="offline-building-pin"
            class:active={activeBuildingName === building.building_name}
            style:left={`${point.x}%`}
            style:top={`${point.y}%`}
            title={building.building_name}
            onclick={() => handleMarkerClick(building.building_name)}
          >
            <span class="offline-building-dot">
              <University size="16" />
            </span>
            <span class="offline-building-label">{building.building_name}</span>
          </button>
        {/if}
      {/each}
    </div>
  {/if}
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

  .map-container :global(.map) {
    position: absolute;
    inset: 0;
    z-index: 1;
  }

  .offline-map {
    position: absolute;
    inset: 0;
    z-index: 2;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background:
      radial-gradient(
        circle at 55% 45%,
        rgba(123, 17, 19, 0.1),
        transparent 28rem
      ),
      linear-gradient(135deg, #f7f7f7 0%, #eceff1 100%);
  }

  .offline-map-grid {
    position: absolute;
    inset: 0;
    opacity: 0.55;
    background-image:
      linear-gradient(rgba(123, 17, 19, 0.08) 1px, transparent 1px),
      linear-gradient(90deg, rgba(123, 17, 19, 0.08) 1px, transparent 1px);
    background-size: 2rem 2rem;
  }

  .offline-campus-layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    opacity: 0.86;
  }

  .offline-road,
  .offline-path {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
  }

  .offline-road {
    stroke: #d9d9d9;
    stroke-width: 13;
  }

  .offline-road.major {
    stroke: #f4d178;
    stroke-width: 17;
  }

  .offline-path {
    stroke: #9aa0a6;
    stroke-width: 4;
    opacity: 0.75;
  }

  .offline-green {
    fill: #bfe3c4;
    opacity: 0.9;
  }

  .offline-building-footprint {
    fill: #d7d7d7;
    stroke: #b8b8b8;
    stroke-width: 0.35;
    vector-effect: non-scaling-stroke;
  }

  .offline-route-layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .offline-route-shadow,
  .offline-route-line {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
  }

  .offline-route-shadow {
    stroke: white;
    stroke-width: 8;
    opacity: 0.9;
  }

  .offline-route-line {
    stroke: hsl(5, 53%, 32%);
    stroke-width: 4;
    opacity: 0.95;
  }

  .offline-route-step {
    fill: white;
    stroke: hsl(5, 53%, 32%);
    stroke-width: 0.35;
    vector-effect: non-scaling-stroke;
  }

  .offline-map-status,
  .offline-campus-label {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: hsl(5, 53%, 32%);
    background-color: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(123, 17, 19, 0.18);
    border-radius: 999px;
    box-shadow: 0 2px 0.6rem rgba(0, 0, 0, 0.12);
    font-weight: 800;
    pointer-events: none;
  }

  .offline-campus-label {
    left: 50%;
    top: 50%;
    translate: -50% -50%;
    padding: 0.5rem 0.8rem;
  }

  .offline-map-status {
    right: 1rem;
    top: 1rem;
    padding: 0.45rem 0.7rem;
    font-size: 0.875rem;
  }

  .offline-building-pin {
    all: unset;
    position: absolute;
    translate: -50% -50%;
    z-index: 1;
    cursor: pointer;
    pointer-events: auto;
    display: grid;
    place-items: center;
  }

  .offline-building-pin.official {
    z-index: 2;
  }

  .offline-user-pin,
  .offline-destination-pin {
    position: absolute;
    translate: -50% -50%;
    z-index: 5;
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    color: white;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.28);
    pointer-events: none;
  }

  .offline-user-pin {
    background-color: #2563eb;
  }

  .offline-user-pin.mock {
    background-color: #f59e0b;
  }

  .offline-user-pin::after {
    content: "";
    position: absolute;
    inset: -0.45rem;
    border: 2px solid currentColor;
    border-radius: 50%;
    animation: pulsate 2s ease-out infinite;
    opacity: 0;
  }

  .offline-destination-pin {
    background-color: hsl(5, 53%, 32%);
  }

  .offline-building-dot {
    display: grid;
    place-items: center;
    width: 1.75rem;
    height: 1.75rem;
    color: white;
    background-color: hsl(5, 53%, 32%);
    border: 2px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 0.35rem rgba(0, 0, 0, 0.25);
  }

  .offline-building-pin.official .offline-building-dot {
    width: 2rem;
    height: 2rem;
  }

  .offline-building-label {
    position: absolute;
    bottom: calc(100% + 0.35rem);
    left: 50%;
    translate: -50% 0;
    width: max-content;
    max-width: 9rem;
    padding: 0.25rem 0.5rem;
    color: hsl(5, 53%, 24%);
    background-color: white;
    border-radius: 0.45rem;
    box-shadow: 0 2px 0.35rem rgba(0, 0, 0, 0.16);
    font-size: 0.75rem;
    font-weight: 800;
    line-height: 1.05;
    text-align: center;
    opacity: 0;
    pointer-events: none;
  }

  .offline-building-pin.official .offline-building-label {
    display: flex;
    align-items: center;
    opacity: 1;
    color: white;
    background-color: hsl(5, 53%, 32%);
    border: 1px solid rgba(255, 255, 255, 0.75);
    box-shadow: 0 2px 0.45rem rgba(0, 0, 0, 0.22);
  }

  .offline-building-pin.official .offline-building-label strong {
    font-size: 0.78rem;
    line-height: 1.05;
  }

  .offline-building-pin:hover,
  .offline-building-pin.active {
    z-index: 2;
  }

  .offline-building-pin:hover .offline-building-dot,
  .offline-building-pin.active .offline-building-dot {
    background-color: hsl(5, 53%, 40%);
    outline: 0.125rem solid hsl(5, 53%, 40%);
    outline-offset: 0.125rem;
  }

  .offline-building-pin:hover .offline-building-label,
  .offline-building-pin.active .offline-building-label {
    opacity: 1;
  }

  @media screen and (max-width: 48rem) {
    .offline-map-status {
      top: auto;
      right: 0.75rem;
      bottom: calc(4.25rem + env(safe-area-inset-bottom));
      font-size: 0.75rem;
    }

    .offline-campus-label {
      top: 56%;
    }

    .offline-building-label {
      display: none;
    }

    .offline-building-pin.official {
      scale: 0.92;
    }

    .offline-building-pin.official .offline-building-label {
      display: flex;
      opacity: 1;
      max-width: 7.25rem;
      font-size: 0.68rem;
    }

    .offline-building-pin.official .offline-building-label strong {
      font-size: 0.68rem;
    }

    .offline-building-pin.active .offline-building-label {
      display: block;
      opacity: 1;
    }
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
