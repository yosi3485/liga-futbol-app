<script lang="ts">
import { computed, defineComponent, onMounted, ref } from 'vue'
import { CalendarDays, Medal, ShieldAlert } from 'lucide-vue-next'

type MatchRow = {
    id: string
    played_at: string
    status: string
    team_a_score: number | null
    team_b_score: number | null
    winner_team_id: string | null
    winner_reason: string | null
    team_a_id: string
    team_b_id: string
}

type VoteRow = {
    jornada_date: string
    player_id: string
    players: { name: string } | null
}

export default defineComponent({
    name: 'AdminDashboardPage',
    components: { CalendarDays, Medal, ShieldAlert },
    setup() {
        const supabase = useSupabase()
        const { message: appError } = useAppError()
        const loading = ref(false)
        const errorMessage = ref('')
        const matches = ref<MatchRow[]>([])
        const votes = ref<VoteRow[]>([])
        const resetting = ref(false)
        const teams = ref<Array<{ id: string; name: string }>>([])
        const jornadaStatus = ref<{ jornada_date: string; is_closed: boolean } | null>(null)

        const inProgressMatches = computed(() => matches.value.filter((m) => m.status === 'in_progress'))
        const teamsMap = computed(() => new Map(teams.value.map((t) => [t.id, t.name])))
        const openJornadaLabel = computed(() => {
            if (!jornadaStatus.value) return 'Sin datos'
            return jornadaStatus.value.is_closed ? `${jornadaStatus.value.jornada_date} (cerrada)` : `${jornadaStatus.value.jornada_date} (abierta)`
        })

        const votesByJornada = computed(() => {
            const grouped = new Map<string, number>()
            votes.value.forEach((vote) => {
                grouped.set(vote.jornada_date, (grouped.get(vote.jornada_date) ?? 0) + 1)
            })
            return [...grouped.entries()]
                .map(([jornada, count]) => ({ jornada, count }))
                .sort((a, b) => b.jornada.localeCompare(a.jornada))
        })

        const mvpRanking = computed(() => {
            const grouped = new Map<string, { name: string; wins: number }>()
            votes.value.forEach((vote) => {
                const playerName = vote.players?.name ?? 'Jugador'
                const current = grouped.get(vote.player_id) ?? { name: playerName, wins: 0 }
                grouped.set(vote.player_id, { ...current, wins: current.wins + 1 })
            })
            return [...grouped.values()].sort((a, b) => b.wins - a.wins).slice(0, 10)
        })

        const totalIssues = computed(() => {
            return (
                scorelessWithoutReason.value.length +
                finishedWithoutWinner.value.length +
                inactivePlayersInAttendance.value.length
            )
        })

        async function loadData() {
            loading.value = true
            errorMessage.value = ''

            try {
                const today = new Date().toISOString().slice(0, 10)
                const [matchesRes, votesRes, teamsRes, jornadaRes] = await Promise.all([
                    supabase
                        .from('matches')
                        .select('id, played_at, status, team_a_id, team_b_id, team_a_score, team_b_score, winner_team_id, winner_reason')
                        .order('played_at', { ascending: false })
                        .limit(500),
                    supabase
                        .from('jornada_mvp_votes')
                        .select('jornada_date, player_id, players(name)')
                        .order('jornada_date', { ascending: false })
                        .limit(1000)
                    ,
                    supabase.from('teams').select('id, name').order('name', { ascending: true }),
                    supabase.from('jornada_status').select('jornada_date, is_closed').eq('jornada_date', today).maybeSingle()
                ])

                if (matchesRes.error) throw matchesRes.error
                if (votesRes.error) throw votesRes.error
                if (teamsRes.error) throw teamsRes.error
                if (jornadaRes.error) throw jornadaRes.error

                matches.value = (matchesRes.data ?? []) as MatchRow[]
                votes.value = (votesRes.data ?? []) as VoteRow[]
                teams.value = (teamsRes.data ?? []) as Array<{ id: string; name: string }>
                jornadaStatus.value = (jornadaRes.data ?? null) as { jornada_date: string; is_closed: boolean } | null
            } catch (error) {
                errorMessage.value = appError(error, 'Error cargando dashboard')
            } finally {
                loading.value = false
            }
        }

        async function resetMatches() {
            resetting.value = true
            errorMessage.value = ''
            try {
                await supabase.from('player_match_stats').delete().not('id', 'is', null)
                await supabase.from('match_players').delete().not('id', 'is', null)
                await supabase.from('match_attendance').delete().not('id', 'is', null)
                await supabase.from('matches').delete().not('id', 'is', null)
                await supabase.from('jornada_mvp_votes').delete().not('id', 'is', null)
                await loadData()
            } catch (error) {
                errorMessage.value = appError(error, 'Error limpiando partidos')
            } finally {
                resetting.value = false
            }
        }

        async function resetPlayersAndMatches() {
            resetting.value = true
            errorMessage.value = ''
            try {
                await supabase.from('player_match_stats').delete().not('id', 'is', null)
                await supabase.from('match_players').delete().not('id', 'is', null)
                await supabase.from('match_attendance').delete().not('id', 'is', null)
                await supabase.from('jornada_attendance').delete().not('id', 'is', null)
                await supabase.from('jornada_mvp_votes').delete().not('id', 'is', null)
                await supabase.from('matches').delete().not('id', 'is', null)
                await supabase.from('players').delete().not('id', 'is', null)
                await loadData()
            } catch (error) {
                errorMessage.value = appError(error, 'Error limpiando jugadores/partidos')
            } finally {
                resetting.value = false
            }
        }

        onMounted(loadData)

        return {
            loading,
            errorMessage,
            inProgressMatches,
            teamsMap,
            openJornadaLabel,
            votesByJornada,
            mvpRanking,
            Medal,
            ShieldAlert,
            CalendarDays,
            resetMatches,
            resetPlayersAndMatches,
            resetting
        }
    }
})
</script>

<template>
  <AdminAdminShell>
    <div class="space-y-4 lg:space-y-6">
      <div v-if="errorMessage" class="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
        {{ errorMessage }}
      </div>

      <div class="grid gap-3 md:grid-cols-3">
        <UiStatCard label="Partidos en progreso" :value="inProgressMatches.length" subtitle="Debe ser 0 al cerrar" :icon="ShieldAlert" />
        <UiStatCard label="Jornada hoy" :value="openJornadaLabel" subtitle="Estado actual" :icon="CalendarDays" />
        <UiStatCard label="Votos MVP (20 jornadas)" :value="votesByJornada.length" subtitle="Historial" :icon="Medal" />
      </div>

      <UiAppCard>
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="text-base font-semibold text-white">Acciones rápidas</h3>
            <p class="mt-1 text-sm text-slate-400">Estado real de la noche</p>
          </div>
          <UiAppBadge variant="neutral">{{ inProgressMatches.length }}</UiAppBadge>
        </div>

        <p v-if="loading" class="text-sm text-slate-400">Cargando estado...</p>

        <div v-else class="space-y-3">
          <div class="rounded-xl border border-slate-800 bg-slate-950 p-3">
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm font-semibold text-white">Partidos en progreso</p>
              <NuxtLink to="/admin/partidos" class="text-xs font-semibold text-emerald-300">Ir</NuxtLink>
            </div>
            <p v-if="!inProgressMatches.length" class="mt-1 text-xs text-slate-400">Ninguno</p>
            <ul v-else class="mt-2 space-y-1 text-xs text-slate-500">
              <li v-for="match in inProgressMatches.slice(0, 5)" :key="match.id">
                {{ match.played_at.slice(0, 10) }} · {{ teamsMap.get(match.team_a_id) ?? 'Equipo' }} vs {{ teamsMap.get(match.team_b_id) ?? 'Equipo' }}
              </li>
            </ul>
          </div>
        </div>
      </UiAppCard>

      <UiAppCard>
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="text-base font-semibold text-white">MVP por jornada</h3>
            <p class="mt-1 text-sm text-slate-400">Cantidad de votos por día</p>
          </div>
          <UiAppBadge variant="neutral">{{ votesByJornada.length }}</UiAppBadge>
        </div>

        <div class="grid gap-2">
          <div
              v-for="row in votesByJornada.slice(0, 20)"
              :key="row.jornada"
              class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2"
          >
            <p class="text-sm font-semibold text-white">{{ row.jornada }}</p>
            <UiAppBadge variant="neutral">{{ row.count }} votos</UiAppBadge>
          </div>
        </div>
      </UiAppCard>

      <UiAppCard>
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="text-base font-semibold text-white">Ranking histórico MVP</h3>
            <p class="mt-1 text-sm text-slate-400">Top jugadores por votos</p>
          </div>
          <UiAppBadge variant="neutral">{{ mvpRanking.length }}</UiAppBadge>
        </div>

        <div class="grid gap-2">
          <div
              v-for="(row, index) in mvpRanking"
              :key="`${row.name}-${index}`"
              class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2"
          >
            <p class="text-sm font-semibold text-white">{{ index + 1 }}. {{ row.name }}</p>
            <span class="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300">
              <Medal class="h-3.5 w-3.5" />
              {{ row.wins }}
            </span>
          </div>
        </div>
      </UiAppCard>

      <UiAppCard>
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="text-base font-semibold text-white">Reseteo de pruebas</h3>
            <p class="mt-1 text-sm text-slate-400">Limpia datos para comenzar de cero</p>
          </div>
        </div>
        <div class="mt-3 grid gap-2 md:grid-cols-2">
          <UiAppButton variant="secondary" :disabled="resetting" @click="resetMatches">
            {{ resetting ? 'Procesando...' : 'Borrar partidos y votos MVP' }}
          </UiAppButton>
          <UiAppButton variant="danger" :disabled="resetting" @click="resetPlayersAndMatches">
            {{ resetting ? 'Procesando...' : 'Borrar jugadores y todo lo relacionado' }}
          </UiAppButton>
        </div>
      </UiAppCard>
    </div>
  </AdminAdminShell>
</template>
