<script lang="ts">
  import Search from "../search/Search.svelte";
  import { queryStore } from "../../../lib/store.svelte";
  import BuildingResult from "./BuildingResult.svelte";
  import CollegeResult from "./CollegeResult.svelte";
  import DivisionResult from "./DivisionResult.svelte";
  import RoomResult from "../room/RoomResult.svelte";
  import ClassQuery from "./ClassQuery.svelte";
  import LocationButton from "../LocationButton.svelte";
</script>

<div class="side-panel-wrapper">
  <Search />
  <div class="side-panel-controls">
    <LocationButton />
    {#if queryStore.category !== null}
      <div class="side-panel-content">
        {#if queryStore.category === "building"}
          <BuildingResult />
        {:else if queryStore.category === "college"}
          <CollegeResult />
        {:else if queryStore.category === "division"}
          <DivisionResult />
        {:else if queryStore.category === "room"}
          <RoomResult />
        {:else if queryStore.category === "class"}
          <ClassQuery />
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .side-panel-wrapper {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 0.75rem;
    flex: 1;
    pointer-events: none;
  }
  .side-panel-content {
    background-color: white;
    border-radius: 0.8125rem; /* 24px */
    padding: 1.125rem; /* 18px top/bottom, 24px left/right */
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
    flex: 0 0 min(25.75rem, calc(50% - 4rem));
    box-shadow: 0px 2px 4px 0px rgba(0, 0, 0, 0.25);
    & > :global(*) {
      scrollbar-width: thin;
      scrollbar-color: hsl(6, 63%, 48%) hsl(0, 0%, 98%);
    }
  }
  .side-panel-controls {
    display: flex;
    /* flex-direction: column; */
    flex: 1;
    align-items: flex-end;
    flex-direction: row-reverse;
    justify-content: space-between;
    gap: 1rem;
  }

  /* Mobile responsiveness for side panel */
  @media screen and (max-width: 48rem) {
    .side-panel-wrapper {
      position: relative;
      margin: 0;
      width: 100%;
      max-width: 100%;
      flex: 1;
      min-height: 0;
      pointer-events: none; /* Let clicks pass through empty space */
      display: flex;
      flex-direction: column;
      justify-content: space-between; /* Space between search top and panel bottom */
    }
    .side-panel-controls {
      flex-direction: column;
      justify-content: flex-end;
      align-items: flex-end;
      min-height: 0;
      gap: 0.75rem;
    }

    .side-panel-content {
      width: 100%;
      max-height: min(58dvh, 31rem);
      min-height: min(17rem, 46dvh);
      flex: 0 1 auto;
      padding: 1rem;
      border-radius: 1.25rem 1.25rem 0.875rem 0.875rem;
      box-shadow: 0 -0.5rem 1.25rem rgba(0, 0, 0, 0.16);
    }
  }

  @media screen and (max-width: 30rem) {
    .side-panel-controls {
      gap: 0.5rem;
    }

    .side-panel-content {
      max-height: min(62dvh, 29rem);
      min-height: min(16rem, 44dvh);
      padding: 0.875rem;
    }
  }
</style>
