<script lang="ts">
  import { queryStore } from "../../../lib/store.svelte";
</script>

<div class="empty-search">
  No CITU match found for <strong>{queryStore.inputValue}</strong>
</div>

<style>
  .empty-search {
    padding: 0.5rem 0.75rem;
    color: hsl(0, 0%, 36%);
    font-size: 0.875rem;
    line-height: 1.35;
  }
</style>
