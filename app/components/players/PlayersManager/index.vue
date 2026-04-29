<script lang="ts" src="./script.ts"></script>

<template>
  <section class="space-y-4 lg:space-y-6">
    <UiSectionTitle
        title="Jugadores"
        subtitle="Administra planteles, dorsales y estado de cada jugador"
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
              {{ isEditing ? 'Editar jugador' : 'Nuevo jugador' }}
            </h3>

            <p class="mt-1 text-sm text-slate-400">
              {{ isEditing ? 'Actualiza los datos del jugador.' : 'Agrega un jugador al plantel.' }}
            </p>
          </div>

          <UiAppBadge :variant="isEditing ? 'warning' : 'success'">
            {{ isEditing ? 'Edición' : 'Alta' }}
          </UiAppBadge>
        </div>

        <form
            class="grid gap-3"
            @submit.prevent="savePlayer"
        >
          <UiAppInput
              v-model="formName"
              label="Nombre"
              placeholder="Nombre del jugador"
              :disabled="saving"
          />

          <div class="grid grid-cols-2 gap-3">
            <UiAppSelect
                v-model="formTeamId"
                label="Equipo"
                :disabled="saving || !teams.length"
            >
              <option value="">Equipo</option>
              <option
                  v-for="team in teams"
                  :key="team.id"
                  :value="team.id"
              >
                {{ team.name }}
              </option>
            </UiAppSelect>

            <UiAppInput
                v-model="formJerseyNumber"
                label="Número"
                type="number"
                min="0"
                max="999"
                placeholder="10"
                :disabled="saving"
            />
          </div>
          <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <UiAppInput
                v-model="formEmail"
                label="Email"
                type="email"
                placeholder="jugador@liga.com"
                :disabled="saving"
            />
            <UiAppInput
                v-if="!isEditing"
                v-model="formAuthPassword"
                label="Contraseña inicial"
                type="password"
                placeholder="Para crear su acceso"
                :disabled="saving"
            />
          </div>

          <UiAppSelect
              v-model="formIsActive"
              label="Estado"
              :disabled="saving"
          >
            <option :value="true">Activo</option>
            <option :value="false">Inactivo</option>
          </UiAppSelect>

          <div class="flex gap-2 pt-1">
            <UiAppButton
                type="submit"
                :disabled="saving || loading || !teams.length"
            >
              <span class="inline-flex items-center justify-center gap-2">
                <UserRoundPlus class="h-4 w-4" />
                {{ saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear jugador' }}
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
              Jugadores registrados
            </h3>

            <p class="mt-1 text-sm text-slate-400">
              {{ activePlayersCount }} activos · {{ inactivePlayersCount }} inactivos
            </p>
          </div>

          <UiAppBadge variant="neutral">
            {{ sortedPlayers.length }}
          </UiAppBadge>
        </div>

        <div class="grid gap-3 xl:grid-cols-[1fr_auto] xl:items-center">
          <div class="relative">
            <Search class="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
                v-model="searchTerm"
                type="search"
                class="w-full rounded-2xl border border-slate-700 bg-slate-950 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
                placeholder="Buscar por nombre, equipo o número"
            />
          </div>

          <div class="grid grid-cols-3 gap-2 xl:w-80">
            <button
                type="button"
                class="rounded-2xl px-3 py-2 text-xs font-semibold transition"
                :class="activeFilter === 'all' ? 'bg-white text-slate-950' : 'bg-slate-950 text-slate-300'"
                @click="activeFilter = 'all'"
            >
              Todos
            </button>

            <button
                type="button"
                class="rounded-2xl px-3 py-2 text-xs font-semibold transition"
                :class="activeFilter === 'active' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-950 text-slate-300'"
                @click="activeFilter = 'active'"
            >
              Activos
            </button>

            <button
                type="button"
                class="rounded-2xl px-3 py-2 text-xs font-semibold transition"
                :class="activeFilter === 'inactive' ? 'bg-slate-500 text-white' : 'bg-slate-950 text-slate-300'"
                @click="activeFilter = 'inactive'"
            >
              Inactivos
            </button>
          </div>
        </div>

        <p
            v-if="loading"
            class="text-sm text-slate-400"
        >
          Cargando jugadores...
        </p>

        <div
            v-else-if="filteredPlayers.length"
            class="grid gap-2 xl:grid-cols-2"
        >
          <div
              v-for="player in filteredPlayers"
              :key="player.id"
              class="rounded-2xl border border-slate-800 bg-slate-950 p-3 transition hover:border-slate-700"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate font-semibold text-white">
                  {{ player.name }}
                </p>

                <p class="mt-1 text-xs text-slate-400">
                  {{ teamsMap.get(player.team_id ?? '') ?? 'Sin equipo' }}
                  <span v-if="player.jersey_number !== null">
                    - #{{ player.jersey_number }}
                  </span>
                </p>
              </div>

              <UiAppBadge :variant="player.is_active ? 'success' : 'neutral'">
                {{ player.is_active ? 'Activo' : 'Inactivo' }}
              </UiAppBadge>
            </div>

            <div class="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
              <button
                  type="button"
                  class="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-800 px-3 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="saving"
                  @click="startEditing(player)"
              >
                <Pencil class="h-4 w-4" />
                Editar
              </button>

              <button
                  type="button"
                  class="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-800 px-3 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="saving"
                  @click="togglePlayerActive(player)"
              >
                <component
                    :is="player.is_active ? UserX : UserCheck"
                    class="h-4 w-4"
                />
                {{ player.is_active ? 'Inactivar' : 'Activar' }}
              </button>

              <button
                  type="button"
                  class="inline-flex h-9 items-center justify-center rounded-xl bg-red-500/10 px-3 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="saving"
                  @click="requestDeletePlayer(player)"
                  aria-label="Eliminar jugador"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <UiEmptyState
            v-else
            :icon="Users"
            :title="sortedPlayers.length ? 'No hay resultados' : 'No hay jugadores registrados'"
            :description="sortedPlayers.length ? 'Ajusta la búsqueda o cambia el filtro.' : 'Crea el primer jugador para empezar a construir los planteles.'"
        />
      </UiAppCard>
    </div>

    <UiConfirmDialog
        :open="Boolean(playerPendingDelete)"
        title="Eliminar jugador"
        :message="playerPendingDelete ? `Vas a eliminar a ${playerPendingDelete.name}. Esta acción no se puede deshacer.` : ''"
        confirm-label="Eliminar"
        loading-label="Eliminando..."
        variant="danger"
        :loading="saving"
        @cancel="cancelDeletePlayer"
        @confirm="confirmDeletePlayer"
    />
  </section>
</template>
