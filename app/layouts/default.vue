<template>
  <div class="min-h-screen bg-slate-950 text-slate-100">
    <div class="mx-auto flex min-h-screen w-full max-w-md flex-col lg:max-w-7xl">
      <UiAppHeader />

      <main class="flex-1 px-4 pt-4 pb-24 lg:px-8 lg:pb-10 lg:pt-6">
        <slot />
      </main>

      <UiBottomNav />
    </div>
  </div>
</template>
