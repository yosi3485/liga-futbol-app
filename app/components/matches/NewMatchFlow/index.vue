<script lang="ts" src="./script.ts"></script>

<template>
  <section class="space-y-4 lg:space-y-6">
    <UiSectionTitle
        title="Partidos"
        subtitle="Jornada, equipos y marcador"
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

    <div class="grid grid-cols-2 gap-2 rounded-2xl bg-slate-900 p-1">
      <button
          type="button"
          class="rounded-xl px-3 py-2 text-sm font-semibold transition"
          :class="activeTab === 'jornada' ? 'bg-slate-800 text-white' : 'text-slate-400'"
          @click="activeTab = 'jornada'"
      >
        Jornada
      </button>

      <button
          type="button"
          class="rounded-xl px-3 py-2 text-sm font-semibold transition"
          :class="activeTab === 'partido' ? 'bg-slate-800 text-white' : 'text-slate-400'"
          @click="activeTab = 'partido'"
      >
        Partido
      </button>
    </div>

    <UiAppCard v-if="activeTab === 'jornada'">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="text-base font-semibold text-white">
            Asistencia
          </h3>

          <p class="mt-1 text-sm text-slate-400">
            {{ jornadaDate }}
          </p>
        </div>

        <UiAppBadge variant="neutral">
          {{ selectedJornadaPlayerIds.length }}
        </UiAppBadge>
      </div>
      <div
          v-if="isJornadaClosed"
          class="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200"
      >
        Jornada finalizada (solo lectura)
      </div>

      <div class="grid gap-4 xl:grid-cols-2">
        <div
            v-for="team in teams"
            :key="team.id"
            class="rounded-2xl border border-slate-800 bg-slate-950 p-3"
        >
          <div class="mb-3 flex items-center justify-between gap-3">
            <p class="text-sm font-semibold text-white">
              {{ team.name }}
            </p>

            <UiAppBadge variant="neutral">
              {{ presentPlayersForTeam(team.id).length }}
            </UiAppBadge>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <button
                v-for="player in activePlayersForTeam(team.id)"
                :key="player.id"
                type="button"
                class="min-w-0 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition"
                :class="isPlayerPresent(player.id) ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-slate-800 bg-slate-900 text-slate-300'"
                :disabled="saving || isJornadaClosed"
                @click="toggleJornadaPlayer(player.id)"
            >
              <span class="block truncate">
                {{ player.name }}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div class="grid gap-2 md:grid-cols-2">
        <UiAppButton
            variant="secondary"
            :disabled="saving || isJornadaClosed"
            @click="saveJornadaAttendance"
        >
          Guardar jornada
        </UiAppButton>
        <UiAppButton
            :disabled="saving || isJornadaClosed"
            @click="finishJornada"
        >
          Finalizar jornada
        </UiAppButton>
        <UiAppButton
            v-if="selectedJornadaPlayerIds.length || isJornadaClosed"
            variant="secondary"
            :disabled="saving"
            @click="resetJornada"
        >
          Nueva jornada
        </UiAppButton>
        <UiAppButton
            v-if="isJornadaClosed"
            variant="secondary"
            :disabled="saving"
            @click="reopenJornada"
        >
          Reabrir jornada
        </UiAppButton>
      </div>
    </UiAppCard>

    <div
        v-else
        class="grid gap-4 lg:grid-cols-[minmax(320px,420px)_1fr] lg:items-start"
    >
      <UiAppCard>
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="text-base font-semibold text-white">
              Nuevo partido
            </h3>

            <p class="mt-1 text-sm text-slate-400">
              Selecciona los equipos.
            </p>
          </div>

          <UiAppBadge :variant="activeMatch ? 'warning' : 'success'">
            {{ activeMatch ? 'Bloqueado' : 'Disponible' }}
          </UiAppBadge>
        </div>

        <div
            v-if="activeMatch"
            class="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200"
        >
          Todavía tienes un partido en progreso.
        </div>

        <form
            class="grid gap-3"
            @submit.prevent="startMatch"
        >
          <UiAppSelect
              v-model="formTeamAId"
              label="Equipo A"
              :disabled="saving || loading || Boolean(activeMatch)"
              @update:model-value="syncSelectedPlayersForTeam('a')"
          >
            <option value="">Selecciona equipo</option>
            <option
                v-for="team in teams"
                :key="team.id"
                :value="team.id"
            >
              {{ team.name }}
            </option>
          </UiAppSelect>

          <UiAppSelect
              v-model="formTeamBId"
              label="Equipo B"
              :disabled="saving || loading || Boolean(activeMatch)"
              @update:model-value="syncSelectedPlayersForTeam('b')"
          >
            <option value="">Selecciona equipo</option>
            <option
                v-for="team in availableTeamBOptions"
                :key="team.id"
                :value="team.id"
            >
              {{ team.name }}
            </option>
          </UiAppSelect>

          <div
              v-if="currentTeamAId && currentTeamBId"
              class="rounded-2xl border border-slate-800 bg-slate-950 p-3"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-white">
                  Jugadores
                </p>

                <p class="mt-1 text-xs text-slate-400">
                  Mínimo 5 por equipo.
                </p>
              </div>

              <UiAppBadge variant="neutral">
                {{ selectedPlayerCount('a') }} - {{ selectedPlayerCount('b') }}
              </UiAppBadge>
            </div>

            <div class="mt-4 grid gap-4">
              <div class="space-y-3">
                <div class="flex items-center justify-between gap-3">
                  <p class="text-sm font-semibold text-white">
                    {{ getTeamName(currentTeamAId) }}
                  </p>

                  <UiAppBadge :variant="presentPlayersForTeam(currentTeamAId).length < 5 ? 'warning' : 'neutral'">
                    {{ presentPlayersForTeam(currentTeamAId).length }} presentes
                  </UiAppBadge>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <button
                      v-for="player in basePlayersForTeam(currentTeamAId)"
                      :key="`a-base-${player.id}`"
                      type="button"
                      class="rounded-xl border px-3 py-2 text-left text-xs font-semibold transition"
                      :class="isPlayerSelectedForTeam(player.id, 'a') ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-slate-800 bg-slate-900 text-slate-300'"
                      :disabled="saving || isPlayerDisabledForTeam(player.id, 'a')"
                      @click="togglePlayerForTeam(player.id, 'a')"
                  >
                    <span class="block truncate">{{ player.name }}</span>
                  </button>
                </div>

                <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Refuerzos
                </p>

                <div class="grid grid-cols-2 gap-2">
                  <button
                      v-for="player in reinforcementPlayersForTeam(currentTeamAId)"
                      :key="`a-ref-${player.id}`"
                      type="button"
                      class="rounded-xl border px-3 py-2 text-left text-xs font-semibold transition"
                      :class="isPlayerSelectedForTeam(player.id, 'a') ? 'border-amber-500/40 bg-amber-500/10 text-amber-200' : 'border-slate-800 bg-slate-900 text-slate-300'"
                      :disabled="saving || isPlayerDisabledForTeam(player.id, 'a')"
                      @click="togglePlayerForTeam(player.id, 'a')"
                  >
                    <span class="block truncate">{{ player.name }}</span>
                    <span class="mt-1 block truncate text-slate-500">{{ getPlayerTeamName(player) }}</span>
                  </button>
                </div>
              </div>

              <div class="space-y-3 border-t border-slate-800 pt-4">
                <div class="flex items-center justify-between gap-3">
                  <p class="text-sm font-semibold text-white">
                    {{ getTeamName(currentTeamBId) }}
                  </p>

                  <UiAppBadge :variant="presentPlayersForTeam(currentTeamBId).length < 5 ? 'warning' : 'neutral'">
                    {{ presentPlayersForTeam(currentTeamBId).length }} presentes
                  </UiAppBadge>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <button
                      v-for="player in basePlayersForTeam(currentTeamBId)"
                      :key="`b-base-${player.id}`"
                      type="button"
                      class="rounded-xl border px-3 py-2 text-left text-xs font-semibold transition"
                      :class="isPlayerSelectedForTeam(player.id, 'b') ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-slate-800 bg-slate-900 text-slate-300'"
                      :disabled="saving || isPlayerDisabledForTeam(player.id, 'b')"
                      @click="togglePlayerForTeam(player.id, 'b')"
                  >
                    <span class="block truncate">{{ player.name }}</span>
                  </button>
                </div>

                <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Refuerzos
                </p>

                <div class="grid grid-cols-2 gap-2">
                  <button
                      v-for="player in reinforcementPlayersForTeam(currentTeamBId)"
                      :key="`b-ref-${player.id}`"
                      type="button"
                      class="rounded-xl border px-3 py-2 text-left text-xs font-semibold transition"
                      :class="isPlayerSelectedForTeam(player.id, 'b') ? 'border-amber-500/40 bg-amber-500/10 text-amber-200' : 'border-slate-800 bg-slate-900 text-slate-300'"
                      :disabled="saving || isPlayerDisabledForTeam(player.id, 'b')"
                      @click="togglePlayerForTeam(player.id, 'b')"
                  >
                    <span class="block truncate">{{ player.name }}</span>
                    <span class="mt-1 block truncate text-slate-500">{{ getPlayerTeamName(player) }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <UiAppButton
              type="submit"
              :disabled="!canStartMatch"
          >
            <span class="inline-flex items-center justify-center gap-2">
              <CalendarPlus class="h-4 w-4" />
              {{ saving ? 'Iniciando...' : 'Iniciar partido' }}
            </span>
          </UiAppButton>
        </form>
      </UiAppCard>

      <div class="space-y-4">
        <UiAppCard>
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="text-base font-semibold text-white">
                Partido activo
              </h3>

              <p class="mt-1 text-sm text-slate-400">
                Marcador y jugadores.
              </p>
            </div>

            <button
                type="button"
                class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="loading || saving"
                aria-label="Recargar partidos"
                @click="loadData"
            >
              <RefreshCw class="h-4 w-4" />
            </button>
          </div>

          <div
              v-if="activeMatch"
              class="space-y-4"
          >
            <div class="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-300">
                <Clock class="h-4 w-4" />
                En progreso
              </div>

              <div class="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <p class="truncate text-center text-sm font-semibold text-white">
                  {{ getTeamName(activeMatch.team_a_id) }}
                </p>
                <span class="text-sm font-semibold text-slate-500">vs</span>
                <p class="truncate text-center text-sm font-semibold text-white">
                  {{ getTeamName(activeMatch.team_b_id) }}
                </p>
              </div>

              <div class="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <UiAppInput
                    v-model="activeTeamAScore"
                    type="number"
                    min="0"
                    max="99"
                    :disabled="true"
                />
                <span class="text-xl font-bold text-slate-500">-</span>
                <UiAppInput
                    v-model="activeTeamBScore"
                    type="number"
                    min="0"
                    max="99"
                    :disabled="true"
                />
              </div>

              <p class="mt-3 text-xs text-slate-500">
                Iniciado: {{ formatMatchDate(activeMatch.played_at) }}
              </p>
            </div>

            <div class="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h4 class="text-sm font-semibold text-white">
                    Goles
                  </h4>

                  <p class="mt-1 text-xs text-slate-400">
                    {{ teamAGoalsTotal }} - {{ teamBGoalsTotal }}
                  </p>
                </div>
              </div>

              <div class="mt-4 grid gap-4 xl:grid-cols-2">
                <div class="space-y-3">
                  <div class="flex items-center justify-between gap-3">
                    <p class="truncate text-sm font-semibold text-white">
                      {{ getTeamName(activeMatch.team_a_id) }}
                    </p>

                    <UiAppBadge variant="neutral">
                      {{ teamAGoalsTotal }}
                    </UiAppBadge>
                  </div>

                  <div class="grid gap-2">
                    <div
                        v-for="player in selectedTeamAPlayers"
                        :key="`goals-a-${player.id}`"
                        class="space-y-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2"
                    >
                      <div class="flex items-center justify-between gap-3">
                        <p class="truncate text-sm font-semibold text-slate-200">
                          {{ player.name }}
                        </p>

                        <div class="grid grid-cols-[2rem_2rem_2rem] items-center gap-1">
                          <button
                              type="button"
                              class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-sm font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                              :disabled="saving || getPlayerGoals(player.id) === 0"
                              @click="decrementPlayerGoal(player.id)"
                          >
                            -
                          </button>

                          <span class="text-center text-sm font-bold text-white">
                            {{ getPlayerGoals(player.id) }}
                          </span>

                          <button
                              type="button"
                              class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-sm font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                              :disabled="saving"
                              @click="incrementPlayerGoal(player.id)"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div class="flex items-center justify-between gap-3">
                        <button
                            type="button"
                            class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                            :disabled="saving"
                            :aria-label="`Autogol de ${player.name}`"
                            title="Autogol"
                            @click="incrementPlayerOwnGoal(player.id)"
                        >
                          <TriangleAlert class="h-3.5 w-3.5" />
                        </button>

                        <div class="grid grid-cols-[2rem_2rem] items-center gap-1">
                          <span class="text-center text-xs font-bold text-red-300">
                            {{ getPlayerOwnGoals(player.id) }}
                          </span>

                          <button
                              type="button"
                              class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-sm font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                              :disabled="saving || getPlayerOwnGoals(player.id) === 0"
                              @click="decrementPlayerOwnGoal(player.id)"
                          >
                            -
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="space-y-3 border-t border-slate-800 pt-4 xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0">
                  <div class="flex items-center justify-between gap-3">
                    <p class="truncate text-sm font-semibold text-white">
                      {{ getTeamName(activeMatch.team_b_id) }}
                    </p>

                    <UiAppBadge variant="neutral">
                      {{ teamBGoalsTotal }}
                    </UiAppBadge>
                  </div>

                  <div class="grid gap-2">
                    <div
                        v-for="player in selectedTeamBPlayers"
                        :key="`goals-b-${player.id}`"
                        class="space-y-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2"
                    >
                      <div class="flex items-center justify-between gap-3">
                        <p class="truncate text-sm font-semibold text-slate-200">
                          {{ player.name }}
                        </p>

                        <div class="grid grid-cols-[2rem_2rem_2rem] items-center gap-1">
                          <button
                              type="button"
                              class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-sm font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                              :disabled="saving || getPlayerGoals(player.id) === 0"
                              @click="decrementPlayerGoal(player.id)"
                          >
                            -
                          </button>

                          <span class="text-center text-sm font-bold text-white">
                            {{ getPlayerGoals(player.id) }}
                          </span>

                          <button
                              type="button"
                              class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-sm font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                              :disabled="saving"
                              @click="incrementPlayerGoal(player.id)"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div class="flex items-center justify-between gap-3">
                        <button
                            type="button"
                            class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                            :disabled="saving"
                            :aria-label="`Autogol de ${player.name}`"
                            title="Autogol"
                            @click="incrementPlayerOwnGoal(player.id)"
                        >
                          <TriangleAlert class="h-3.5 w-3.5" />
                        </button>

                        <div class="grid grid-cols-[2rem_2rem] items-center gap-1">
                          <span class="text-center text-xs font-bold text-red-300">
                            {{ getPlayerOwnGoals(player.id) }}
                          </span>

                          <button
                              type="button"
                              class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-sm font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                              :disabled="saving || getPlayerOwnGoals(player.id) === 0"
                              @click="decrementPlayerOwnGoal(player.id)"
                          >
                            -
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <UiAppButton
                  class="mt-4"
                  variant="secondary"
                  :disabled="saving"
                  @click="saveGoals"
              >
                Guardar goles
              </UiAppButton>
            </div>

            <div
                v-if="tieHasGoals"
                class="rounded-2xl border border-slate-800 bg-slate-950 p-4"
            >
              <UiAppSelect
                  v-model="firstGoalTeamId"
                  label="Primer gol"
                  :disabled="saving"
              >
                <option value="">Selecciona equipo</option>
                <option :value="activeMatch.team_a_id">
                  {{ getTeamName(activeMatch.team_a_id) }}
                </option>
                <option :value="activeMatch.team_b_id">
                  {{ getTeamName(activeMatch.team_b_id) }}
                </option>
              </UiAppSelect>
            </div>

            <div
                v-if="isScorelessTie"
                class="rounded-2xl border border-slate-800 bg-slate-950 p-4"
            >
              <UiAppSelect
                  v-model="manualWinnerTeamId"
                  label="Ganador"
                  :disabled="saving"
              >
                <option value="">Usar partido anterior</option>
                <option :value="activeMatch.team_a_id">
                  {{ getTeamName(activeMatch.team_a_id) }}
                </option>
                <option :value="activeMatch.team_b_id">
                  {{ getTeamName(activeMatch.team_b_id) }}
                </option>
              </UiAppSelect>
            </div>

            <div class="grid gap-2">
              <UiAppButton
                  :disabled="saving"
                  @click="finishMatch"
              >
                <span class="inline-flex items-center justify-center gap-2">
                  <Check class="h-4 w-4" />
                  Finalizar partido
                </span>
              </UiAppButton>
            </div>

            <UiAppButton
                variant="secondary"
                :disabled="saving"
                @click="saveMatchPlayers"
            >
              <span class="inline-flex items-center justify-center gap-2">
                <Users class="h-4 w-4" />
                Guardar jugadores
              </span>
            </UiAppButton>
          </div>

          <UiEmptyState
              v-else
              :icon="Clock"
              title="No hay partido activo"
              description="Inicia un partido para ver el marcador."
          />
        </UiAppCard>

        <UiAppCard>
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="text-base font-semibold text-white">
                Partidos jugados
              </h3>
              <p class="mt-1 text-sm text-slate-400">
                Últimos partidos finalizados.
              </p>
            </div>

            <UiAppBadge variant="neutral">
              {{ recentMatchesTotal }}
            </UiAppBadge>
          </div>

          <div
              v-if="recentMatches.length"
              class="grid gap-2"
          >
            <div
                v-for="match in recentMatches"
                :key="match.id"
            >
              <MatchesMatchDetailsCard
                  :team-a-name="getTeamName(match.team_a_id)"
                  :team-b-name="getTeamName(match.team_b_id)"
                  :score-a="match.team_a_score ?? 0"
                  :score-b="match.team_b_score ?? 0"
                  :is-winner-a="isMatchWinner(match, match.team_a_id)"
                  :is-winner-b="isMatchWinner(match, match.team_b_id)"
                  :time-label="formatMatchDate(match.played_at)"
                  :winner-reason-label="match.winner_reason ? getWinnerReasonLabel(match.winner_reason) : ''"
                  :winner-name="match.winner_team_id ? getTeamName(match.winner_team_id) : ''"
                  :details="recentMatchDetails[match.id] ?? []"
              />
            </div>
          </div>

          <UiEmptyState
              v-else
              :icon="Trophy"
              title="No hay partidos todavía"
              description="Inicia el primer partido para construir el historial."
          />

          <div
              v-if="recentMatchesTotalPages > 1"
              class="flex items-center justify-between gap-3 border-t border-slate-800 pt-4"
          >
            <button
                type="button"
                class="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold leading-none text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                :disabled="!canGoToPreviousMatchesPage"
                @click="goToPreviousMatchesPage"
            >
              Anterior
            </button>

            <p class="text-center text-xs font-semibold text-slate-400">
              {{ recentMatchesPage }} / {{ recentMatchesTotalPages }}
            </p>

            <button
                type="button"
                class="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold leading-none text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                :disabled="!canGoToNextMatchesPage"
                @click="goToNextMatchesPage"
            >
              Siguiente
            </button>
          </div>
        </UiAppCard>
      </div>
    </div>
  </section>
</template>
