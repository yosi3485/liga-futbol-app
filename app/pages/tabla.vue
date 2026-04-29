<script lang="ts">
import { computed, defineComponent, onMounted, ref } from 'vue'
import { ListOrdered, Swords, Trophy } from 'lucide-vue-next'
import { useStandings, type StandingRow } from '../composables/useStandings'

type TeamRow = { id: string; name: string }
type MatchRow = {
    id: string
    played_at: string
    team_a_id: string
    team_b_id: string
    team_a_score: number | null
    team_b_score: number | null
    status: string
}
export default defineComponent({
    name: 'TablaPage',
    components: { ListOrdered, Swords, Trophy },
    setup() {
        const supabase = useSupabase()
        const loading = ref(false)
        const errorMessage = ref('')
        const teams = ref<TeamRow[]>([])
        const matches = ref<MatchRow[]>([])
        const filterTeamId = ref('')
        const filterDateFrom = ref('')
        const filterDateTo = ref('')
        const h2hTeamAId = ref('')
        const h2hTeamBId = ref('')

        const filteredMatches = computed(() => {
            return matches.value.filter((match) => {
                if (filterTeamId.value) {
                    const hasTeam =
                        match.team_a_id === filterTeamId.value || match.team_b_id === filterTeamId.value
                    if (!hasTeam) return false
                }
                if (filterDateFrom.value && match.played_at < `${filterDateFrom.value}T00:00:00`) {
                    return false
                }
                if (filterDateTo.value && match.played_at > `${filterDateTo.value}T23:59:59`) {
                    return false
                }
                return true
            })
        })

        const standings = computed(() => useStandings(teams.value, filteredMatches.value))

        const leader = computed(() => standings.value.find((row) => row.pj > 0) ?? null)
        const bestAttack = computed(() => standings.value.reduce<StandingRow | null>((best, row) => {
            if (row.pj === 0) return best
            if (!best) return row
            return row.gf > best.gf ? row : best
        }, null))
        const bestDefense = computed(() => standings.value.reduce<StandingRow | null>((best, row) => {
            if (row.pj === 0) return best
            if (!best) return row
            return row.gc < best.gc ? row : best
        }, null))

        const h2hMatches = computed(() => {
            if (!h2hTeamAId.value || !h2hTeamBId.value || h2hTeamAId.value === h2hTeamBId.value) return []
            return matches.value.filter((match) => {
                const direct =
                    (match.team_a_id === h2hTeamAId.value && match.team_b_id === h2hTeamBId.value) ||
                    (match.team_a_id === h2hTeamBId.value && match.team_b_id === h2hTeamAId.value)
                return direct
            })
        })

        const h2hSummary = computed(() => {
            const summary = { aWins: 0, bWins: 0, draws: 0, last: null as MatchRow | null }
            h2hMatches.value.forEach((match) => {
                const aIsHome = match.team_a_id === h2hTeamAId.value
                const scoreA = (aIsHome ? match.team_a_score : match.team_b_score) ?? 0
                const scoreB = (aIsHome ? match.team_b_score : match.team_a_score) ?? 0
                if (scoreA > scoreB) summary.aWins += 1
                else if (scoreB > scoreA) summary.bWins += 1
                else summary.draws += 1
            })
            summary.last = h2hMatches.value[0] ?? null
            return summary
        })

        const hasStandings = computed(() => standings.value.some((row) => row.pj > 0))
        const teamOptions = computed(() => teams.value)

        function teamNameById(teamId: string) {
            return teams.value.find((team) => team.id === teamId)?.name ?? 'Equipo'
        }

        function formatDate(value: string) {
            return new Intl.DateTimeFormat('es', { day: '2-digit', month: 'short' }).format(new Date(value))
        }

        function formatForm(form: StandingRow['form']) {
            return form.length ? form.join(' ') : '-'
        }

        function exportCsv() {
            const headers = ['Pos', 'Equipo', 'PJ', 'G', 'P', 'GF', 'GC', 'DG', 'PTS', 'Forma5']
            const rows = standings.value.map((row, index) => [
                index + 1,
                row.teamName,
                row.pj,
                row.g,
                row.p,
                row.gf,
                row.gc,
                row.dg,
                row.pts,
                formatForm(row.form)
            ])
            const csv = [headers, ...rows]
                .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
                .join('\n')
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            const date = new Date().toISOString().slice(0, 10)
            link.href = url
            link.download = `tabla-${date}.csv`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
        }

        async function loadData() {
            loading.value = true
            errorMessage.value = ''
            try {
                const [teamsResponse, matchesResponse] = await Promise.all([
                    supabase.from('teams').select('id, name').order('name', { ascending: true }),
                    supabase
                        .from('matches')
                        .select('id, played_at, team_a_id, team_b_id, team_a_score, team_b_score, status')
                        .eq('status', 'finished')
                        .order('played_at', { ascending: false })
                        .order('created_at', { ascending: false })
                ])
                if (teamsResponse.error) throw teamsResponse.error
                if (matchesResponse.error) throw matchesResponse.error
                teams.value = teamsResponse.data ?? []
                matches.value = matchesResponse.data ?? []
                if (!h2hTeamAId.value) h2hTeamAId.value = teams.value[0]?.id ?? ''
                if (!h2hTeamBId.value) h2hTeamBId.value = teams.value[1]?.id ?? ''
            } catch (error) {
                errorMessage.value = error instanceof Error ? error.message : 'Error cargando tabla'
            } finally {
                loading.value = false
            }
        }

        onMounted(loadData)

        return {
            loading, errorMessage, filterTeamId, filterDateFrom, filterDateTo, h2hTeamAId, h2hTeamBId,
            standings, hasStandings, leader, bestAttack, bestDefense, h2hMatches, h2hSummary, teamOptions,
            teamNameById, formatDate, formatForm, exportCsv, ListOrdered, Swords, Trophy
        }
    }
})
</script>

<template>
  <section class="space-y-4 lg:space-y-6">
    <UiSectionTitle title="Tabla" subtitle="Standings, filtros y head-to-head" />

    <div v-if="errorMessage" class="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
      {{ errorMessage }}
    </div>

    <div class="grid gap-3 md:grid-cols-3">
      <UiStatCard label="Líder" :value="leader ? leader.teamName : 'Sin datos'" :subtitle="leader ? `${leader.pts} pts` : ''" :icon="Trophy" />
      <UiStatCard label="Mejor ataque" :value="bestAttack ? bestAttack.teamName : 'Sin datos'" :subtitle="bestAttack ? `${bestAttack.gf} GF` : ''" :icon="ListOrdered" />
      <UiStatCard label="Mejor defensa" :value="bestDefense ? bestDefense.teamName : 'Sin datos'" :subtitle="bestDefense ? `${bestDefense.gc} GC` : ''" :icon="Swords" />
    </div>

    <UiAppCard>
      <div class="grid gap-3 lg:grid-cols-3">
        <UiAppSelect v-model="filterTeamId" label="Equipo">
          <option value="">Todos</option>
          <option v-for="team in teamOptions" :key="team.id" :value="team.id">{{ team.name }}</option>
        </UiAppSelect>
        <UiAppInput v-model="filterDateFrom" label="Desde" type="date" />
        <UiAppInput v-model="filterDateTo" label="Hasta" type="date" />
      </div>
    </UiAppCard>

    <UiAppCard>
      <div class="flex justify-end">
        <UiAppButton variant="secondary" @click="exportCsv">Exportar CSV</UiAppButton>
      </div>
      <p v-if="loading" class="text-sm text-slate-400">Cargando tabla...</p>
      <div v-else-if="hasStandings" class="space-y-2">
        <div class="hidden grid-cols-[2rem_minmax(180px,1fr)_repeat(8,minmax(2.2rem,1fr))] items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400 lg:grid">
          <span>#</span><span class="text-left">Equipo</span><span>PJ</span><span>G</span><span>P</span><span>GF</span><span>GC</span><span>DG</span><span>PTS</span><span>Forma</span>
        </div>
        <div v-for="(row, index) in standings" :key="row.teamId" class="rounded-2xl border border-slate-800 bg-slate-950 p-3">
          <div class="flex items-center justify-between">
            <p class="truncate text-sm font-semibold text-white">{{ index + 1 }}. {{ row.teamName }}</p>
            <UiAppBadge variant="neutral">{{ row.pts }} pts</UiAppBadge>
          </div>
          <div class="mt-2 grid grid-cols-4 gap-2 text-center text-xs lg:hidden">
            <div class="rounded-lg bg-slate-900 p-2"><p class="text-slate-400">PJ</p><p class="font-semibold text-white">{{ row.pj }}</p></div>
            <div class="rounded-lg bg-slate-900 p-2"><p class="text-slate-400">G</p><p class="font-semibold text-white">{{ row.g }}</p></div>
            <div class="rounded-lg bg-slate-900 p-2"><p class="text-slate-400">P</p><p class="font-semibold text-white">{{ row.p }}</p></div>
            <div class="rounded-lg bg-slate-900 p-2"><p class="text-slate-400">DG</p><p class="font-semibold text-white">{{ row.dg }}</p></div>
          </div>
          <div class="hidden grid-cols-[2rem_minmax(180px,1fr)_repeat(8,minmax(2.2rem,1fr))] items-center gap-2 px-1 py-1 text-center text-sm lg:grid">
            <span class="font-semibold text-slate-300">{{ index + 1 }}</span>
            <span class="truncate text-left font-semibold text-white">{{ row.teamName }}</span>
            <span class="text-slate-300">{{ row.pj }}</span><span class="text-slate-300">{{ row.g }}</span><span class="text-slate-300">{{ row.p }}</span>
            <span class="text-slate-300">{{ row.gf }}</span><span class="text-slate-300">{{ row.gc }}</span><span class="text-slate-300">{{ row.dg }}</span>
            <span class="font-bold text-white">{{ row.pts }}</span>
            <span class="text-slate-300">{{ formatForm(row.form) }}</span>
          </div>
          <p class="mt-2 text-xs text-slate-400 lg:hidden">Forma reciente: {{ formatForm(row.form) }}</p>
        </div>
      </div>
      <UiEmptyState v-else :icon="ListOrdered" title="Sin partidos finalizados" description="Finaliza partidos para construir la tabla general." />
    </UiAppCard>

    <UiAppCard>
      <div class="grid gap-3 md:grid-cols-2">
        <UiAppSelect v-model="h2hTeamAId" label="Equipo A">
          <option value="">Selecciona</option>
          <option v-for="team in teamOptions" :key="`a-${team.id}`" :value="team.id">{{ team.name }}</option>
        </UiAppSelect>
        <UiAppSelect v-model="h2hTeamBId" label="Equipo B">
          <option value="">Selecciona</option>
          <option v-for="team in teamOptions" :key="`b-${team.id}`" :value="team.id">{{ team.name }}</option>
        </UiAppSelect>
      </div>

      <div v-if="h2hTeamAId && h2hTeamBId && h2hTeamAId !== h2hTeamBId" class="space-y-3">
        <div class="grid gap-3 md:grid-cols-3">
          <UiStatCard label="Victorias A" :value="h2hSummary.aWins" :subtitle="teamNameById(h2hTeamAId)" />
          <UiStatCard label="Empates" :value="h2hSummary.draws" subtitle="Entre ambos" />
          <UiStatCard label="Victorias B" :value="h2hSummary.bWins" :subtitle="teamNameById(h2hTeamBId)" />
        </div>
        <div v-if="h2hSummary.last" class="rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-300">
          Último duelo: {{ teamNameById(h2hSummary.last.team_a_id) }} {{ h2hSummary.last.team_a_score ?? 0 }} - {{ h2hSummary.last.team_b_score ?? 0 }} {{ teamNameById(h2hSummary.last.team_b_id) }} · {{ formatDate(h2hSummary.last.played_at) }}
        </div>
      </div>
      <UiEmptyState v-else :icon="Swords" title="Head-to-head" description="Selecciona dos equipos para comparar su historial." />
    </UiAppCard>
  </section>
</template>
