<script lang="ts">
  import {
    CITU_BUILDING_LABELS,
    getCituBuildingDisplayName,
    getCituBuildingSearchValues,
    findCituBuildingLabel,
  } from "../../../constants/campus";
  import { GLE_ROOM_CODES } from "../../../constants/gle-rooms";
  import { ROOM_ROUTES } from "../../../constants/room-routes";
  import { getAppData } from "../../../lib/context";
  import { queryStore, type QueryStoreState } from "../../../lib/store.svelte";
  import SearchQuerySuggestion from "./SearchQuerySuggestion.svelte";
  import Suggestion from "./Suggestion.svelte";

  type SearchSuggestion = {
    value: string;
    category: Exclude<QueryStoreState["category"], null>;
  };

  const { rooms } = getAppData();

  const CITU_ROOM_CODES = Array.from(
    new Set([
      ...rooms.map((room) => room.code),
      ...GLE_ROOM_CODES,
      ...Object.values(ROOM_ROUTES).map((route) => route.roomCode),
    ].filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const suggestedResult = $derived<SearchSuggestion[]>(
    getSuggestions(queryStore.inputValue),
  );
  const validRecentSearches = $derived(
    queryStore.recentSearches.filter(isCituSuggestion),
  );

  function matchesSearch(values: string[], searchString: string) {
    const compactSearch = searchString.replace(/\s+/g, "");
    return values.some((value) => {
      const normalizedValue = value.toLowerCase();
      return (
        normalizedValue.includes(searchString) ||
        normalizedValue.replace(/\s+/g, "").includes(compactSearch)
      );
    });
  }

  function isCituSuggestion(suggestion: SearchSuggestion) {
    if (suggestion.category === "building") {
      return Boolean(findCituBuildingLabel(suggestion.value));
    }

    if (suggestion.category === "room") {
      return CITU_ROOM_CODES.includes(suggestion.value);
    }

    return false;
  }

  function getSuggestions(searchString: string): SearchSuggestion[] {
    searchString = searchString.trim().toLowerCase();
    if (searchString === "") return [];

    const buildingResult = CITU_BUILDING_LABELS.filter((label) =>
      matchesSearch(getCituBuildingSearchValues(label), searchString),
    ).map((label) => ({
      value: getCituBuildingDisplayName(label),
      category: "building" as const,
    }));

    const roomResult = CITU_ROOM_CODES.filter((roomCode) =>
      matchesSearch([roomCode], searchString),
    ).map((roomCode) => ({
      value: roomCode,
      category: "room" as const,
    }));

    return [...buildingResult, ...roomResult].slice(0, 5);
  }
</script>

<!-- class:visible={queryStore.inputValue === ""} -->
<div
  class="suggestions-container"
  class:force-visible={queryStore.inputValue === ""}
>
  {#if queryStore.inputValue === ""}
    {#if validRecentSearches.length !== 0}
      <h2 class="suggestions-header">Recent searches</h2>
      {#each validRecentSearches as { category, value }}
        <Suggestion {value} {category} />
      {/each}
    {:else}
      <h2 class="suggestions-header">Trending searches</h2>
      <Suggestion value={"GLE 201"} category={"room"} />
      <Suggestion value={"RTL 302"} category={"room"} />
      <Suggestion value={"ALLIED 102"} category={"room"} />
    {/if}
  {:else if suggestedResult.length !== 0}
    {#each suggestedResult as suggestion}
      <Suggestion {...suggestion} />
    {/each}
  {:else if suggestedResult.length === 0}
    <SearchQuerySuggestion />
  {/if}
</div>

<style>
  .suggestions-container {
    position: absolute;
    width: 100%;
    height: max-content;
    border-radius: 1rem;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    background-color: white;
    pointer-events: none;
    box-shadow: 0rem 2px 0.25rem 0rem rgba(0, 0, 0, 0.25);
    margin-top: 0.5rem;
    opacity: 0;
    z-index: 20;
    max-height: min(22rem, calc(100dvh - 7rem));
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    scrollbar-color: hsl(6, 63%, 48%) hsl(0, 0%, 98%);
  }
  .force-visible {
    opacity: 1;
    pointer-events: auto;
  }
  .suggestions-header {
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }
  @media (max-width: 425px) {
    .suggestions-container {
      padding: 0.75rem;
      max-height: min(45dvh, 22rem);
      border-radius: 1rem;
    }

    .suggestions-header {
      margin-bottom: 0.25rem;
    }
  }
</style>
