<script lang="ts" src="./script.ts"></script>

<template>
  <div>
    <h2 class="text-xl font-bold text-white">
      {{ title }}
    </h2>

    <p v-if="subtitle" class="mt-1 text-sm text-slate-400">
      {{ subtitle }}
    </p>
  </div>
</template>
