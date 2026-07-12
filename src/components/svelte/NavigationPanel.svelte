<script lang="ts">
  import {
    Box,
    BicepsFlexed,
    Bird,
    Cat,
    Check,
    ChevronLeft,
    ChevronRight,
    Dog,
    Palette,
    Route,
    UserRound,
    X,
  } from "@lucide/svelte";
  import {
    locationStore,
    navigationStore,
    type NavigationAvatarModel,
  } from "../../lib/store.svelte";

  let modelPickerOpen = $state(false);

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

  function selectAvatar(model: NavigationAvatarModel) {
    navigationStore.setAvatarModel(model);
    modelPickerOpen = false;
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
        class:active={modelPickerOpen}
        type="button"
        title="Choose 3D navigation model"
        aria-label="Choose 3D navigation model"
        aria-expanded={modelPickerOpen}
        aria-controls="navigation-model-picker"
        onclick={() => (modelPickerOpen = !modelPickerOpen)}
      >
        <Palette size="18" />
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
    {#if modelPickerOpen}
      <div
        id="navigation-model-picker"
        class="model-picker"
        role="group"
        aria-label="Choose 3D navigation model"
      >
        <strong>Choose 3D guide</strong>
        <div class="model-picker__options">
          <button
            type="button"
            class="model-option"
            class:selected={navigationStore.avatarModel === "cat"}
            onclick={() => selectAvatar("cat")}
          >
            <span class="model-option__icon"><Cat size="20" /></span>
            <span>
              <b>Cat</b>
              <small>Animated campus guide • Offline</small>
            </span>
            {#if navigationStore.avatarModel === "cat"}
              <Check size="18" />
            {/if}
          </button>
          <button
            type="button"
            class="model-option"
            class:selected={navigationStore.avatarModel === "dog"}
            onclick={() => selectAvatar("dog")}
          >
            <span class="model-option__icon"><Dog size="20" /></span>
            <span>
              <b>Dog</b>
              <small>Lightweight companion • Offline</small>
            </span>
            {#if navigationStore.avatarModel === "dog"}
              <Check size="18" />
            {/if}
          </button>
          <button
            type="button"
            class="model-option"
            class:selected={navigationStore.avatarModel === "bird"}
            onclick={() => selectAvatar("bird")}
          >
            <span class="model-option__icon"><Bird size="20" /></span>
            <span>
              <b>Bird</b>
              <small>Animated flying guide • Offline</small>
            </span>
            {#if navigationStore.avatarModel === "bird"}
              <Check size="18" />
            {/if}
          </button>
          <button
            type="button"
            class="model-option"
            class:selected={navigationStore.avatarModel === "student"}
            onclick={() => selectAvatar("student")}
          >
            <span class="model-option__icon"><UserRound size="20" /></span>
            <span>
              <b>Student</b>
              <small>Rigged character • Offline</small>
            </span>
            {#if navigationStore.avatarModel === "student"}
              <Check size="18" />
            {/if}
          </button>
          <button
            type="button"
            class="model-option"
            class:selected={navigationStore.avatarModel === "hulk"}
            onclick={() => selectAvatar("hulk")}
          >
            <span class="model-option__icon"><BicepsFlexed size="20" /></span>
            <span>
              <b>Hulk</b>
              <small>Animated strong guide • Offline</small>
            </span>
            {#if navigationStore.avatarModel === "hulk"}
              <Check size="18" />
            {/if}
          </button>
        </div>
        <details class="model-credits">
          <summary>Model credits</summary>
          <div>
            <a
              href="https://sketchfab.com/3d-models/oiiaioooooiai-cat-30d27bf7fb224849b76e208a6eccdb36"
              target="_blank"
              rel="noreferrer">Cat by Zhuier</a
            >
            <a
              href="https://sketchfab.com/3d-models/low-poly-dog-335f2250195c407bac91695fbdd193e1"
              target="_blank"
              rel="noreferrer">Dog by Rodesqa</a
            >
            <a
              href="https://sketchfab.com/3d-models/low-poly-bird-animated-82ada91f0ac64ab595fbc3dc994a3590"
              target="_blank"
              rel="noreferrer">Bird by Charlie Tinley</a
            >
            <a
              href="https://sketchfab.com/3d-models/low-poly-rigged-character-free-9dba83ce8a3e4a9ab13bd991e7276621"
              target="_blank"
              rel="noreferrer">Student by Legend</a
            >
            <a
              href="https://sketchfab.com/3d-models/hulk-96274605878d4a4e9c2b964fd5bd9ee1"
              target="_blank"
              rel="noreferrer">Hulk by shreyhaldkar0</a
            >
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noreferrer">CC BY 4.0</a
            >
          </div>
        </details>
      </div>
    {/if}
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

  .model-picker {
    position: absolute;
    right: 0.625rem;
    bottom: calc(100% + 0.5rem);
    z-index: 2;
    display: grid;
    gap: 0.55rem;
    width: min(18rem, calc(100vw - 2rem));
    max-height: min(32rem, calc(100dvh - 7rem));
    padding: 0.7rem;
    background: rgba(255, 255, 255, 0.97);
    border: 1px solid #d7d7d7;
    border-radius: 0.75rem;
    box-shadow: 0 0.8rem 2rem rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(12px);
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .model-picker > strong {
    font-size: 0.85rem;
  }

  .model-picker__options {
    display: grid;
    gap: 0.4rem;
  }

  button.model-option {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) 1.25rem;
    align-items: center;
    justify-items: start;
    gap: 0.55rem;
    width: 100%;
    height: auto;
    min-height: 3.25rem;
    padding: 0.45rem 0.55rem;
    color: #292929;
    text-align: left;
    background: #ffffff;
    border: 1px solid #dddddd;
    border-radius: 0.6rem;
    box-sizing: border-box;
  }

  button.model-option:hover,
  button.model-option:focus-visible {
    border-color: hsl(5, 53%, 32%);
  }

  button.model-option.selected {
    color: hsl(5, 53%, 32%);
    background: hsl(5, 45%, 97%);
    border-color: hsl(5, 53%, 32%);
  }

  .model-option__icon {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    color: white;
    background: hsl(5, 53%, 32%);
    border-radius: 50%;
  }

  .model-option > span:nth-child(2) {
    display: grid;
    gap: 0.1rem;
    width: 100%;
    min-width: 0;
  }

  .model-option > :global(svg) {
    justify-self: end;
  }

  .model-option b {
    font-size: 0.82rem;
  }

  .model-option small {
    color: #666666;
    font-size: 0.7rem;
    font-weight: 600;
  }

  .model-credits {
    padding-top: 0.15rem;
    color: #666666;
    font-size: 0.7rem;
  }

  .model-credits summary {
    width: max-content;
    color: hsl(5, 53%, 32%);
    font-weight: 750;
    cursor: pointer;
  }

  .model-credits div {
    display: grid;
    gap: 0.25rem;
    padding: 0.45rem 0.2rem 0.1rem;
  }

  .model-credits a {
    color: #555555;
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
      width: 2.5rem;
      height: 2.5rem;
    }

    .model-picker {
      right: 0;
      left: 0;
      width: auto;
    }
  }
</style>
