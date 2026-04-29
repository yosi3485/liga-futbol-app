<script lang="ts" src="./script.ts"></script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-800 bg-slate-900/95 backdrop-blur lg:hidden">
    <div class="mx-auto grid max-w-md grid-cols-5 px-2 py-2">
      <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex flex-col items-center justify-center rounded-xl px-2 py-2 text-xs transition"
          :class="isActive(item.to) ? 'bg-slate-800 text-white' : 'text-slate-400'"
      >
        <component
            :is="item.icon"
            class="h-5 w-5"
            :class="isActive(item.to) ? 'text-emerald-400' : 'text-slate-500'"
        />

        <span class="mt-1">
          {{ item.label }}
        </span>
      </NuxtLink>
    </div>
  </nav>
</template>
