<script lang="ts" src="./script.ts"></script>

<template>
  <header class="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/90 px-4 py-4 backdrop-blur safe-pt lg:px-8">
    <div class="mx-auto flex w-full max-w-md items-center justify-between gap-4 lg:max-w-7xl">
      <div>
        <p class="text-xs uppercase tracking-wide text-slate-400">
          Liga
        </p>

        <h1 class="text-lg font-bold text-white lg:text-xl">
          Liga de Fútbol
        </h1>
      </div>

      <nav class="hidden items-center gap-1 lg:flex">
        <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition"
            :class="isActive(item.to) ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-white'"
        >
          <component
              :is="item.icon"
              class="h-4 w-4"
              :class="isActive(item.to) ? 'text-emerald-400' : 'text-slate-500'"
          />

          <span>
            {{ item.label }}
          </span>
        </NuxtLink>
      </nav>

      <div class="flex items-center gap-2">
        <NuxtLink
            v-if="!userEmail && !authLoading"
            to="/login"
            class="inline-flex items-center justify-center rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
        >
          Iniciar sesión
        </NuxtLink>
        <button
            v-else-if="userEmail"
            type="button"
            class="inline-flex items-center justify-center rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
            @click="signOut"
        >
          Salir
        </button>
        <div class="flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
          <Trophy class="h-4 w-4 text-emerald-400" />
          <span>{{ userEmail ? userEmail : 'LSF' }}</span>
        </div>
      </div>
    </div>
  </header>
</template>
