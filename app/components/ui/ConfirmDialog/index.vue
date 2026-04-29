<script lang="ts" src="./script.ts"></script>

<template>
  <Teleport to="body">
    <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/75 p-4 backdrop-blur-sm sm:items-center"
        @click.self="cancel"
    >
      <section class="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-2xl shadow-slate-950/60">
        <div class="flex items-start gap-3">
          <div
              class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
              :class="variantClasses.icon"
          >
            <component
                :is="iconComponent"
                class="h-5 w-5"
            />
          </div>

          <div class="min-w-0">
            <h3 class="text-base font-semibold text-white">
              {{ title }}
            </h3>

            <p
                v-if="message"
                class="mt-1 text-sm leading-6 text-slate-400"
            >
              {{ message }}
            </p>
          </div>
        </div>

        <div class="mt-5 grid grid-cols-2 gap-2">
          <UiAppButton
              variant="secondary"
              :disabled="loading"
              @click="cancel"
          >
            {{ cancelLabel }}
          </UiAppButton>

          <UiAppButton
              :variant="confirmVariant"
              :disabled="loading"
              @click="confirm"
          >
            {{ loading ? loadingLabel : confirmLabel }}
          </UiAppButton>
        </div>
      </section>
    </div>
  </Teleport>
</template>
