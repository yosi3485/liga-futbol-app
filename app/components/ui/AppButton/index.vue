<script lang="ts" src="./script.ts"></script>

<template>
  <button
      :type="type"
      :disabled="disabled"
      class="inline-flex items-center justify-center rounded-2xl px-4 py-3 text-center text-sm font-semibold leading-none transition disabled:cursor-not-allowed disabled:opacity-50"
      :class="variantClasses"
  >
    <slot />
  </button>
</template>
