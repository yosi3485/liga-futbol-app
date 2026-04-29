<script lang="ts" src="./script.ts"></script>

<template>
  <section class="space-y-4 lg:space-y-6">
    <UiSectionTitle
        title="Equipos"
        subtitle="Crea y administra los equipos de la liga"
    />

    <div
        v-if="errorMessage"
        class="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
    >
      {{ errorMessage }}
    </div>

    <div
        v-if="successMessage"
        class="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300"
    >
      {{ successMessage }}
    </div>

    <div class="grid gap-4 lg:grid-cols-[minmax(320px,380px)_1fr] lg:items-start">
      <UiAppCard>
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="text-base font-semibold text-white">
              {{ isEditing ? 'Editar equipo' : 'Nuevo equipo' }}
            </h3>

            <p class="mt-1 text-sm text-slate-400">
              {{ isEditing ? 'Actualiza el nombre del equipo seleccionado.' : 'Crea un equipo para organizar planteles y partidos.' }}
            </p>
          </div>

          <UiAppBadge :variant="isEditing ? 'warning' : 'success'">
            {{ isEditing ? 'Edición' : 'Alta' }}
          </UiAppBadge>
        </div>

        <form
            class="grid gap-3"
            @submit.prevent="saveTeam"
        >
          <UiAppInput
              v-model="formName"
              label="Nombre"
              placeholder="Ej. Los Titanes"
              :disabled="saving"
          />

          <div class="flex gap-2 pt-1">
            <UiAppButton
                type="submit"
                :disabled="saving"
            >
              <span class="inline-flex items-center justify-center gap-2">
                <Plus class="h-4 w-4" />
                {{ saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear equipo' }}
              </span>
            </UiAppButton>

            <UiAppButton
                v-if="isEditing"
                variant="secondary"
                :disabled="saving"
                @click="resetForm"
            >
              Cancelar
            </UiAppButton>
          </div>
        </form>
      </UiAppCard>

      <UiAppCard>
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="text-base font-semibold text-white">
              Equipos registrados
            </h3>

            <p class="mt-1 text-sm text-slate-400">
              {{ sortedTeams.length }} equipos en la liga
            </p>
          </div>

          <UiAppBadge variant="neutral">
            {{ sortedTeams.length }}
          </UiAppBadge>
        </div>

        <div class="relative">
          <Search class="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
              v-model="searchTerm"
              type="search"
              class="w-full rounded-2xl border border-slate-700 bg-slate-950 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
              placeholder="Buscar equipo"
          />
        </div>

        <p
            v-if="loading"
            class="text-sm text-slate-400"
        >
          Cargando equipos...
        </p>

        <div
            v-else-if="filteredTeams.length"
            class="grid gap-2 xl:grid-cols-2"
        >
          <div
              v-for="team in filteredTeams"
              :key="team.id"
              class="rounded-2xl border border-slate-800 bg-slate-950 p-3 transition hover:border-slate-700"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="flex min-w-0 items-center gap-3">
                <div class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                  <Shield class="h-5 w-5" />
                </div>

                <div class="min-w-0">
                  <p class="truncate font-semibold text-white">
                    {{ team.name }}
                  </p>

                  <p class="mt-1 text-xs text-slate-400">
                    Equipo activo
                  </p>
                </div>
              </div>
            </div>

            <div class="mt-3 grid grid-cols-[1fr_auto] gap-2">
              <button
                  type="button"
                  class="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-slate-800 px-3 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="saving"
                  @click="startEditing(team)"
              >
                <Pencil class="h-4 w-4" />
                Editar
              </button>

              <button
                  type="button"
                  class="inline-flex h-9 items-center justify-center rounded-xl bg-red-500/10 px-3 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="saving"
                  @click="requestDeleteTeam(team)"
                  aria-label="Eliminar equipo"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <UiEmptyState
            v-else
            :icon="Shield"
            :title="sortedTeams.length ? 'No hay resultados' : 'No hay equipos registrados'"
            :description="sortedTeams.length ? 'Ajusta la búsqueda para encontrar el equipo.' : 'Crea el primer equipo para comenzar a registrar jugadores.'"
        />
      </UiAppCard>
    </div>

    <UiConfirmDialog
        :open="Boolean(teamPendingDelete)"
        title="Eliminar equipo"
        :message="teamPendingDelete ? `Vas a eliminar ${teamPendingDelete.name}. Esta acción puede fallar si tiene jugadores o partidos relacionados.` : ''"
        confirm-label="Eliminar"
        loading-label="Eliminando..."
        variant="danger"
        :loading="saving"
        @cancel="cancelDeleteTeam"
        @confirm="confirmDeleteTeam"
    />
  </section>
</template>
