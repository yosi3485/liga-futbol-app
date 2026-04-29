<script lang="ts" src="./script.ts"></script>

<template>
  <label class="block">
    <span
        v-if="label"
        class="mb-1 block text-sm font-medium text-slate-400"
    >
      {{ label }}
    </span>

    <span class="relative block">
      <select
          :value="modelValue"
          :disabled="disabled"
          class="w-full appearance-none rounded-2xl border border-slate-700 bg-slate-950 py-3 pl-4 pr-11 text-sm text-white outline-none transition focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          @change="updateValue"
      >
        <slot />
      </select>

      <ChevronDown class="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </span>
  </label>
</template>
