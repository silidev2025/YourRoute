<script lang="ts">
  import { Box, ChevronLeft, ChevronRight, Route, X } from "@lucide/svelte";
  import { locationStore, navigationStore } from "../../lib/store.svelte";

  const route = $derived(navigationStore.activeRoute);
  const currentStep = $derived(navigationStore.currentStep);
  const stepNumber = $derived(navigationStore.activeStepIndex + 1);
  const totalSteps = $derived(navigationStore.totalSteps);
  const isFirstStep = $derived(navigationStore.activeStepIndex === 0);
  const isLastStep = $derived(
    navigationStore.activeStepIndex === totalSteps - 1,
  );
  const trackingLabel = $derived(
    navigationStore.mode === "live" && !locationStore.mockMode
      ? "Live GPS"
      : "Demo",
  );
  const distanceLabel = $derived.by(() => {
    if (
      navigationStore.mode !== "live" ||
      navigationStore.distanceToNextMeters === null
    ) {
      return null;
    }

    if (navigationStore.distanceToNextMeters < 100) {
      return `${Math.round(navigationStore.distanceToNextMeters)} m to next`;
    }

    return `${(navigationStore.distanceToNextMeters / 1000).toFixed(1)} km to next`;
  });

  function movePrevious() {
    const coords = navigationStore.previousStep();
    if (coords) locationStore.startMockNavigation(coords);
  }

  function moveNext() {
    const coords = navigationStore.nextStep();
    if (coords) locationStore.startMockNavigation(coords);
  }

  function stopNavigation() {
    navigationStore.stopRoute();
    locationStore.stopLocation();
  }

  function toggleIndoorView() {
    navigationStore.toggleIndoorView();
  }
</script>

{#if route && currentStep}
  <section class="navigation-panel" aria-label="Navigation">
    <div class="navigation-panel__icon">
      <Route size="20" />
    </div>
    <div class="navigation-panel__content">
      <div class="navigation-panel__meta">
        <strong>{currentStep.label}</strong>
        <span>{stepNumber} / {totalSteps}</span>
        <span class:live={trackingLabel === "Live GPS"}>{trackingLabel}</span>
      </div>
      <p>{currentStep.instruction}</p>
      <small
        >{route.roomCode}{#if distanceLabel}
          - {distanceLabel}{/if}</small
      >
    </div>
    <div class="navigation-panel__actions">
      <button
        type="button"
        title="Previous step"
        aria-label="Previous step"
        disabled={isFirstStep}
        onclick={movePrevious}
      >
        <ChevronLeft size="18" />
      </button>
      <button
        type="button"
        title="Next step"
        aria-label="Next step"
        disabled={isLastStep}
        onclick={moveNext}
      >
        <ChevronRight size="18" />
      </button>
      <button
        class:active={navigationStore.indoorViewOpen}
        type="button"
        title="Toggle 3D indoor view"
        aria-label="Toggle 3D indoor view"
        onclick={toggleIndoorView}
      >
        <Box size="18" />
      </button>
      <button
        type="button"
        title="End navigation"
        aria-label="End navigation"
        onclick={stopNavigation}
      >
        <X size="18" />
      </button>
    </div>
  </section>
{/if}

<style>
  .navigation-panel {
    position: fixed;
    left: 50%;
    bottom: max(1rem, env(safe-area-inset-bottom));
    z-index: 40;
    translate: -50% 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.625rem;
    width: min(42rem, calc(100vw - 1.5rem));
    padding: 0.625rem;
    color: #151515;
    background: white;
    border: 1px solid #d7d7d7;
    border-radius: 0.5rem;
    box-shadow: 0 0.75rem 2rem rgba(0, 0, 0, 0.18);
    pointer-events: auto;
  }

  .navigation-panel__icon {
    display: grid;
    place-items: center;
    width: 2.25rem;
    height: 2.25rem;
    color: white;
    background: hsl(5, 53%, 32%);
    border-radius: 50%;
  }

  .navigation-panel__content {
    min-width: 0;
    overflow: hidden;
  }

  .navigation-panel__meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    row-gap: 0.1rem;
  }

  .navigation-panel__meta strong {
    font-size: 0.95rem;
    line-height: 1.15;
  }

  .navigation-panel__meta span,
  small {
    color: #666666;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .navigation-panel__meta span.live {
    color: hsl(142, 71%, 28%);
  }

  p {
    margin: 0.15rem 0 0;
    color: #444444;
    font-size: 0.85rem;
    line-height: 1.3;
    overflow-wrap: anywhere;
  }

  .navigation-panel__actions {
    display: flex;
    flex: 0 0 auto;
    gap: 0.35rem;
  }

  button {
    display: grid;
    place-items: center;
    width: 2.25rem;
    height: 2.25rem;
    color: hsl(5, 53%, 32%);
    background: white;
    border: 1px solid #dddddd;
    border-radius: 50%;
    cursor: pointer;
  }

  button:disabled {
    color: #8a8a8a;
    cursor: not-allowed;
    opacity: 0.55;
  }

  button.active {
    color: white;
    background: hsl(5, 53%, 32%);
    border-color: hsl(5, 53%, 32%);
  }

  @media screen and (max-width: 56rem) {
    .navigation-panel {
      left: 0.75rem;
      right: 0.75rem;
      bottom: max(0.75rem, env(safe-area-inset-bottom));
      translate: 0;
      width: auto;
      grid-template-columns: auto minmax(0, 1fr);
    }

    .navigation-panel__actions {
      grid-column: 1 / -1;
      justify-content: flex-end;
    }
  }

  @media screen and (max-width: 30rem) {
    .navigation-panel {
      grid-template-columns: minmax(0, 1fr);
      padding: 0.5rem;
    }

    .navigation-panel__icon {
      display: none;
    }

    .navigation-panel__actions {
      grid-column: 1;
      justify-content: space-between;
    }

    button {
      width: 2rem;
      height: 2rem;
    }
  }
</style>
