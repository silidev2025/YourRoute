<script lang="ts">
  import { onMount } from "svelte";
  import {
    modalStore,
    queryStore,
    locationStore,
    toastStore,
    navigationStore,
  } from "../../lib/store.svelte";
  import { getRoomRoute } from "../../constants/room-routes";
  import Modal from "./modal/Modal.svelte";
  import SidePanel from "./sidepanel/SidePanel.svelte";
  import Map from "./Map.svelte";
  import StatusBar from "./StatusBar.svelte";
  import Toast from "./Toast.svelte";
  import NavigationPanel from "./NavigationPanel.svelte";
  import IndoorGLEView from "./IndoorGLEView.svelte";
  import type { RecentSearch } from "../../lib/types";
  import { isRecentSearch } from "../../lib/locStorage";
  import { isCaptureMode } from "../../lib/dev";
  import DevPathCapture from "./DevPathCapture.svelte";

  const captureMode = isCaptureMode();

  const updateData = (queryHistory: RecentSearch[]) => {
    localStorage.setItem("recent-search", JSON.stringify(queryHistory));
  };
  onMount(() => {
    locationStore.initFromUrl();
    const indoorMode = new URLSearchParams(window.location.search).get(
      "indoorMode",
    );
    if (indoorMode?.toLowerCase() === "gle201") {
      const route = getRoomRoute("GLE 201");
      if (route) {
        queryStore.inputValue = "GLE 201";
        queryStore.updateQuery({
          category: "room",
          type: "result",
          value: "GLE 201",
        });
        navigationStore.startRoute(route, "demo");
        navigationStore.openIndoorView();
        if (route.steps[0]) {
          locationStore.startMockNavigation(route.steps[0].coords);
        }
      }
    }
    const hideLanding = localStorage.getItem("hideLandingModal");
    const recentSearchesLS = localStorage.getItem("recent-search");
    try {
      const parsedSearches: unknown[] = JSON.parse(recentSearchesLS ?? "[]");
      parsedSearches.forEach((parsedSearch) => {
        if (isRecentSearch(parsedSearch)) {
          queryStore.addRecentSearch(parsedSearch);
        }
      });
    } catch (e) {
      queryStore.recentSearches = [];
    }
    if (hideLanding !== "true" && !indoorMode) {
      modalStore.openModal("landing");
    }
  });
  $effect(() => {
    updateData(queryStore.recentSearches);
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      if (modalStore.open) {
        modalStore.closeModal();
      } else if (queryStore.inputValue !== "" || queryStore.type === "result") {
        queryStore.clearQuery();
        if (locationStore.destination) {
          locationStore.clearDestination();
        }
      }
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="app-layout">
  <Map />
  <div class="ui-layer">
    <!-- <header class="top-header">
      <h2>YourRoute</h2>
    </header> -->
    <div class="inner-layer">
      <SidePanel />
      <StatusBar />
    </div>
    {#if toastStore.message}
      <Toast
        message={toastStore.message}
        type={toastStore.type}
        onclose={() => toastStore.clear()}
      />
    {/if}
  </div>
  <Modal />
  {#if navigationStore.indoorViewOpen && navigationStore.activeRoute?.roomCode === "GLE 201"}
    <IndoorGLEView />
  {/if}
  <NavigationPanel />
  {#if captureMode}
    <DevPathCapture />
  {/if}
</div>

<style>
  .app-layout {
    width: 100%;
    height: 100dvh;
    overflow: hidden;
    position: relative;
  }
  .inner-layer {
    display: flex;
    flex-direction: column;
    padding: calc(0.5rem + env(safe-area-inset-top))
      calc(0.5rem + env(safe-area-inset-right))
      calc(0.5rem + env(safe-area-inset-bottom))
      calc(0.5rem + env(safe-area-inset-left));
    flex: 1 0 0;
    pointer-events: none;
    gap: 0.5rem;
    min-height: 0;
  }

  :global(.map) {
    width: 100%;
    height: 100%;
  }

  .ui-layer {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 10;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    height: 100dvh;
    width: 100%;
  }

  @media screen and (max-width: 48rem) {
    .inner-layer {
      padding: calc(0.625rem + env(safe-area-inset-top))
        calc(0.625rem + env(safe-area-inset-right))
        calc(0.625rem + env(safe-area-inset-bottom))
        calc(0.625rem + env(safe-area-inset-left));
      gap: 0.625rem;
    }
  }

  :global(*) {
    margin: unset;
    box-sizing: border-box;
  }
</style>
