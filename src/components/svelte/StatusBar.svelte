<script lang="ts">
  import { ChevronDown, ChevronRight, MessageCircle } from "@lucide/svelte";
  import { APP_VERSION_LABEL } from "../../constants/version";
  import { getAppData } from "../../lib/context";
  import { modalStore } from "../../lib/store.svelte";

  const { directionCount, totalRooms } = getAppData();
  let isOpen = $state(false);
</script>

<div class="status-bar" class:is-open={isOpen}>
  <button class="status-toggle" onclick={() => (isOpen = !isOpen)}>
    {#if isOpen}
      <ChevronDown size={20} />
    {:else}
      <ChevronRight size={20} />
    {/if}
    <span>Status</span>
  </button>

  <div class="content-wrapper">
    <div class="directions-progress">
      Rooms with directions
      <div class="progress-bar">
        <div
          class="progress-bar__value"
          style:width={`${Math.floor((directionCount / totalRooms) * 100)}%`}
        ></div>
      </div>
      <div>
        {directionCount} / {totalRooms}
      </div>
    </div>
    <div class="metadata">
      <div class="data-updated">
        Course and room information is updated regularly. Last updated:
        <strong>May 2026.</strong>
      </div>
      <div>
        <a
          href="https://facebook.com/ddgtes1"
          target="_blank"
          rel="noopener noreferrer"
          class="messenger-link"
        >
          <MessageCircle size={18} />
          <div>Contact</div>
        </a>
      </div>
      <div>
        <button
          class="developer-btn"
          onclick={() => modalStore.openModal("landing")}
        >
          Developer
        </button>
      </div>
      <div class="app-version">
        <a href="/changelog" class="changelog-link">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide lucide-git-fork-icon lucide-git-fork"
            ><circle cx="12" cy="18" r="3"></circle><circle cx="6" cy="6" r="3"
            ></circle><circle cx="18" cy="6" r="3"></circle><path
              d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9"
            ></path><path d="M12 12v3"></path></svg
          >
          <div>{APP_VERSION_LABEL}</div>
        </a>
      </div>
    </div>
  </div>
</div>

<style>
  * {
    pointer-events: auto;
  }
  div.status-bar {
    display: flex;
    font-size: 0.875rem;
    font-weight: 600;
    gap: 1rem;
    background-color: white;
    padding: 0.5rem 1.5rem;
    border-radius: 1rem;
    box-shadow: 0 2px 0.5rem 0 hsla(0, 0%, 0%, 0.2);
    transition: all 0.2s ease;
    max-width: 100%;
    align-self: flex-start;

    .status-toggle {
      display: none;
      align-items: center;
      gap: 0.5rem;
      background: none;
      border: none;
      font: inherit;
      padding: 0;
      cursor: pointer;
      min-height: 2.25rem;
    }

    .content-wrapper {
      display: flex;
      gap: 1rem;
      flex: 1;
    }

    .metadata {
      margin-left: auto;
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      & > *:not(:last-child) {
        border-right: 2px solid #aaa;
        padding-right: 0.75rem;
      }
      & > *:not(:first-child) {
        padding-left: 0.75rem;
      }
    }

    .messenger-link {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      text-decoration: none;
      color: inherit;
      padding: 0.125rem 0.375rem;
      &:hover {
        border-radius: 0.5rem;
        background-color: hsla(0, 0%, 0%, 0.1);
      }
    }
    .developer-btn {
      background: none;
      border: none;
      padding: 0;
      font: inherit;
      cursor: pointer;
      color: inherit;
      padding: 0.125rem 0.375rem;
      &:hover {
        border-radius: 0.5rem;
        background-color: hsla(0, 0%, 0%, 0.1);
      }
    }
    .app-version {
      .changelog-link {
        display: flex;
        gap: 0.25rem;
        color: unset;
        text-decoration: unset;
        padding: 0.125rem 0.375rem;
        &:hover {
          border-radius: 0.5rem;
          background-color: hsla(0, 0%, 0%, 0.1);
        }
      }
    }
    .data-updated {
      margin-left: auto;
    }
    .directions-progress {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex: 0 0 24rem;
      .progress-bar {
        height: 0.75rem;
        flex: 1 0 0;
        border-radius: 0.5rem;
        background-color: #ddd;
        position: relative;
        .progress-bar__value {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          background-color: #7b1113;
          border-radius: 0.5rem;
        }
      }
    }
  }

  @media (max-width: 800px) {
    div.status-bar {
      padding: 0.5rem 1rem;
      gap: 0.5rem;
      flex-direction: column;
      width: min(22rem, 100%);
      border-radius: 999px;

      .status-toggle {
        display: flex;
      }

      &.is-open {
        border-radius: 0.875rem;
      }

      .content-wrapper {
        display: none;
        flex-direction: column;
        gap: 0.625rem;
        padding-top: 0.5rem;
        border-top: 1px solid #eee;
        width: 100%;
      }

      &.is-open .content-wrapper {
        display: flex;
      }

      .directions-progress {
        width: 100%;
        align-items: stretch;
        flex-direction: column;
        justify-content: flex-start;
        gap: 0.375rem;
        flex-basis: auto;
      }

      .metadata {
        width: 100%;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: 0.375rem 0.5rem;

        & > *:not(:last-child),
        & > *:not(:first-child) {
          border-right: none;
          padding: 0;
        }

        .data-updated {
          margin-left: 0;
        }

        .app-version {
          justify-content: flex-start;
        }
      }

      .messenger-link,
      .developer-btn,
      .app-version .changelog-link {
        min-height: 2rem;
        align-items: center;
      }
    }
  }
  @media (max-width: 1200px) {
    .data-updated {
      display: none;
    }
  }
</style>
