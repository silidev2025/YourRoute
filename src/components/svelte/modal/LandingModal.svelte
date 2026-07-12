<script lang="ts">
  import { modalStore } from "../../../lib/store.svelte";
  import { developers } from "../../../constants/developers";

  let dontShowAgain = $state(false);

  function handleGetStarted() {
    if (dontShowAgain) {
      localStorage.setItem("hideLandingModal", "true");
    }
    modalStore.closeModal();
  }
</script>

<div class="landing-content">
  <div class="hero-image">
    <div class="hero-overlay">
      <img
        class="app-logo"
        src="/cit-thumbnail.png"
        alt="CIT-U location logo"
        width="88"
        height="88"
      />
      <h2>YourRoute</h2>
      <p>"Asa sa CIT ang ___?" Finally answered.</p>
    </div>
  </div>

  <div class="content-body">
    <div class="description-container">
      <p class="description">
        YourRoute is an offline website built to help CITU students find their
        rooms across the Cebu Institute of Technology - University campus.
      </p>
    </div>
    <div class="people-sections">
      <div class="developers-section">
        <h3>Developer</h3>
        <div class="developers-list">
          {#each developers as { name, href, img_src, img_alt }}
            {#if href}
              <a
                class="developers-profile tooltip"
                {href}
                target="_blank"
                data-tooltip={name}
              >
                <img
                  src={img_src}
                  alt={img_alt ?? name}
                  title={name}
                  onerror={(event) =>
                    ((event.currentTarget as HTMLImageElement).src =
                      "/profile.svg")}
                />
                <div class="name">{name}</div>
              </a>
            {:else}
              <div class="developers-profile tooltip" data-tooltip={name}>
                <img
                  src={img_src}
                  alt={img_alt ?? name}
                  title={name}
                  onerror={(event) =>
                    ((event.currentTarget as HTMLImageElement).src =
                      "/profile.svg")}
                />
                <div class="name">{name}</div>
              </div>
            {/if}
          {/each}
        </div>
      </div>
    </div>
    <!-- Attribution is available from the 3D model picker's Model credits section.
    <p class="model-credit">
      3D navigation models by
      <a
        href="https://sketchfab.com/3d-models/oiiaioooooiai-cat-30d27bf7fb224849b76e208a6eccdb36"
        target="_blank"
        rel="noreferrer">Zhuier</a
      >,
      <a
        href="https://sketchfab.com/3d-models/low-poly-dog-335f2250195c407bac91695fbdd193e1"
        target="_blank"
        rel="noreferrer">Rodesqa</a
      >,
      <a
        href="https://sketchfab.com/3d-models/low-poly-bird-animated-82ada91f0ac64ab595fbc3dc994a3590"
        target="_blank"
        rel="noreferrer">Charlie Tinley</a
      >, and
      <a
        href="https://sketchfab.com/3d-models/low-poly-rigged-character-free-9dba83ce8a3e4a9ab13bd991e7276621"
        target="_blank"
        rel="noreferrer">Legend</a
      >. Licensed under
      <a
        href="https://creativecommons.org/licenses/by/4.0/"
        target="_blank"
        rel="noreferrer">CC BY 4.0</a
      >.
    </p>
    -->

    <div class="actions">
      <button class="primary-btn" onclick={handleGetStarted}>
        Get Started
      </button>
      <label class="checkbox-label">
        <input type="checkbox" bind:checked={dontShowAgain} />
        Don't show again
      </label>
    </div>
  </div>
</div>

<style>
  .landing-content {
    display: flex;
    flex-direction: column;
    overflow: auto;
    height: 100%;
    max-height: inherit;
    border-radius: inherit;
    background-color: white;
  }
  .hero-image {
    background-image: url("/CIT-hero.jpg");
    background-size: cover;
    background-position: center;
    position: relative;
    min-height: 16rem;
    display: flex;
  }
  .hero-overlay {
    background-color: rgba(123, 17, 19, 0.85);
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    gap: 0.5rem;
    color: white;
    padding: 2rem;
  }
  .app-logo {
    width: 5.5rem;
    height: 5.5rem;
    object-fit: contain;
    filter: drop-shadow(0 0.35rem 0.7rem rgba(0, 0, 0, 0.2));
  }
  .hero-overlay h2 {
    font-size: 2rem;
    font-weight: bold;
    margin: 0;
    color: white;
  }
  .hero-overlay p {
    font-size: 1rem;
    margin: 0;
    font-weight: 500;
    line-height: 1.35;
  }
  .content-body {
    padding: 1.5rem 2rem 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    text-align: center;
  }
  .description-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }
  .description {
    font-size: 0.9375rem;
    color: #4a4a4a;
    line-height: 1.5;
    margin: 0;
    max-width: 28rem;
  }
  .developers-section h3 {
    margin: 0 0 0.75rem 0;
    font-size: 1rem;
    color: #333;
    font-weight: 600;
  }
  .people-sections {
    width: 100%;
    max-width: 48rem;
    display: flex;
    justify-content: center;
    gap: 1.5rem;
    align-items: start;
  }
  .developers-section {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .developers-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
    max-width: 30rem;
  }
  .developers-profile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    text-decoration: none;
    color: inherit;
  }
  .developers-profile img {
    width: 2.25rem;
    height: 2.25rem;
    border: 1px solid #ccc;
    border-radius: 50%;
    object-fit: cover;
    background-color: #f5f5f5;
    overflow: hidden;
  }

  .developers-profile .name {
    font-size: 0.65rem;
    font-weight: 500;
    max-width: 3.5rem;
    text-align: center;
    line-height: 1.1;
    display: none;
    overflow-wrap: anywhere;
  }

  /* Attribution paragraph is intentionally hidden from this modal.
  .model-credit {
    margin: -0.5rem 0 0;
    color: #666;
    font-size: 0.7rem;
    line-height: 1.35;
  }

  .model-credit a {
    color: #7b1113;
    font-weight: 600;
  }
  */

  .tooltip {
    position: relative;
    outline: unset;
  }
  .tooltip::before {
    content: attr(data-tooltip);
    position: absolute;
    top: 0;
    left: 50%;
    translate: -50% calc(-1 * (100% + 8px));
    padding: 0.2rem 0.4rem;
    background-color: hsla(0, 0%, 10%, 0.8);
    color: white;
    border-radius: 6px;
    pointer-events: none;
    opacity: 0;
    width: max-content;
    transition: opacity 0.125s;
    font-size: 0.75rem;
    z-index: 50;
  }
  .tooltip::after {
    content: "";
    position: absolute;
    top: 0;
    left: 50%;
    pointer-events: none;
    translate: -50% -100%;
    border-width: 4px;
    border-style: solid;
    opacity: 0;
    transition: opacity 0.125s;
    border-color: hsla(0, 0%, 10%, 0.8) transparent transparent transparent;
    z-index: 50;
  }
  .tooltip:is(:hover, :focus)::before,
  .tooltip:is(:hover, :focus)::after {
    opacity: 1;
  }

  @media screen and (max-width: 768px) {
    .hero-image {
      min-height: 12rem;
    }
    .hero-overlay {
      padding: 1.5rem 1rem;
    }
    /* .hero-overlay h2 {
      font-size: 1.5rem;
    } */
    .content-body {
      padding: 1rem;
      gap: 1rem;
    }
  }

  @media screen and (max-width: 30rem) {
    .hero-image {
      min-height: 9rem;
    }

    .hero-overlay {
      padding: 1.25rem 1rem;
    }

    .app-logo {
      width: 4rem;
      height: 4rem;
    }

    .hero-overlay h2 {
      font-size: 1.625rem;
    }

    .hero-overlay p {
      font-size: 0.875rem;
    }

    .content-body {
      align-items: stretch;
      padding: 0.875rem;
      gap: 0.875rem;
    }

    .description {
      font-size: 0.875rem;
    }

    .developers-profile .name {
      display: block;
    }

    .tooltip::before,
    .tooltip::after {
      display: none;
    }
  }

  .actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    margin-top: 0.25rem;
  }
  .primary-btn {
    background-color: #7b1113;
    color: white;
    border: none;
    border-radius: 0.5rem;
    padding: 0.75rem 2rem;
    min-height: 2.75rem;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    transition:
      background-color 0.2s,
      transform 0.1s;
    box-shadow: 0 2px 4px rgba(123, 17, 19, 0.2);
    text-align: center;
  }
  .primary-btn:hover {
    background-color: #5a0c0e;
    transform: translateY(-1px);
    box-shadow: 0 4px 6px rgba(123, 17, 19, 0.3);
  }
  .primary-btn:active {
    transform: translateY(1px);
    box-shadow: 0 1px 2px rgba(123, 17, 19, 0.2);
  }
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #4a4a4a;
    cursor: pointer;
    user-select: none;
    justify-content: center;
  }
  .checkbox-label input[type="checkbox"] {
    cursor: pointer;
    width: 1rem;
    height: 1rem;
    accent-color: #7b1113;
  }
</style>
