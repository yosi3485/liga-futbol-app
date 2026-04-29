<script lang="ts">
import { computed, defineComponent, onMounted, ref } from 'vue'
import { Goal, ShieldCheck, Trophy, Play, CalendarDays, Medal } from 'lucide-vue-next'
import { useStandings } from '../composables/useStandings'

type TeamRow = { id: string; name: string }
type MatchRow = {
    id?: string
    played_at: string
    team_a_id: string
    team_b_id: string
    team_a_score: number | null
    team_b_score: number | null
    winner_team_id: string | null
    status?: string
}
type ScorerRow = { player_id: string; goals: number | null; players: { name: string } | null }

export default defineComponent({
    name: 'HomePage',
    components: { Goal, ShieldCheck, Trophy, Play, CalendarDays, Medal },
    setup() {
        const supabase = useSupabase()
        const teams = ref<TeamRow[]>([])
        const matches = ref<MatchRow[]>([])
        const topScorer = ref<ScorerRow | null>(null)
        const needsMvpVote = ref(false)
        const mvpJornadaDate = ref('')
        const mvpWinnerTeamName = ref('')
        const inProgressMatch = ref<MatchRow | null>(null)
        const todayJornadaStatus = ref<{ is_closed: boolean } | null>(null)
        const todayAttendanceCount = ref(0)
        const latestJornadaMvp = ref<{ name: string; votes: number } | null>(null)

        const teamsMap = computed(() => new Map(teams.value.map((team) => [team.id, team.name])))
        const standings = computed(() => useStandings(teams.value, matches.value))
        const leaderName = computed(() => standings.value[0]?.teamName ?? 'Sin datos')
        const lastMatchLabel = computed(() => {
            const match = matches.value[0]
            if (!match) return 'Pendiente'
            return `${teamsMap.value.get(match.team_a_id) ?? 'Equipo'} ${match.team_a_score ?? 0} - ${match.team_b_score ?? 0} ${teamsMap.value.get(match.team_b_id) ?? 'Equipo'}`
        })
        const topScorerLabel = computed(() => {
            if (!topScorer.value) return '0 goles'
            return `${topScorer.value.players?.name ?? 'Jugador'} · ${topScorer.value.goals ?? 0}`
        })
        const inProgressLabel = computed(() => {
            if (!inProgressMatch.value) return 'Ninguno'
            const match = inProgressMatch.value
            const a = teamsMap.value.get(match.team_a_id) ?? 'Equipo'
            const b = teamsMap.value.get(match.team_b_id) ?? 'Equipo'
            return `${a} ${match.team_a_score ?? 0} - ${match.team_b_score ?? 0} ${b}`
        })
        const todayKey = computed(() => new Date().toISOString().slice(0, 10))
        const jornadaTodayValue = computed(() => {
            if (!todayJornadaStatus.value) return 'Sin definir'
            return todayJornadaStatus.value.is_closed ? 'Cerrada' : 'Abierta'
        })
        const jornadaTodaySubtitle = computed(() => {
            return `${todayKey.value} · ${todayAttendanceCount.value} presentes`
        })

        async function loadData() {
            const [teamsResponse, matchesResponse, scorerResponse, inProgressRes] = await Promise.all([
                supabase.from('teams').select('id, name').order('name', { ascending: true }),
                supabase
                    .from('matches')
                    .select('played_at, team_a_id, team_b_id, team_a_score, team_b_score, winner_team_id')
                    .eq('status', 'finished')
                    .order('played_at', { ascending: false })
                    .order('created_at', { ascending: false })
                    .limit(20),
                supabase
                    .from('player_match_stats')
                    .select('player_id, goals, players(name)')
                    .gt('goals', 0)
                    .order('goals', { ascending: false })
                    .limit(1),
                supabase
                    .from('matches')
                    .select('id, played_at, team_a_id, team_b_id, team_a_score, team_b_score, winner_team_id, status')
                    .eq('status', 'in_progress')
                    .order('played_at', { ascending: false })
                    .order('created_at', { ascending: false })
                    .limit(1)
            ])

            teams.value = teamsResponse.data ?? []
            matches.value = matchesResponse.data ?? []
            topScorer.value = (scorerResponse.data?.[0] as ScorerRow | undefined) ?? null
            inProgressMatch.value = (inProgressRes.data?.[0] as MatchRow | undefined) ?? null

            // Jornada de hoy (estado + asistencia)
            const today = todayKey.value
            const [jornadaStatusRes, jornadaAttendanceRes] = await Promise.all([
                supabase.from('jornada_status').select('is_closed').eq('jornada_date', today).maybeSingle(),
                supabase.from('jornada_attendance').select('id', { count: 'exact', head: true }).eq('jornada_date', today)
            ])
            todayJornadaStatus.value = (jornadaStatusRes.data ?? null) as { is_closed: boolean } | null
            todayAttendanceCount.value = jornadaAttendanceRes.count ?? 0

            // MVP reminder: only for users who participated in the previous jornada and haven't voted.
            needsMvpVote.value = false
            mvpJornadaDate.value = ''
            mvpWinnerTeamName.value = ''

            const latestMatch = matches.value[0]
            if (!latestMatch) return

            const jornadaDate = latestMatch.played_at.slice(0, 10)
            mvpJornadaDate.value = jornadaDate
            if (latestMatch.winner_team_id) {
                mvpWinnerTeamName.value = teamsMap.value.get(latestMatch.winner_team_id) ?? ''
            }

            const { data: authRes } = await supabase.auth.getUser()
            const userId = authRes.user?.id
            if (!userId) return

            const { data: profile } = await supabase
                .from('profiles')
                .select('role, player_id')
                .eq('id', userId)
                .maybeSingle()

            const playerId = profile?.player_id
            if (!playerId) return

            const [attendanceRes, voteRes] = await Promise.all([
                supabase.from('jornada_attendance').select('player_id').eq('jornada_date', jornadaDate),
                supabase
                    .from('jornada_mvp_votes')
                    .select('id')
                    .eq('jornada_date', jornadaDate)
                    .eq('voter_key', String(playerId))
                    .maybeSingle()
            ])

            const attended = (attendanceRes.data ?? []).some(
                (r: { player_id: string }) => r.player_id === playerId
            )
            needsMvpVote.value = attended && !voteRes.data

            // MVP result for latest jornada (public)
            const { data: votesData } = await supabase
                .from('jornada_mvp_votes')
                .select('player_id, players(name)')
                .eq('jornada_date', jornadaDate)
            const counts = new Map<string, { name: string; votes: number }>()
            ;(
                (votesData ?? []) as Array<{ player_id: string; players: { name: string } | null }>
            ).forEach((row) => {
                const name = row.players?.name ?? 'Jugador'
                const current = counts.get(row.player_id) ?? { name, votes: 0 }
                counts.set(row.player_id, { ...current, votes: current.votes + 1 })
            })
            latestJornadaMvp.value = [...counts.values()].sort((a, b) => b.votes - a.votes)[0] ?? null
        }

        onMounted(loadData)

        return {
            leaderName,
            lastMatchLabel,
            topScorerLabel,
            inProgressLabel,
            inProgressMatch,
            jornadaTodayValue,
            jornadaTodaySubtitle,
            latestJornadaMvp,
            needsMvpVote,
            mvpJornadaDate,
            mvpWinnerTeamName,
            Goal,
            ShieldCheck,
            Trophy,
            Play
            ,CalendarDays
            ,Medal
        }
    }
})
</script>

<template>
  <section class="space-y-4">
    <UiSectionTitle title="Inicio" subtitle="Resumen rápido de la liga" />

    <NuxtLink
        v-if="needsMvpVote"
        to="/mvp"
        class="block rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm font-semibold text-amber-200"
    >
      Votar MVP ({{ mvpJornadaDate }}{{ mvpWinnerTeamName ? ` · ${mvpWinnerTeamName}` : '' }})
    </NuxtLink>

    <div class="grid gap-3">
      <UiStatCard label="Líder actual" :value="leaderName" subtitle="Tabla general en tiempo real" :icon="Trophy" />
      <UiStatCard label="Jornada hoy" :value="jornadaTodayValue" :subtitle="jornadaTodaySubtitle" :icon="CalendarDays" />
      <UiStatCard label="Último partido" :value="lastMatchLabel" subtitle="Marcador más reciente" :icon="ShieldCheck" />
      <UiStatCard label="Goleador" :value="topScorerLabel" subtitle="Líder de goles de la liga" :icon="Goal" />
      <UiStatCard
          v-if="latestJornadaMvp"
          label="MVP (última jornada)"
          :value="latestJornadaMvp.name"
          :subtitle="`${latestJornadaMvp.votes} votos`"
          :icon="Medal"
      />
      <NuxtLink
          v-if="inProgressMatch"
          to="/admin/partidos"
          class="block"
      >
        <UiStatCard label="Partido en progreso" :value="inProgressLabel" subtitle="Continua el marcador" :icon="Play" />
      </NuxtLink>
    </div>
  </section>
</template>
