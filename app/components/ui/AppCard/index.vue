<script lang="ts" src="./script.ts"></script>

<template>
  <section
      class="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-slate-950/20"
      :class="compact ? 'space-y-3' : 'space-y-4'"
  >
    <slot />
  </section>
</template>
