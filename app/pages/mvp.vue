<script lang="ts">
import { computed, defineComponent, onMounted, ref } from 'vue'
import { Medal } from 'lucide-vue-next'

type PlayerRow = { id: string; name: string; team_id: string | null; is_active: boolean; email: string | null }
type TeamRow = { id: string; name: string }
type MatchRow = { played_at: string; winner_team_id: string | null }

export default defineComponent({
    name: 'MvpPage',
    components: { Medal },
    setup() {
        const supabase = useSupabase()
        const loading = ref(false)
        const saving = ref(false)
        const errorMessage = ref('')
        const successMessage = ref('')
        const teams = ref<TeamRow[]>([])
        const players = ref<PlayerRow[]>([])
        const previousJornada = ref('')
        const hasVoted = ref(false)
        const winnerTeamId = ref('')
        const eligiblePlayerIds = ref<string[]>([])
        const votersIds = ref<string[]>([])
        const jornadaRanking = ref<Array<{ playerId: string; name: string; votes: number }>>([])
        const authEmail = ref('')
        const loggedPlayerId = ref('')
        const loggedPlayerName = ref('')

        const teamsMap = computed(() => new Map(teams.value.map((t) => [t.id, t.name])))
        const candidates = computed(() => players.value.filter((p) => eligiblePlayerIds.value.includes(p.id) && p.id !== loggedPlayerId.value).sort((a, b) => a.name.localeCompare(b.name)))
        const canVote = computed(() => Boolean(loggedPlayerId.value && previousJornada.value && votersIds.value.includes(loggedPlayerId.value) && !hasVoted.value))

        async function resolveLoggedPlayer() {
            const { data: authRes } = await supabase.auth.getUser()
            const email = authRes.user?.email?.trim().toLowerCase() ?? ''
            authEmail.value = email
            if (!email) {
                loggedPlayerId.value = ''
                loggedPlayerName.value = ''
                return
            }
            const userId = authRes.user?.id ?? ''
            const { data: profile } = await supabase
                .from('profiles')
                .select('player_id')
                .eq('id', userId)
                .maybeSingle()
            if (!profile?.player_id) {
                loggedPlayerId.value = ''
                loggedPlayerName.value = ''
                return
            }
            const { data: playerById } = await supabase.from('players').select('id, name').eq('id', profile.player_id).maybeSingle()
            loggedPlayerId.value = playerById?.id ?? ''
            loggedPlayerName.value = playerById?.name ?? ''
        }

        async function loadEligibility() {
            loading.value = true
            errorMessage.value = ''
            await resolveLoggedPlayer()
            const [teamsRes, playersRes, matchesRes] = await Promise.all([
                supabase.from('teams').select('id, name').order('name', { ascending: true }),
                supabase.from('players').select('id, name, team_id, is_active, email').eq('is_active', true),
                supabase.from('matches').select('played_at, winner_team_id').eq('status', 'finished').order('played_at', { ascending: false }).order('created_at', { ascending: false }).limit(50)
            ])
            if (teamsRes.error) throw teamsRes.error
            if (playersRes.error) throw playersRes.error
            if (matchesRes.error) throw matchesRes.error
            teams.value = teamsRes.data ?? []
            players.value = playersRes.data ?? []
            const list = (matchesRes.data ?? []) as MatchRow[]
            previousJornada.value = list[0]?.played_at?.slice(0, 10) ?? ''
            winnerTeamId.value = list[0]?.winner_team_id ?? ''
            if (!previousJornada.value || !winnerTeamId.value) return

            const [attendanceRes, votesRes, allVotesRes] = await Promise.all([
                supabase.from('jornada_attendance').select('player_id').eq('jornada_date', previousJornada.value),
                loggedPlayerId.value
                    ? supabase.from('jornada_mvp_votes').select('id').eq('jornada_date', previousJornada.value).eq('voter_key', String(loggedPlayerId.value)).maybeSingle()
                    : Promise.resolve({ data: null, error: null }),
                supabase.from('jornada_mvp_votes').select('player_id').eq('jornada_date', previousJornada.value)
            ])
            if (attendanceRes.error) throw attendanceRes.error
            if ((votesRes as { error: unknown }).error) throw (votesRes as { error: unknown }).error
            if (allVotesRes.error) throw allVotesRes.error

            const attendanceIds = (attendanceRes.data ?? []).map((r: { player_id: string }) => r.player_id)
            votersIds.value = attendanceIds
            // Candidates must:
            // - have attended the jornada
            // - belong to the winner team base roster (no cross-team voting for now)
            eligiblePlayerIds.value = players.value
                .filter((p) => p.team_id === winnerTeamId.value && attendanceIds.includes(p.id))
                .map((p) => p.id)
            hasVoted.value = Boolean((votesRes as { data: unknown }).data)

            const counts = new Map<string, number>()
            ;(allVotesRes.data ?? []).forEach((row: { player_id: string }) => counts.set(row.player_id, (counts.get(row.player_id) ?? 0) + 1))
            jornadaRanking.value = [...counts.entries()].map(([playerId, votes]) => ({ playerId, votes, name: players.value.find((p) => p.id === playerId)?.name ?? 'Jugador' })).sort((a, b) => b.votes - a.votes)
        }

        async function voteMvp(playerId: string) {
            if (!loggedPlayerId.value || !canVote.value) return
            saving.value = true
            errorMessage.value = ''
            successMessage.value = ''
            try {
                if (playerId === loggedPlayerId.value) {
                    throw new Error('No puedes votarte a ti mismo.')
                }
                const { error } = await supabase.from('jornada_mvp_votes').insert({
                    jornada_date: previousJornada.value,
                    player_id: playerId,
                    voter_key: String(loggedPlayerId.value)
                })
                if (error) throw error
                hasVoted.value = true
                successMessage.value = 'Voto MVP registrado.'
                await loadEligibility()
            } catch (error) {
                errorMessage.value = error instanceof Error ? error.message : 'Error guardando voto MVP'
            } finally {
                saving.value = false
            }
        }

        onMounted(async () => {
            try {
                await loadEligibility()
            } catch (error) {
                errorMessage.value = error instanceof Error ? error.message : 'Error cargando MVP'
            } finally {
                loading.value = false
            }
        })

        return { loading, saving, errorMessage, successMessage, previousJornada, hasVoted, canVote, candidates, teamsMap, jornadaRanking, loggedPlayerName, authEmail, voteMvp, Medal }
    }
})
</script>

<template>
  <section class="space-y-4 lg:space-y-6">
    <UiSectionTitle title="MVP" subtitle="Votación de la jornada anterior" />
    <div v-if="errorMessage" class="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{{ errorMessage }}</div>
    <div v-if="successMessage" class="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">{{ successMessage }}</div>
    <UiAppCard v-if="!authEmail">
      <div class="space-y-3">
        <p class="text-sm text-slate-300">Necesitas iniciar sesión para votar.</p>
        <NuxtLink to="/login" class="inline-flex items-center justify-center rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700">Ir a iniciar sesión</NuxtLink>
      </div>
    </UiAppCard>
    <UiAppCard v-else>
      <div class="mb-3">
        <p class="text-sm text-slate-300">{{ loggedPlayerName || authEmail }} · Jornada {{ previousJornada || 'sin datos' }}</p>
      </div>
      <UiEmptyState v-if="loading" :icon="Medal" title="Cargando..." description="" />
      <UiEmptyState v-else-if="!canVote && !hasVoted" :icon="Medal" title="No tienes voto en esta jornada" description="Solo votan quienes participaron en la jornada anterior." />
      <UiEmptyState v-else-if="hasVoted" :icon="Medal" title="Ya votaste" description="Tu voto ya fue registrado." />
      <div v-else class="grid gap-2">
        <button v-for="player in candidates" :key="player.id" type="button" class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-left transition hover:border-slate-700 disabled:cursor-not-allowed disabled:opacity-60" :disabled="saving" @click="voteMvp(player.id)">
          <span class="truncate text-sm font-semibold text-white">{{ player.name }}</span>
          <span class="text-xs text-slate-400">{{ teamsMap.get(player.team_id ?? '') ?? 'Equipo' }}</span>
        </button>
      </div>
      <div v-if="jornadaRanking.length" class="mt-4 space-y-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Resultado actual</p>
        <div v-for="(row, index) in jornadaRanking" :key="row.playerId" class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
          <p class="text-sm font-semibold text-white">{{ index + 1 }}. {{ row.name }}</p>
          <UiAppBadge variant="neutral">{{ row.votes }}</UiAppBadge>
        </div>
      </div>
    </UiAppCard>
  </section>
</template>
