<script lang="ts">
  import {
    modalStore,
    queryStore,
    locationStore,
    navigationStore,
  } from "../../../lib/store.svelte";
  import { getAppData } from "../../../lib/context";
  import Classes from "./Classes.svelte";
  import { CornerRightUp } from "@lucide/svelte";
  import { getRoomRoute } from "../../../constants/room-routes";

  const { rooms, classesMap } = getAppData();

  const roomData = $derived(
    rooms.find((r) => r.code === queryStore.queryValue),
  );
  const roomRoute = $derived(getRoomRoute(queryStore.queryValue));
  const displayRoom = $derived.by(() => {
    if (roomData) return roomData;
    if (!roomRoute) return null;

    const destination = roomRoute.steps[roomRoute.steps.length - 1]?.coords;
    return {
      id: -1,
      code: roomRoute.roomCode,
      directions: roomRoute.roomDirections,
      building: destination
        ? {
            name: roomRoute.buildingName,
            lat: destination[1],
            lon: destination[0],
            directions: roomRoute.buildingDirections,
          }
        : null,
      collegeName: null,
      divisionName: null,
    };
  });

  const classesData = $derived(
    roomData ? classesMap.get(roomData.code) || [] : [],
  );

  function startDirections() {
    if (!displayRoom) return;

    if (roomRoute) {
      const firstStep = roomRoute.steps[0];
      navigationStore.startRoute(roomRoute, "live");
      navigationStore.openIndoorView();
      locationStore.clearDestination();
      if (firstStep) {
        locationStore.stopMockNavigation();
        locationStore.requestLocation({
          fallbackCoords: firstStep.coords,
          fallbackMessage:
            "Live GPS is unavailable here. Using demo navigation.",
        });
      }
      return;
    }

    if (displayRoom.building?.lon && displayRoom.building?.lat) {
      locationStore.requestLocation();
      locationStore.setDestination([
        displayRoom.building.lon,
        displayRoom.building.lat,
      ]);
    }
  }
</script>

<div class="room-details-container">
  {#if displayRoom}
    <div class="header-section">
      <div class="header-top-row">
        <h2>{displayRoom.code}</h2>
      </div>
      <div class="subtitle-badge">
        <p>
          {#if displayRoom.collegeName}
            {displayRoom.collegeName}
          {/if}
          {#if displayRoom.building?.name}
            {#if displayRoom.collegeName}
              •
            {/if}
            {displayRoom.building.name}
          {/if}
        </p>
      </div>
    </div>

    {#if displayRoom.directions}
      <p class="room-directions">
        {displayRoom.directions}
      </p>
    {:else}
      <p class="room-directions no-directions">
        No directions? <a
          href="https://docs.google.com/forms/d/e/1FAIpQLSdius5C7OyC1klraq71fFwWPZNvNk_iDLFyhCNir_ccC07Q7Q/viewform?usp=dialog"
          target="_blank"
          rel="noreferrer"><strong>Contribute to CitMap</strong></a
        >
      </p>
    {/if}

    {#if displayRoom.building}
      <div class="building-note">
        <h3 class="building-note-title">
          How to get to {displayRoom.building.name}
        </h3>
        {#if displayRoom.building.directions}
          <p class="building-directions">
            {displayRoom.building.directions}
          </p>
        {:else}
          <p class="building-directions no-directions">
            No directions? <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSdius5C7OyC1klraq71fFwWPZNvNk_iDLFyhCNir_ccC07Q7Q/viewform?usp=dialog"
              target="_blank"
              rel="noreferrer"><strong>Contribute to CitMap</strong></a
            >
          </p>
        {/if}
      </div>
    {/if}

    {#if displayRoom.building?.lat && displayRoom.building?.lon}
      <div class="map-links">
        <button class="get-directions-btn" onclick={startDirections}>
          Get Directions
          <CornerRightUp size={18} />
        </button>
        <a
          href="https://www.google.com/maps?q={displayRoom.building
            .lat},{displayRoom.building.lon}"
          target="_blank"
          rel="noreferrer"
        >
          Open in Google Maps
        </a>
      </div>
    {/if}
    <hr />

    <div class="schedule-section">
      <div class="schedule-section__header">
        <h3>Classes in this room</h3>
        <button
          onclick={() => modalStore.openModal("schedule-expand")}
          class="schedule-section__opener"
          disabled={classesData.length === 0}
          >Open schedule <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            ><line x1="7" y1="17" x2="17" y2="7"></line><polyline
              points="7 7 17 7 17 17"
            ></polyline></svg
          ></button
        >
      </div>
      {#if classesData.length > 0}
        <Classes classes={classesData} />
      {:else}
        <p class="empty-classes">No classes added yet.</p>
      {/if}
    </div>
  {:else}
    <p>Room not found.</p>
  {/if}
</div>

<style>
  hr {
    margin-block: 0;
  }
  .room-details-container {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    overflow-y: auto;
    width: 100%;
    flex: 1 1 0;
  }

  .header-section {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    align-items: flex-start;
    width: 100%;
  }

  .header-top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .header-section h2 {
    font-weight: bold;
    font-size: 1.125rem;
    line-height: 1.25rem;
    color: black;
    margin: 0;
  }

  .subtitle-badge {
    background-color: #ececec;
    border-radius: 0.4375rem;
    padding: 2px 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .subtitle-badge p {
    font-weight: normal;
    font-size: 0.75rem;
    color: #4f4f4f;
    margin: 0;
  }

  .room-directions {
    font-size: 0.875rem;
    line-height: 1.5;
    color: #4f4f4f;
    margin: 0;
  }

  .building-note {
    padding: 0.75rem 1rem;
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
    border-left: 4px solid hsl(5, 53%, 32%);
    background-color: hsla(5, 53%, 89%, 0.5);
  }

  .building-note-title {
    font-weight: 600;
    font-size: 1rem;
    margin: 0 0 0.25rem 0;
    color: black;
  }

  .building-directions {
    font-size: 0.875rem;
    line-height: 1.5;
    color: #4f4f4f;
    margin: 0;
  }

  .no-directions {
    color: hsl(0, 0%, 60%);
  }

  .no-directions a {
    color: hsl(5, 53%, 32%);
    outline: none;
    transition: all 0.2s;
    padding: 0.125rem 0.25rem;
    border-radius: 4px;
  }

  .no-directions a:hover,
  .no-directions a:focus-visible {
    background-color: hsl(5, 53%, 32%);
    color: white;
    text-decoration: none;
  }

  .schedule-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    .schedule-section__header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      button.schedule-section__opener {
        all: unset;
        font-size: 0.875rem;
        font-weight: 600;
        padding: 0.25rem 1rem;
        background-color: hsl(5, 53%, 32%);
        color: white;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        gap: 0.25rem;
        align-items: center;
      }
      button.schedule-section__opener:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }
    }
  }

  .schedule-section h3 {
    font-weight: 600;
    font-size: 1rem;
    line-height: 1.25rem;
    color: black;
    margin: 0;
  }

  .map-links {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .map-links a {
    color: hsl(5, 53%, 32%);
    outline: none;
    transition: all 0.2s;
    font-size: 0.875rem;
    padding: 0.25rem 0.5rem;
    border: 1px solid hsl(5, 53%, 32%);
    border-radius: 4px;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
  }
  .map-links a:hover,
  .map-links a:focus-visible {
    background-color: hsl(5, 53%, 32%);
    color: white;
  }

  .get-directions-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.75rem;
    background-color: hsl(5, 53%, 32%);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .get-directions-btn:hover {
    background-color: hsl(5, 53%, 40%);
  }

  .empty-classes {
    margin: 0.25rem 0;
    color: #666666;
    font-size: 0.875rem;
  }
</style>
