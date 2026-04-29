<script lang="ts" src="./script.ts"></script>

<template>
  <label class="block">
    <span
        v-if="label"
        class="mb-1 block text-sm font-medium text-slate-400"
    >
      {{ label }}
    </span>

    <input
        :value="modelValue"
        :type="type"
        :min="min"
        :max="max"
        :placeholder="placeholder"
        :disabled="disabled"
        class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        @input="updateValue"
    />
  </label>
</template>
