<script lang="ts" src="./script.ts"></script>

<template>
  <section class="space-y-4 lg:space-y-6">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <UiSectionTitle
          title="Admin"
          subtitle="Gestiona equipos, jugadores y partidos de la liga"
      />

      <UiAppBadge variant="neutral">
        Panel
      </UiAppBadge>
    </div>

    <div class="grid gap-4 lg:grid-cols-[240px_1fr] lg:items-start">
      <UiAppCard compact>
        <nav class="grid gap-2">
          <NuxtLink
              v-for="item in adminItems"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition"
              :class="isActive(item.to) ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-950 hover:text-white'"
          >
            <span
                class="inline-flex h-9 w-9 items-center justify-center rounded-xl"
                :class="isActive(item.to) ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-950 text-slate-500'"
            >
              <component
                  :is="item.icon"
                  class="h-4 w-4"
              />
            </span>

            <span>{{ item.label }}</span>
          </NuxtLink>
        </nav>
      </UiAppCard>

      <div class="min-w-0">
        <slot />
      </div>
    </div>
  </section>
</template>
