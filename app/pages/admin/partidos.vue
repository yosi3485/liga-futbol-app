<script lang="ts">
import { computed, defineComponent, onMounted, ref } from 'vue'
import { ChevronDown, ChevronUp, History, Trophy } from 'lucide-vue-next'

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
  status: string
  winner_team_id: string | null
  winner_reason: string | null
  created_at?: string
}

const PAGE_SIZE = 20
const MATCH_SELECT =
  'id, played_at, team_a_id, team_b_id, team_a_score, team_b_score, status, winner_team_id, winner_reason, created_at'

export default defineComponent({
  name: 'AdminMatchesPage',
  components: {
    ChevronDown,
    ChevronUp,
    History,
    Trophy
  },
  setup() {
    const supabase = useSupabase()
    const loading = ref(false)
    const errorMessage = ref('')

    const teams = ref<TeamRow[]>([])
    const matches = ref<MatchRow[]>([])
    const matchDetails = ref<
      Record<string, Array<{ playerId: string; playerName: string; goals: number; ownGoals: number }>>
    >({})

    const page = ref(1)
    const total = ref(0)
    const expandedIds = ref<string[]>([])

    const teamsMap = computed(() => {
      return new Map(teams.value.map((team) => [team.id, team.name]))
    })

    const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

    function getTeamName(teamId: string | null | undefined) {
      if (!teamId) return 'Equipo'
      return teamsMap.value.get(teamId) ?? 'Equipo'
    }

    function formatMatchDate(value: string) {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return 'Fecha inválida'
      return new Intl.DateTimeFormat('es', {
        day: '2-digit',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit'
      }).format(date)
    }

    function getWinnerReasonLabel(reason: string | null) {
      const labels: Record<string, string> = {
        score: 'Marcador',
        first_goal: 'Primer gol',
        previous_winner: 'Partido anterior',
        manual: 'Definido'
      }
      return reason ? labels[reason] ?? reason : ''
    }

    function getVisualWinnerTeamId(match: MatchRow) {
      if (match.winner_team_id) return match.winner_team_id
      const scoreA = match.team_a_score ?? 0
      const scoreB = match.team_b_score ?? 0
      if (scoreA > scoreB) return match.team_a_id
      if (scoreB > scoreA) return match.team_b_id
      return ''
    }

    function isWinner(match: MatchRow, teamId: string) {
      return getVisualWinnerTeamId(match) === teamId
    }

    function isExpanded(matchId: string) {
      return expandedIds.value.includes(matchId)
    }

    function toggleExpanded(matchId: string) {
      expandedIds.value = isExpanded(matchId)
        ? expandedIds.value.filter((id) => id !== matchId)
        : [...expandedIds.value, matchId]
    }

    async function loadTeams() {
      const { data, error } = await supabase.from('teams').select('id, name').order('name')
      if (error) throw error
      teams.value = data ?? []
    }

    async function loadMatches(nextPage = page.value) {
      loading.value = true
      errorMessage.value = ''

      try {
        const normalizedPage = Math.max(1, nextPage)
        const from = (normalizedPage - 1) * PAGE_SIZE
        const to = from + PAGE_SIZE - 1

        const { data, error, count } = await supabase
          .from('matches')
          .select(MATCH_SELECT, { count: 'exact' })
          .order('played_at', { ascending: false })
          .order('created_at', { ascending: false })
          .range(from, to)

        if (error) throw error

        matches.value = (data ?? []) as MatchRow[]
        total.value = count ?? 0
        page.value = normalizedPage

        const ids = matches.value.map((m) => m.id)
        if (!ids.length) {
          matchDetails.value = {}
          return
        }

        const { data: stats, error: statsError } = await supabase
          .from('player_match_stats')
          .select('match_id, player_id, goals, own_goals, players(name)')
          .in('match_id', ids)

        if (statsError) throw statsError

        const byMatch: Record<
          string,
          Array<{ playerId: string; playerName: string; goals: number; ownGoals: number }>
        > = {}
        ;(
          (stats ?? []) as Array<{
            match_id: string
            player_id: string
            goals: number | null
            own_goals: number | null
            players: { name: string } | null
          }>
        ).forEach((row) => {
          if ((row.goals ?? 0) <= 0 && (row.own_goals ?? 0) <= 0) return
          const list = byMatch[row.match_id] ?? []
          list.push({
            playerId: row.player_id,
            playerName: row.players?.name ?? 'Jugador',
            goals: row.goals ?? 0,
            ownGoals: row.own_goals ?? 0
          })
          byMatch[row.match_id] = list
        })
        matchDetails.value = byMatch
      } catch (error) {
        errorMessage.value =
          error instanceof Error ? error.message : 'Error cargando partidos (admin)'
      } finally {
        loading.value = false
      }
    }

    async function goPrev() {
      if (loading.value || page.value <= 1) return
      await loadMatches(page.value - 1)
    }

    async function goNext() {
      if (loading.value || page.value >= totalPages.value) return
      await loadMatches(page.value + 1)
    }

    onMounted(async () => {
      await loadTeams()
      await loadMatches(1)
    })

    return {
      loading,
      errorMessage,
      matches,
      matchDetails,
      page,
      totalPages,
      total,
      getTeamName,
      formatMatchDate,
      getWinnerReasonLabel,
      isWinner,
      isExpanded,
      toggleExpanded,
      goPrev,
      goNext,
      History,
      ChevronDown,
      ChevronUp,
      Trophy
    }
  }
})
</script>

<template>
  <AdminAdminShell>
    <div class="space-y-4 lg:space-y-6">
      <MatchesNewMatchFlow />

      <UiAppCard>
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h3 class="truncate text-base font-semibold text-white">Historial completo</h3>
            <p class="mt-1 text-sm text-slate-400">Todos los partidos (admin).</p>
          </div>
          <UiAppBadge variant="neutral">{{ total }}</UiAppBadge>
        </div>

        <div
          v-if="errorMessage"
          class="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
        >
          {{ errorMessage }}
        </div>

        <p v-if="loading" class="mt-4 text-sm text-slate-400">Cargando...</p>

        <div v-else class="mt-4 grid gap-2">
          <div v-for="match in matches" :key="match.id" class="rounded-2xl border border-slate-800 bg-slate-950">
            <button
              type="button"
              class="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
              @click="toggleExpanded(match.id)"
            >
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-white">
                  {{ getTeamName(match.team_a_id) }} vs {{ getTeamName(match.team_b_id) }}
                </p>
                <p class="mt-1 text-xs text-slate-400">
                  {{ formatMatchDate(match.played_at) }} · {{ match.status }}
                </p>
              </div>
              <div class="inline-flex items-center gap-2 text-slate-400">
                <UiAppBadge variant="neutral">{{ match.team_a_score ?? 0 }}-{{ match.team_b_score ?? 0 }}</UiAppBadge>
                <component :is="isExpanded(match.id) ? ChevronUp : ChevronDown" class="h-4 w-4" />
              </div>
            </button>

            <div v-if="isExpanded(match.id)" class="border-t border-slate-800 px-3 py-3">
              <MatchesMatchDetailsCard
                :team-a-name="getTeamName(match.team_a_id)"
                :team-b-name="getTeamName(match.team_b_id)"
                :score-a="match.team_a_score ?? 0"
                :score-b="match.team_b_score ?? 0"
                :is-winner-a="isWinner(match, match.team_a_id)"
                :is-winner-b="isWinner(match, match.team_b_id)"
                :time-label="formatMatchDate(match.played_at)"
                :winner-reason-label="getWinnerReasonLabel(match.winner_reason)"
                :winner-name="match.winner_team_id ? getTeamName(match.winner_team_id) : ''"
                :details="matchDetails[match.id] ?? []"
              />
            </div>
          </div>
        </div>

        <div
          v-if="totalPages > 1"
          class="mt-4 flex items-center justify-between gap-3 border-t border-slate-800 pt-4"
        >
          <button
            type="button"
            class="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold leading-none text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="loading || page <= 1"
            @click="goPrev"
          >
            Anterior
          </button>

          <p class="text-center text-xs font-semibold text-slate-400">{{ page }} / {{ totalPages }}</p>

          <button
            type="button"
            class="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold leading-none text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="loading || page >= totalPages"
            @click="goNext"
          >
            Siguiente
          </button>
        </div>
      </UiAppCard>
    </div>
  </AdminAdminShell>
</template>
