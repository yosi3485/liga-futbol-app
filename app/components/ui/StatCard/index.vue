<script lang="ts" src="./script.ts"></script>

<template>
  <div class="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-sm text-slate-400">
          {{ label }}
        </p>

        <div class="mt-2 text-2xl font-bold text-white">
          {{ value }}
        </div>

        <p v-if="subtitle" class="mt-1 text-xs text-slate-500">
          {{ subtitle }}
        </p>
      </div>

      <div
          v-if="icon"
          class="rounded-xl bg-slate-800 p-2 text-emerald-400"
      >
        <component
            :is="icon"
            class="h-5 w-5"
        />
      </div>
    </div>
  </div>
</template>
