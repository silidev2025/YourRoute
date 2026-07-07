<script lang="ts">
  import { Copy, Trash2 } from "@lucide/svelte";
  import type { MapMouseEvent } from "maplibre-gl";
  import { mapStore } from "../../lib/store.svelte";

  type Coordinate = [number, number];

  let points: Coordinate[] = $state([]);
  let copied = $state(false);
  let output = $derived(JSON.stringify(points, null, 2));

  function roundCoord(value: number) {
    return Number(value.toFixed(6));
  }

  function handleMapClick(event: MapMouseEvent) {
    points = [
      ...points,
      [roundCoord(event.lngLat.lng), roundCoord(event.lngLat.lat)],
    ];
    copied = false;
  }

  function clearPoints() {
    points = [];
    copied = false;
  }

  async function copyPoints() {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    await navigator.clipboard.writeText(output);
    copied = true;
    window.setTimeout(() => {
      copied = false;
    }, 1500);
  }

  $effect(() => {
    const map = mapStore.mapInstance;
    if (!map) return;

    map.on("click", handleMapClick);
    return () => {
      map.off("click", handleMapClick);
    };
  });
</script>

<div
  class="path-capture"
  role="dialog"
  aria-label="Path capture"
  onclick={(event) => event.stopPropagation()}
>
  <div class="path-capture-toolbar">
    <strong>Path capture</strong>
    <span>{points.length}</span>
    <button
      type="button"
      title="Copy path"
      aria-label="Copy path"
      disabled={points.length === 0}
      onclick={copyPoints}
    >
      <Copy size="16" />
    </button>
    <button
      type="button"
      title="Clear path"
      aria-label="Clear path"
      disabled={points.length === 0}
      onclick={clearPoints}
    >
      <Trash2 size="16" />
    </button>
  </div>
  <textarea readonly value={output} aria-label="Captured path coordinates"
  ></textarea>
  {#if copied}
    <p>Copied</p>
  {/if}
</div>

<style>
  .path-capture {
    position: fixed;
    right: 0.75rem;
    bottom: 0.75rem;
    z-index: 50;
    width: min(26rem, calc(100vw - 1.5rem));
    padding: 0.75rem;
    color: #151515;
    background: white;
    border: 1px solid #d7d7d7;
    border-radius: 0.5rem;
    box-shadow: 0 1rem 2.5rem rgba(0, 0, 0, 0.16);
    pointer-events: auto;
  }

  .path-capture-toolbar {
    display: grid;
    grid-template-columns: 1fr auto auto auto;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .path-capture-toolbar strong {
    font-size: 0.9rem;
    font-weight: 800;
  }

  .path-capture-toolbar span {
    min-width: 1.5rem;
    padding: 0.125rem 0.375rem;
    color: white;
    background: hsl(5, 53%, 32%);
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 800;
    text-align: center;
  }

  button {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    color: hsl(5, 53%, 32%);
    background: white;
    border: 1px solid #dddddd;
    border-radius: 50%;
    cursor: pointer;
  }

  button:disabled {
    color: #8a8a8a;
    cursor: not-allowed;
    opacity: 0.6;
  }

  textarea {
    width: 100%;
    height: 8rem;
    resize: vertical;
    padding: 0.5rem;
    color: #202020;
    background: #f7f7f7;
    border: 1px solid #dddddd;
    border-radius: 0.375rem;
    font:
      0.78rem/1.4 Consolas,
      "Courier New",
      monospace;
  }

  p {
    margin-top: 0.35rem;
    color: hsl(5, 53%, 32%);
    font-size: 0.8rem;
    font-weight: 700;
  }
</style>
