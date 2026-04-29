<script lang="ts">
import { computed, defineComponent, onMounted, ref } from 'vue'
import { Goal, Medal, Users } from 'lucide-vue-next'

type TeamRow = { id: string; name: string }
type PlayerRow = { id: string; name: string; team_id: string | null; jersey_number: number | null; is_active: boolean }
type StatRow = { match_id: string; player_id: string; goals: number | null; own_goals: number | null }
type VoteRow = { player_id: string; votes: number }

export default defineComponent({
    name: 'PlayersPage',
    components: { Goal, Medal, Users },
    setup() {
        const supabase = useSupabase()
        const loading = ref(false)
        const players = ref<PlayerRow[]>([])
        const teams = ref<TeamRow[]>([])
        const stats = ref<StatRow[]>([])
        const votes = ref<VoteRow[]>([])
        const errorMessage = ref('')
        const teamsMap = computed(() => new Map(teams.value.map((t) => [t.id, t.name])))
        const statsByPlayer = computed(() => {
            const map = new Map<string, { matches: Set<string>; goals: number; ownGoals: number }>()
            stats.value.forEach((row) => {
                const current = map.get(row.player_id) ?? { matches: new Set<string>(), goals: 0, ownGoals: 0 }
                current.matches.add(row.match_id)
                current.goals += row.goals ?? 0
                current.ownGoals += row.own_goals ?? 0
                map.set(row.player_id, current)
            })
            return map
        })
        const votesByPlayer = computed(() => new Map(votes.value.map((v) => [v.player_id, v.votes])))
        const playerRows = computed(() => {
            return players.value.map((p) => {
                const stat = statsByPlayer.value.get(p.id)
                return {
                    ...p,
                    matches: stat ? stat.matches.size : 0,
                    goals: stat ? stat.goals : 0,
                    ownGoals: stat ? stat.ownGoals : 0,
                    mvpVotes: votesByPlayer.value.get(p.id) ?? 0
                }
            })
        })
        const grouped = computed(() => {
            const groups = new Map<string, PlayerRow[]>()
            playerRows.value.forEach((p) => {
                const key = p.team_id ?? 'sin-equipo'
                const list = (groups.get(key) ?? []) as any[]
                list.push(p)
                groups.set(key, list)
            })
            return [...groups.entries()].map(([teamId, rows]) => ({
                teamId,
                teamName: teamsMap.value.get(teamId) ?? 'Sin equipo',
                rows: rows.sort((a, b) => a.name.localeCompare(b.name))
            })).sort((a, b) => a.teamName.localeCompare(b.teamName))
        })
        onMounted(async () => {
            loading.value = true
            const [teamsRes, playersRes] = await Promise.all([
                supabase.from('teams').select('id, name').order('name', { ascending: true }),
                supabase.from('players').select('id, name, team_id, jersey_number, is_active').eq('is_active', true).order('name', { ascending: true })
            ])
            if (teamsRes.error) errorMessage.value = teamsRes.error.message
            if (playersRes.error) errorMessage.value = playersRes.error.message
            teams.value = teamsRes.data ?? []
            players.value = playersRes.data ?? []

            const [statsRes, votesRes] = await Promise.all([
                supabase.from('player_match_stats').select('match_id, player_id, goals, own_goals'),
                supabase.from('jornada_mvp_votes').select('player_id')
            ])
            if (statsRes.error) errorMessage.value = statsRes.error.message
            if (votesRes.error) errorMessage.value = votesRes.error.message
            stats.value = (statsRes.data ?? []) as StatRow[]
            const counts = new Map<string, number>()
            ;(votesRes.data ?? []).forEach((r: { player_id: string }) => {
                counts.set(r.player_id, (counts.get(r.player_id) ?? 0) + 1)
            })
            votes.value = [...counts.entries()].map(([player_id, votes]) => ({ player_id, votes }))

            loading.value = false
        })
        return { loading, grouped, errorMessage, Goal, Medal, Users }
    }
})
</script>

<template>
  <section class="space-y-4">
    <UiSectionTitle title="Jugadores" subtitle="Planteles activos por equipo" />
    <div v-if="errorMessage" class="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{{ errorMessage }}</div>
    <UiAppCard v-if="loading"><p class="text-sm text-slate-400">Cargando jugadores...</p></UiAppCard>
    <UiEmptyState v-else-if="!grouped.length" :icon="Users" title="Sin jugadores activos" description="No hay jugadores para mostrar." />
    <div v-else class="grid gap-3">
      <UiAppCard v-for="group in grouped" :key="group.teamId">
        <h3 class="text-sm font-semibold text-white">{{ group.teamName }}</h3>
        <div class="mt-2 grid gap-2">
          <div v-for="player in group.rows" :key="player.id" class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-slate-100">{{ player.name }}</p>
              <p class="mt-1 text-xs text-slate-500">
                {{ player.matches ?? 0 }} PJ · {{ player.goals ?? 0 }} G · {{ player.ownGoals ?? 0 }} AG · {{ player.mvpVotes ?? 0 }} MVP
              </p>
            </div>
            <UiAppBadge variant="neutral">#{{ player.jersey_number ?? '-' }}</UiAppBadge>
          </div>
        </div>
      </UiAppCard>
    </div>
  </section>
</template>
