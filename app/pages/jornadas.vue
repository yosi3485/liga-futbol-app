<script lang="ts">
import { computed, defineComponent, onMounted, ref } from 'vue'
import { CalendarDays, ChevronDown, ChevronUp, Trophy } from 'lucide-vue-next'

type TeamRow = {
    id: string
    name: string
}

type MatchRow = {
    id: string
    played_at: string
    team_a_id: string
    team_b_id: string
    team_a_score: number | null
    team_b_score: number | null
    winner_team_id: string | null
    winner_reason: string | null
    player_match_stats?: Array<{ player_id: string; goals: number | null; own_goals: number | null; players: { name: string } | null }>
}

type JornadaGroup = {
    dateKey: string
    matches: MatchRow[]
}

export default defineComponent({
    name: 'JornadasPage',
    components: {
        CalendarDays,
        ChevronDown,
        ChevronUp,
        Trophy
    },
    setup() {
        const supabase = useSupabase()
        const loading = ref(false)
        const errorMessage = ref('')
        const teams = ref<TeamRow[]>([])
        const matches = ref<MatchRow[]>([])
        const expandedDates = ref<string[]>([])

        const teamsMap = computed(() => {
            return new Map(teams.value.map((team) => [team.id, team.name]))
        })

        const jornadas = computed(() => {
            const groups = new Map<string, MatchRow[]>()
            matches.value.forEach((match) => {
                const dateKey = match.played_at.slice(0, 10)
                const list = groups.get(dateKey) ?? []
                list.push(match)
                groups.set(dateKey, list)
            })

            return [...groups.entries()]
                .map(([dateKey, groupedMatches]) => ({
                    dateKey,
                    matches: groupedMatches.sort((a, b) => b.played_at.localeCompare(a.played_at))
                }))
                .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
        })

        const hasJornadas = computed(() => jornadas.value.length > 0)

        function formatDate(dateKey: string) {
            const date = new Date(`${dateKey}T12:00:00`)
            return new Intl.DateTimeFormat('es', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }).format(date)
        }

        function formatTime(value: string) {
            return new Intl.DateTimeFormat('es', {
                hour: 'numeric',
                minute: '2-digit'
            }).format(new Date(value))
        }

        function getTeamName(teamId: string) {
            return teamsMap.value.get(teamId) ?? 'Equipo'
        }

        function isWinner(match: MatchRow, teamId: string) {
            if (match.winner_team_id) return match.winner_team_id === teamId
            const scoreA = match.team_a_score ?? 0
            const scoreB = match.team_b_score ?? 0
            if (scoreA === scoreB) return false
            if (teamId === match.team_a_id) return scoreA > scoreB
            if (teamId === match.team_b_id) return scoreB > scoreA
            return false
        }

        function totalGoals(group: JornadaGroup) {
            return group.matches.reduce((total, match) => {
                return total + (match.team_a_score ?? 0) + (match.team_b_score ?? 0)
            }, 0)
        }

        function isExpanded(dateKey: string) {
            return expandedDates.value.includes(dateKey)
        }

        function toggleExpanded(dateKey: string) {
            expandedDates.value = isExpanded(dateKey)
                ? expandedDates.value.filter((value) => value !== dateKey)
                : [...expandedDates.value, dateKey]
        }

        async function loadData() {
            loading.value = true
            errorMessage.value = ''

            try {
                const [teamsResponse, matchesResponse] = await Promise.all([
                    supabase.from('teams').select('id, name').order('name', { ascending: true }),
                    supabase
                        .from('matches')
                        .select('id, played_at, team_a_id, team_b_id, team_a_score, team_b_score, winner_team_id, winner_reason')
                        .eq('status', 'finished')
                        .order('played_at', { ascending: false })
                        .order('created_at', { ascending: false })
                ])

                if (teamsResponse.error) throw teamsResponse.error
                if (matchesResponse.error) throw matchesResponse.error

                teams.value = teamsResponse.data ?? []
                matches.value = matchesResponse.data ?? []
                const ids = matches.value.map((m) => m.id)
                if (ids.length) {
                    const { data: stats } = await supabase
                        .from('player_match_stats')
                        .select('match_id, player_id, goals, own_goals, players(name)')
                        .in('match_id', ids)
                    const byMatch = new Map<string, Array<{ player_id: string; goals: number | null; own_goals: number | null; players: { name: string } | null }>>()
                    ;(stats ?? []).forEach((row: { match_id: string; player_id: string; goals: number | null; own_goals: number | null; players: { name: string } | null }) => {
                        const list = byMatch.get(row.match_id) ?? []
                        list.push({ player_id: row.player_id, goals: row.goals, own_goals: row.own_goals, players: row.players })
                        byMatch.set(row.match_id, list)
                    })
                    matches.value = matches.value.map((match) => ({ ...match, player_match_stats: byMatch.get(match.id) ?? [] }))
                }

                const latestDate = matches.value[0]?.played_at.slice(0, 10)
                expandedDates.value = latestDate ? [latestDate] : []
            } catch (error) {
                errorMessage.value = error instanceof Error ? error.message : 'Error cargando jornadas'
            } finally {
                loading.value = false
            }
        }

        onMounted(loadData)

        return {
            loading,
            errorMessage,
            jornadas,
            hasJornadas,
            formatDate,
            formatTime,
            getTeamName,
            isWinner,
            totalGoals,
            isExpanded,
            toggleExpanded,
            CalendarDays,
            ChevronDown,
            ChevronUp,
            Trophy
        }
    }
})
</script>

<template>
  <section class="space-y-4 lg:space-y-6">
    <UiSectionTitle
        title="Jornadas"
        subtitle="Historial agrupado por día"
    />

    <div
        v-if="errorMessage"
        class="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
    >
      {{ errorMessage }}
    </div>

    <UiAppCard>
      <p
          v-if="loading"
          class="text-sm text-slate-400"
      >
        Cargando jornadas...
      </p>

      <div
          v-else-if="hasJornadas"
          class="space-y-3"
      >
        <div
            v-for="group in jornadas"
            :key="group.dateKey"
            class="rounded-2xl border border-slate-800 bg-slate-950"
        >
          <button
              type="button"
              class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              @click="toggleExpanded(group.dateKey)"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-white">
                {{ formatDate(group.dateKey) }}
              </p>
              <p class="mt-1 text-xs text-slate-400">
                {{ group.matches.length }} partidos · {{ totalGoals(group) }} goles
              </p>
            </div>

            <div class="inline-flex items-center gap-2 text-slate-400">
              <UiAppBadge variant="neutral">
                {{ group.matches.length }}
              </UiAppBadge>
              <component
                  :is="isExpanded(group.dateKey) ? ChevronUp : ChevronDown"
                  class="h-4 w-4"
              />
            </div>
          </button>

          <div
              v-if="isExpanded(group.dateKey)"
              class="space-y-2 border-t border-slate-800 px-3 py-3"
          >
            <div
                v-for="match in group.matches"
                :key="match.id"
            >
              <MatchesMatchDetailsCard
                  :team-a-name="getTeamName(match.team_a_id)"
                  :team-b-name="getTeamName(match.team_b_id)"
                  :score-a="match.team_a_score ?? 0"
                  :score-b="match.team_b_score ?? 0"
                  :is-winner-a="isWinner(match, match.team_a_id)"
                  :is-winner-b="isWinner(match, match.team_b_id)"
                  :time-label="formatTime(match.played_at)"
                  :winner-reason-label="match.winner_reason ?? ''"
                  :winner-name="match.winner_team_id ? getTeamName(match.winner_team_id) : ''"
                  :details="(match.player_match_stats ?? []).filter((s) => (s.goals ?? 0) > 0 || (s.own_goals ?? 0) > 0).map((s) => ({ playerId: s.player_id, playerName: s.players?.name ?? 'Jugador', goals: s.goals ?? 0, ownGoals: s.own_goals ?? 0 }))"
              />
            </div>
          </div>
        </div>
      </div>

      <UiEmptyState
          v-else
          :icon="CalendarDays"
          title="Sin jornadas registradas"
          description="Finaliza partidos para ir construyendo el historial."
      />
    </UiAppCard>
  </section>
</template>
