<script lang="ts" src="./script.ts"></script>

<template>
  <div class="rounded-2xl border border-dashed border-slate-700 bg-slate-950/70 p-5 text-center">
    <component
        :is="icon"
        v-if="icon"
        class="mx-auto h-8 w-8 text-slate-500"
    />

    <p class="mt-3 text-sm font-semibold text-white">
      {{ title }}
    </p>

    <p
        v-if="description"
        class="mt-1 text-sm text-slate-400"
    >
      {{ description }}
    </p>

    <div
        v-if="$slots.default"
        class="mt-4"
    >
      <slot />
    </div>
  </div>
</template>
