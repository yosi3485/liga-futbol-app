<script lang="ts" src="./script.ts"></script>

<template>
  <span
      class="inline-flex items-center justify-center rounded-full px-2.5 py-1 text-center text-xs font-semibold leading-none"
      :class="variantClasses"
  >
    <slot />
  </span>
</template>
