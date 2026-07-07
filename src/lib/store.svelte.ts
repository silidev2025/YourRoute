import type { modalOptions } from "../constants/modal-states";
import { SvelteMap } from "svelte/reactivity";
import * as maplibre from "maplibre-gl";
import { CITU_LOCATION_BOUNDS } from "../constants/campus";
import type { RecentSearch } from "./types";
import { getMockLocation } from "./dev";
import type { LngLat, RoomRoute } from "../constants/room-routes";

type LocationRequestOptions = {
  fallbackCoords?: LngLat;
  fallbackMessage?: string;
  allowOutsideCampus?: boolean;
};

type NavigationMode = "live" | "demo";

interface ModalStoreState {
  open: boolean;
  type: (typeof modalOptions)[number] | null;
}

export interface QueryStoreState {
  type: "query" | "result";
  category: "building" | "division" | "college" | "room" | "class" | null;
  value: string;
}

class ModalStore {
  private _modalStore: ModalStoreState = $state({
    open: false,
    type: null,
  });

  open = $derived(this._modalStore.open);
  type = $derived(this._modalStore.type);

  openModal = (type: ModalStoreState["type"]) => {
    this._modalStore.open = true;
    this._modalStore.type = type;
  };

  closeModal = () => {
    this._modalStore = {
      open: false,
      type: null,
    };
  };
}

class QueryStore {
  private _queryStore: QueryStoreState = $state({
    category: null,
    type: "query",
    value: "",
  });
  recentSearches: RecentSearch[] = $state([]);
  private _filters = new SvelteMap<
    string,
    Exclude<QueryStoreState["category"], null>
  >();
  inputValue = $state("");
  category = $derived(this._queryStore.category);
  type = $derived(this._queryStore.type);
  queryValue = $derived(this._queryStore.value);
  filterValues = $derived(
    Array.from(
      this._filters.entries().map(([value, category]) => ({
        category,
        value,
      })),
    ),
  );

  // onclick of query buttons
  updateQuery = (obj: QueryStoreState) => {
    this._queryStore = obj;

    if (obj.type === "result" && obj.category !== null) {
      this.addRecentSearch({
        category: obj.category,
        value: obj.value,
      });
    }
  };

  addRecentSearch(recentSearch: RecentSearch) {
    const qIndex = this.recentSearches.findIndex(
      (query) =>
        query.value === recentSearch.value &&
        query.category === recentSearch.category,
    );
    if (qIndex !== -1) this.recentSearches.splice(qIndex, 1);
    else if (this.recentSearches.length > 4) this.recentSearches.pop();

    this.recentSearches.unshift(recentSearch);
  }

  // when clicking the x button
  clearQuery = () => {
    this._queryStore = {
      category: null,
      type: "query",
      value: "",
    };
    this.inputValue = "";
  };

  setType = (type: QueryStoreState["type"]) => {
    this._queryStore.type = type;
  };

  setCategory = (category: QueryStoreState["category"]) => {
    this._queryStore.category = category;
  };

  addFilter = (
    key: string,
    category: Exclude<QueryStoreState["category"], null>,
  ) => {
    this._filters.set(key, category);
  };

  removeFilter = (key: string) => {
    this._filters.delete(key);
  };

  clearFilters = () => {
    this._filters.clear();
  };
}

class ToastStore {
  message: string | null = $state(null);
  type: "info" | "error" | "success" = $state("info");

  show = (message: string, type: "info" | "error" | "success" = "info") => {
    this.message = message;
    this.type = type;
  };

  clear = () => {
    this.message = null;
  };
}

class LocationStore {
  coords: [number, number] | null = $state(null);
  bearing: number | null = $state(null);
  isTracking: boolean = $state(false);
  destination: [number, number] | null = $state(null);
  routeOrigin: [number, number] | null = $state(null);
  /** Dev-only: when true, position comes from ?mockLocation / dragging, not GPS. */
  mockMode: boolean = $state(false);
  private watchId: number | null = null;

  private readonly CAMPUS_BOUNDS = CITU_LOCATION_BOUNDS;

  private isWithinBounds(lng: number, lat: number) {
    return (
      lng >= this.CAMPUS_BOUNDS.minLng &&
      lng <= this.CAMPUS_BOUNDS.maxLng &&
      lat >= this.CAMPUS_BOUNDS.minLat &&
      lat <= this.CAMPUS_BOUNDS.maxLat
    );
  }

  /**
   * Dev-only: if ?mockLocation=lon,lat is present, seed a fake on-campus
   * position so navigation can be tested off-site. Call once on mount.
   */
  initFromUrl = () => {
    const mock = getMockLocation();
    if (!mock) return;
    this.mockMode = true;
    this.isTracking = true;
    this.coords = mock;
    this.bearing = null;
    toastStore.show("Mock location active (dev mode)", "info");
  };

  /** Dev-only: move the simulated position (e.g. from dragging the dot). */
  setMockCoords = (coords: [number, number]) => {
    if (!this.mockMode) return;
    this.coords = coords;
    if (this.destination && !this.routeOrigin) {
      this.routeOrigin = coords;
    }
  };

  startMockNavigation = (coords: LngLat) => {
    this.mockMode = true;
    this.isTracking = true;
    this.coords = coords;
    this.bearing = null;
    this.destination = null;
    this.routeOrigin = null;
  };

  stopMockNavigation = () => {
    if (!this.mockMode) return;
    this.mockMode = false;
    this.stopTracking();
  };

  stopLocation = () => {
    this.mockMode = false;
    this.destination = null;
    this.stopTracking();
  };

  private activateFallbackLocation(coords: LngLat, message: string) {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.mockMode = true;
    this.isTracking = true;
    this.coords = coords;
    this.bearing = null;
    this.destination = null;
    this.routeOrigin = null;
    toastStore.show(message, "info");
  }

  requestLocation = (options: LocationRequestOptions = {}) => {
    // In mock mode the position is supplied manually; skip real GPS.
    if (this.mockMode) return;

    if (!navigator.geolocation) {
      if (options.fallbackCoords) {
        this.activateFallbackLocation(
          options.fallbackCoords,
          options.fallbackMessage ??
            "Live GPS is unavailable. Using demo navigation.",
        );
        return;
      }
      toastStore.show("Geolocation is not supported by your browser.", "error");
      return;
    }

    if (this.isTracking) {
      if (!this.coords) {
        toastStore.show("Still getting your location...", "info");
      }
      return;
    }

    this.isTracking = true;
    toastStore.show("Requesting location access...", "info");

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { longitude, latitude, heading } = position.coords;

        if (
          !options.allowOutsideCampus &&
          !this.isWithinBounds(longitude, latitude)
        ) {
          if (options.fallbackCoords) {
            this.activateFallbackLocation(
              options.fallbackCoords,
              options.fallbackMessage ??
                "Live GPS is outside campus. Using demo navigation.",
            );
            return;
          }
          toastStore.show(
            "You appear to be outside the Cebu Institute of Technology - University campus. Location features are limited to the campus area.",
            "error",
          );
          this.stopTracking();
          return;
        }

        const firstFix = !this.coords;
        this.coords = [longitude, latitude];
        this.bearing = heading;
        // Update route origin if destination exists but origin hasn't been set
        if (this.destination && !this.routeOrigin) {
          this.routeOrigin = [longitude, latitude];
        }

        if (firstFix) {
          toastStore.show("Location found!", "success");
        }
      },
      (error) => {
        let msg = "An unknown error occurred while getting location.";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = "Location access denied. Please enable it in your settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            msg = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            msg = "Location request timed out.";
            break;
        }
        toastStore.show(msg, "error");
        if (options.fallbackCoords) {
          this.activateFallbackLocation(
            options.fallbackCoords,
            options.fallbackMessage ??
              "Live GPS could not start. Using demo navigation.",
          );
          return;
        }
        this.stopTracking();
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 },
    );
  };

  private stopTracking() {
    this.isTracking = false;
    this.coords = null;
    this.routeOrigin = null;
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  setDestination = (coords: [number, number]) => {
    this.destination = coords;
    this.routeOrigin = this.coords;
  };

  clearDestination = () => {
    this.destination = null;
    this.routeOrigin = null;
  };
}

class MapStore {
  mapInstance: maplibre.MapLibreMap | undefined = $state.raw();
}

class NavigationStore {
  activeRoute: RoomRoute | null = $state(null);
  activeStepIndex = $state(0);
  mode: NavigationMode = $state("demo");
  distanceToNextMeters: number | null = $state(null);
  distanceToRouteMeters: number | null = $state(null);
  indoorViewOpen = $state(false);

  isNavigating = $derived(this.activeRoute !== null);
  currentStep = $derived(this.activeRoute?.steps[this.activeStepIndex] ?? null);
  avatarCoords = $derived(this.currentStep?.coords ?? null);
  totalSteps = $derived(this.activeRoute?.steps.length ?? 0);

  private distanceMeters(from: LngLat, to: LngLat) {
    const earthRadiusMeters = 6371000;
    const fromLat = (from[1] * Math.PI) / 180;
    const toLat = (to[1] * Math.PI) / 180;
    const deltaLat = ((to[1] - from[1]) * Math.PI) / 180;
    const deltaLng = ((to[0] - from[0]) * Math.PI) / 180;
    const a =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) ** 2;
    return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private getClosestStepIndex(coords: LngLat) {
    if (!this.activeRoute) return 0;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    this.activeRoute.steps.forEach((step, index) => {
      const distance = this.distanceMeters(coords, step.coords);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    this.distanceToRouteMeters = closestDistance;
    return closestIndex;
  }

  startRoute = (route: RoomRoute, mode: NavigationMode = "live") => {
    this.activeRoute = route;
    this.activeStepIndex = 0;
    this.mode = mode;
    this.distanceToNextMeters = null;
    this.distanceToRouteMeters = null;
  };

  openIndoorView = () => {
    if (!this.activeRoute) return;
    this.indoorViewOpen = true;
  };

  closeIndoorView = () => {
    this.indoorViewOpen = false;
  };

  toggleIndoorView = () => {
    if (!this.activeRoute) return;
    this.indoorViewOpen = !this.indoorViewOpen;
  };

  setStep = (index: number, mode: NavigationMode = "demo") => {
    if (!this.activeRoute) return null;
    const lastIndex = this.activeRoute.steps.length - 1;
    this.activeStepIndex = Math.max(0, Math.min(index, lastIndex));
    this.mode = mode;
    this.distanceToNextMeters = null;
    return this.activeRoute.steps[this.activeStepIndex]?.coords ?? null;
  };

  nextStep = () => {
    return this.setStep(this.activeStepIndex + 1, "demo");
  };

  previousStep = () => {
    return this.setStep(this.activeStepIndex - 1, "demo");
  };

  updateFromLivePosition = (coords: LngLat) => {
    if (!this.activeRoute || this.mode !== "live") return;

    const arrivalRadiusMeters = 10;
    const lastIndex = this.activeRoute.steps.length - 1;
    const closestIndex = this.getClosestStepIndex(coords);

    if (
      closestIndex > this.activeStepIndex &&
      this.distanceToRouteMeters !== null &&
      this.distanceToRouteMeters <= arrivalRadiusMeters * 1.5
    ) {
      this.activeStepIndex = closestIndex;
    }

    const nextIndex = Math.min(this.activeStepIndex + 1, lastIndex);
    const nextStep = this.activeRoute.steps[nextIndex];
    if (!nextStep) return;

    this.distanceToNextMeters = this.distanceMeters(coords, nextStep.coords);
    if (
      this.activeStepIndex < lastIndex &&
      this.distanceToNextMeters <= arrivalRadiusMeters
    ) {
      this.activeStepIndex += 1;
      const newNextIndex = Math.min(this.activeStepIndex + 1, lastIndex);
      const newNextStep = this.activeRoute.steps[newNextIndex];
      this.distanceToNextMeters = newNextStep
        ? this.distanceMeters(coords, newNextStep.coords)
        : 0;
    }
  };

  stopRoute = () => {
    this.activeRoute = null;
    this.activeStepIndex = 0;
    this.mode = "demo";
    this.distanceToNextMeters = null;
    this.distanceToRouteMeters = null;
    this.indoorViewOpen = false;
  };
}

export const queryStore = new QueryStore();
export const modalStore = new ModalStore();
export const toastStore = new ToastStore();
export const locationStore = new LocationStore();
export const mapStore = new MapStore();
export const navigationStore = new NavigationStore();
