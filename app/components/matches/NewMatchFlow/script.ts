import { computed, defineComponent, onMounted, ref, watch } from 'vue'
import {
    CalendarPlus,
    Check,
    Clock,
    RefreshCw,
    TriangleAlert,
    Trophy,
    Users
} from 'lucide-vue-next'

type TeamRow = {
    id: string
    name: string
}

type MatchStatus = 'in_progress' | 'finished'

type MatchRow = {
    id: string
    played_at: string
    team_a_id: string
    team_b_id: string
    team_a_score: number | null
    team_b_score: number | null
    status: MatchStatus
    first_goal_team_id: string | null
    winner_team_id: string | null
    winner_reason: string | null
    created_at?: string
}

type PlayerRow = {
    id: string
    name: string
    team_id: string | null
    jersey_number: number | null
    is_active: boolean
}

type MatchPlayerRow = {
    player_id: string
    team_id: string
}

type MatchAttendanceRow = {
    player_id: string
}

type JornadaAttendanceRow = {
    player_id: string
}

type PlayerMatchStatRow = {
    player_id: string
    goals: number | null
    own_goals?: number | null
}

const MIN_PLAYERS_PER_TEAM = 5
const MATCHES_PAGE_SIZE = 5
const VOTER_KEY_STORAGE = 'lsf_voter_key'
const MATCH_SELECT =
    'id, played_at, team_a_id, team_b_id, team_a_score, team_b_score, status, first_goal_team_id, winner_team_id, winner_reason, created_at'

export default defineComponent({
    name: 'NewMatchFlow',

    components: {
        CalendarPlus,
        Check,
        Clock,
        RefreshCw,
        TriangleAlert,
        Trophy,
        Users
    },

    setup() {
        const supabase = useSupabase()
        const { message: appError } = useAppError()
        const { isAdmin, isAdminLoading, refreshAdminAccess } = useAdminAccess()

        const teams = ref<TeamRow[]>([])
        const players = ref<PlayerRow[]>([])
        const recentMatches = ref<MatchRow[]>([])
        const recentMatchDetails = ref<Record<string, Array<{ playerId: string; playerName: string; goals: number; ownGoals: number }>>>({})
        const recentMatchesPage = ref(1)
        const recentMatchesTotal = ref(0)
        const activeMatch = ref<MatchRow | null>(null)

        const loading = ref(false)
        const saving = ref(false)
        const errorMessage = ref('')
        const successMessage = ref('')
        const needsMvpVote = ref(false)
        const activeTab = ref<'jornada' | 'partido'>('partido')
        const jornadaStatus = ref<{ is_closed: boolean } | null>(null)

        const formTeamAId = ref('')
        const formTeamBId = ref('')
        const activeTeamAScore = ref('0')
        const activeTeamBScore = ref('0')
        const firstGoalTeamId = ref('')
        const manualWinnerTeamId = ref('')
        const selectedJornadaPlayerIds = ref<string[]>([])
        const selectedTeamAPlayerIds = ref<string[]>([])
        const selectedTeamBPlayerIds = ref<string[]>([])
        const playerGoals = ref<Record<string, number>>({})
        const playerOwnGoals = ref<Record<string, number>>({})

        const teamsMap = computed(() => {
            return new Map(teams.value.map((team) => [team.id, team.name]))
        })

        const availableTeamBOptions = computed(() => {
            return teams.value.filter((team) => team.id !== formTeamAId.value)
        })

        const hasEnoughTeams = computed(() => teams.value.length >= 2)

        const recentMatchesTotalPages = computed(() => {
            return Math.max(1, Math.ceil(recentMatchesTotal.value / MATCHES_PAGE_SIZE))
        })

        const canGoToPreviousMatchesPage = computed(() => {
            return recentMatchesPage.value > 1 && !loading.value && !saving.value
        })

        const canGoToNextMatchesPage = computed(() => {
            return (
                recentMatchesPage.value < recentMatchesTotalPages.value &&
                !loading.value &&
                !saving.value
            )
        })

        const jornadaDate = computed(() => {
            const sourceDate = activeMatch.value?.played_at
                ? new Date(activeMatch.value.played_at)
                : new Date()

            return sourceDate.toISOString().slice(0, 10)
        })

        const isJornadaClosed = computed(() => {
            return Boolean(jornadaStatus.value?.is_closed)
        })

        const activePlayers = computed(() => {
            return [...players.value]
                .filter((player) => player.is_active)
                .sort((a, b) => a.name.localeCompare(b.name))
        })

        const presentPlayers = computed(() => {
            return activePlayers.value.filter((player) =>
                selectedJornadaPlayerIds.value.includes(player.id)
            )
        })

        const selectedTeamAPlayers = computed(() => {
            return presentPlayers.value.filter((player) =>
                selectedTeamAPlayerIds.value.includes(player.id)
            )
        })

        const selectedTeamBPlayers = computed(() => {
            return presentPlayers.value.filter((player) =>
                selectedTeamBPlayerIds.value.includes(player.id)
            )
        })

        const teamAGoalsTotal = computed(() => {
            return calculateTeamAScoreFromEvents()
        })

        const teamBGoalsTotal = computed(() => {
            return calculateTeamBScoreFromEvents()
        })

        const currentTeamAId = computed(() => {
            return activeMatch.value?.team_a_id ?? formTeamAId.value
        })

        const currentTeamBId = computed(() => {
            return activeMatch.value?.team_b_id ?? formTeamBId.value
        })

        const canStartMatch = computed(() => {
            return (
                hasEnoughTeams.value &&
                !activeMatch.value &&
                formTeamAId.value &&
                formTeamBId.value &&
                formTeamAId.value !== formTeamBId.value &&
                selectedTeamAPlayerIds.value.length >= MIN_PLAYERS_PER_TEAM &&
                selectedTeamBPlayerIds.value.length >= MIN_PLAYERS_PER_TEAM &&
                !saving.value
            )
        })

        const tieHasGoals = computed(() => {
            const teamAScore = scoreValue(activeTeamAScore.value)
            const teamBScore = scoreValue(activeTeamBScore.value)

            return teamAScore === teamBScore && teamAScore > 0
        })

        const isScorelessTie = computed(() => {
            return (
                scoreValue(activeTeamAScore.value) === 0 &&
                scoreValue(activeTeamBScore.value) === 0
            )
        })

        function getTeamName(teamId: string | null | undefined) {
            if (!teamId) return 'Equipo'

            return teamsMap.value.get(teamId) ?? 'Equipo'
        }

        function getErrorMessage(error: unknown, fallback: string) {
            return appError(error, fallback)
        }

        async function ensureAdminWriteAccess() {
            const { data: authData } = await supabase.auth.getUser()
            const authUserId = authData.user?.id ?? ''
            if (isAdminLoading.value) {
                await refreshAdminAccess()
            }
            if (!isAdmin.value) {
                await refreshAdminAccess()
            }
            if (isAdmin.value) return true
            if (!authUserId) {
                errorMessage.value = 'No tienes sesión activa. Inicia sesión con tu usuario admin.'
                return false
            }
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, email')
                .eq('id', authUserId)
                .maybeSingle()
            errorMessage.value = `No tienes permisos para esta acción. Sesión: ${profile?.email ?? authData.user?.email ?? 'sin email'} · rol: ${profile?.role ?? 'sin perfil'}`
            return false
        }

        function getPlayerTeamName(player: PlayerRow) {
            return getTeamName(player.team_id)
        }

        function isReinforcement(player: PlayerRow, teamId: string) {
            return player.team_id !== teamId
        }

        function basePlayersForTeam(teamId: string) {
            return presentPlayers.value.filter((player) => player.team_id === teamId)
        }

        function reinforcementPlayersForTeam(teamId: string) {
            return presentPlayers.value.filter((player) => player.team_id !== teamId)
        }

        function activePlayersForTeam(teamId: string) {
            return activePlayers.value.filter((player) => player.team_id === teamId)
        }

        function activePlayersOutsideTeams(teamAId: string, teamBId: string) {
            return activePlayers.value.filter((player) => {
                return player.team_id !== teamAId && player.team_id !== teamBId
            })
        }

        function presentPlayersForTeam(teamId: string) {
            return presentPlayers.value.filter((player) => player.team_id === teamId)
        }

        function presentPlayersOutsideTeams(teamAId: string, teamBId: string) {
            return presentPlayers.value.filter((player) => {
                return player.team_id !== teamAId && player.team_id !== teamBId
            })
        }

        function selectedPlayerCount(teamSide: 'a' | 'b') {
            return teamSide === 'a'
                ? selectedTeamAPlayerIds.value.length
                : selectedTeamBPlayerIds.value.length
        }

        function syncSelectedPlayersForTeam(teamSide: 'a' | 'b') {
            const teamId = teamSide === 'a' ? currentTeamAId.value : currentTeamBId.value
            const selectedIds = teamSide === 'a' ? selectedTeamAPlayerIds : selectedTeamBPlayerIds
            const oppositeIds = teamSide === 'a' ? selectedTeamBPlayerIds.value : selectedTeamAPlayerIds.value
            const baseIds = presentPlayersForTeam(teamId)
                .map((player) => player.id)
                .filter((playerId) => !oppositeIds.includes(playerId))

            // If jornada only has 5 available base players, auto-select them.
            if (baseIds.length <= MIN_PLAYERS_PER_TEAM) {
                selectedIds.value = baseIds
                return
            }

            // If nothing selected yet, default-select the first 5 base players for ergonomics.
            if (selectedIds.value.length === 0) {
                selectedIds.value = baseIds.slice(0, MIN_PLAYERS_PER_TEAM)
                return
            }

            selectedIds.value = selectedIds.value.filter((playerId) =>
                selectedJornadaPlayerIds.value.includes(playerId)
            )
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

        function syncActiveScore(match: MatchRow | null) {
            activeTeamAScore.value = String(match?.team_a_score ?? 0)
            activeTeamBScore.value = String(match?.team_b_score ?? 0)
            firstGoalTeamId.value = match?.first_goal_team_id ?? ''
            manualWinnerTeamId.value = match?.winner_team_id ?? ''
        }

        function selectedMatchPlayerIds() {
            return Array.from(
                new Set([...selectedTeamAPlayerIds.value, ...selectedTeamBPlayerIds.value])
            )
        }

        function filterPlayerEventsToSelectedPlayers() {
            const selectedIds = selectedMatchPlayerIds()
            const nextGoals: Record<string, number> = {}
            const nextOwnGoals: Record<string, number> = {}

            selectedIds.forEach((playerId) => {
                const goals = playerGoals.value[playerId] ?? 0
                const ownGoals = playerOwnGoals.value[playerId] ?? 0

                if (goals > 0) {
                    nextGoals[playerId] = goals
                }

                if (ownGoals > 0) {
                    nextOwnGoals[playerId] = ownGoals
                }
            })

            playerGoals.value = nextGoals
            playerOwnGoals.value = nextOwnGoals
        }

        function getPlayerGoals(playerId: string) {
            return playerGoals.value[playerId] ?? 0
        }

        function getPlayerOwnGoals(playerId: string) {
            return playerOwnGoals.value[playerId] ?? 0
        }

        function calculateTeamAScoreFromEvents(
            goals = playerGoals.value,
            ownGoals = playerOwnGoals.value
        ) {
            const ownGoalsFromTeamB = selectedTeamBPlayerIds.value.reduce((total, playerId) => {
                return total + (ownGoals[playerId] ?? 0)
            }, 0)

            return selectedTeamAPlayerIds.value.reduce((total, playerId) => {
                return total + (goals[playerId] ?? 0)
            }, ownGoalsFromTeamB)
        }

        function calculateTeamBScoreFromEvents(
            goals = playerGoals.value,
            ownGoals = playerOwnGoals.value
        ) {
            const ownGoalsFromTeamA = selectedTeamAPlayerIds.value.reduce((total, playerId) => {
                return total + (ownGoals[playerId] ?? 0)
            }, 0)

            return selectedTeamBPlayerIds.value.reduce((total, playerId) => {
                return total + (goals[playerId] ?? 0)
            }, ownGoalsFromTeamA)
        }

        function syncScoreFromEventMaps(
            goals = playerGoals.value,
            ownGoals = playerOwnGoals.value
        ) {
            activeTeamAScore.value = String(calculateTeamAScoreFromEvents(goals, ownGoals))
            activeTeamBScore.value = String(calculateTeamBScoreFromEvents(goals, ownGoals))
        }

        function setPlayerGoals(playerId: string, goals: number) {
            const normalizedGoals = Math.max(0, Math.min(99, goals))
            const nextGoals = {
                ...playerGoals.value,
                [playerId]: normalizedGoals
            }

            playerGoals.value = nextGoals

            filterPlayerEventsToSelectedPlayers()
            syncScoreFromEventMaps(nextGoals, playerOwnGoals.value)
        }

        function setPlayerOwnGoals(playerId: string, ownGoals: number) {
            const normalizedOwnGoals = Math.max(0, Math.min(99, ownGoals))
            const nextOwnGoals = {
                ...playerOwnGoals.value,
                [playerId]: normalizedOwnGoals
            }

            playerOwnGoals.value = nextOwnGoals

            filterPlayerEventsToSelectedPlayers()
            syncScoreFromEventMaps(playerGoals.value, nextOwnGoals)
        }

        function incrementPlayerGoal(playerId: string) {
            setPlayerGoals(playerId, getPlayerGoals(playerId) + 1)
        }

        function decrementPlayerGoal(playerId: string) {
            setPlayerGoals(playerId, getPlayerGoals(playerId) - 1)
        }

        function incrementPlayerOwnGoal(playerId: string) {
            setPlayerOwnGoals(playerId, getPlayerOwnGoals(playerId) + 1)
        }

        function decrementPlayerOwnGoal(playerId: string) {
            setPlayerOwnGoals(playerId, getPlayerOwnGoals(playerId) - 1)
        }

        function syncScoreFromGoals() {
            syncScoreFromEventMaps()
        }

        async function loadTeams() {
            const { data, error } = await supabase
                .from('teams')
                .select('id, name')
                .order('name', { ascending: true })

            if (error) throw error

            teams.value = data ?? []

            if (!formTeamAId.value) {
                formTeamAId.value = teams.value[0]?.id ?? ''
            }

            if (!formTeamBId.value || formTeamBId.value === formTeamAId.value) {
                formTeamBId.value =
                    teams.value.find((team) => team.id !== formTeamAId.value)?.id ?? ''
            }
        }

        async function loadPlayers() {
            const { data, error } = await supabase
                .from('players')
                .select('id, name, team_id, jersey_number, is_active')
                .eq('is_active', true)
                .order('name', { ascending: true })

            if (error) throw error

            players.value = data ?? []
        }

        async function loadActiveMatch() {
            const { data, error } = await supabase
                .from('matches')
                .select(MATCH_SELECT)
                .eq('status', 'in_progress')
                .order('played_at', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (error) throw error

            activeMatch.value = data ?? null
            syncActiveScore(activeMatch.value)
        }

        async function loadActiveMatchPlayers() {
            selectedTeamAPlayerIds.value = []
            selectedTeamBPlayerIds.value = []

            if (!activeMatch.value) return

            const { data, error } = await supabase
                .from('match_players')
                .select('player_id, team_id')
                .eq('match_id', activeMatch.value.id)

            if (error) throw error

            const rows = (data ?? []) as MatchPlayerRow[]

            selectedTeamAPlayerIds.value = rows
                .filter((row) => row.team_id === activeMatch.value?.team_a_id)
                .map((row) => row.player_id)

            selectedTeamBPlayerIds.value = rows
                .filter((row) => row.team_id === activeMatch.value?.team_b_id)
                .map((row) => row.player_id)

            filterPlayerEventsToSelectedPlayers()
        }

        async function loadActiveMatchStats() {
            playerGoals.value = {}
            playerOwnGoals.value = {}

            if (!activeMatch.value) return

            const { data, error } = await supabase
                .from('player_match_stats')
                .select('player_id, goals, own_goals')
                .eq('match_id', activeMatch.value.id)

            if (error && !isMissingOwnGoalsColumnError(error)) throw error

            const fallbackResponse = error
                ? await supabase
                    .from('player_match_stats')
                    .select('player_id, goals')
                    .eq('match_id', activeMatch.value.id)
                : null

            if (fallbackResponse?.error) throw fallbackResponse.error

            const rows = (fallbackResponse?.data ?? data ?? []) as PlayerMatchStatRow[]

            playerGoals.value = rows.reduce(
                (goalsByPlayer, row) => ({
                    ...goalsByPlayer,
                    [row.player_id]: row.goals ?? 0
                }),
                {} as Record<string, number>
            )

            playerOwnGoals.value = rows.reduce(
                (ownGoalsByPlayer, row) => ({
                    ...ownGoalsByPlayer,
                    [row.player_id]: row.own_goals ?? 0
                }),
                {} as Record<string, number>
            )
        }

        async function loadActiveMatchAttendance() {
            if (!activeMatch.value) return

            const { data, error } = await supabase
                .from('match_attendance')
                .select('player_id')
                .eq('match_id', activeMatch.value.id)

            if (error) throw error

            const playerIds = ((data ?? []) as MatchAttendanceRow[])
                .map((row) => row.player_id)

            selectedJornadaPlayerIds.value = Array.from(
                new Set([...selectedJornadaPlayerIds.value, ...playerIds])
            )
        }

        async function loadJornadaAttendance() {
            const { data, error } = await supabase
                .from('jornada_attendance')
                .select('player_id')
                .eq('jornada_date', jornadaDate.value)

            if (error) throw error

            selectedJornadaPlayerIds.value = ((data ?? []) as JornadaAttendanceRow[])
                .map((row) => row.player_id)
        }

        async function loadJornadaStatus() {
            const { data, error } = await supabase
                .from('jornada_status')
                .select('is_closed')
                .eq('jornada_date', jornadaDate.value)
                .maybeSingle()
            if (error) throw error
            jornadaStatus.value = data ?? null
        }

        watch(jornadaDate, async () => {
            try {
                await loadJornadaStatus()
            } catch {
                // ignore; status is optional
            }
        })

        // Keep team selections in sync with jornada attendance so "Nuevo partido" feels automatic.
        watch(
            () => selectedJornadaPlayerIds.value.slice().sort().join(','),
            () => {
                if (activeMatch.value) return
                if (formTeamAId.value) syncSelectedPlayersForTeam('a')
                if (formTeamBId.value) syncSelectedPlayersForTeam('b')
            }
        )

        async function loadRecentMatches(page = recentMatchesPage.value) {
            const normalizedPage = Math.max(1, page)
            const from = (normalizedPage - 1) * MATCHES_PAGE_SIZE
            const to = from + MATCHES_PAGE_SIZE - 1

            const { data, error, count } = await supabase
                .from('matches')
                .select(MATCH_SELECT, { count: 'exact' })
                .eq('status', 'finished')
                .order('played_at', { ascending: false })
                .order('created_at', { ascending: false })
                .range(from, to)

            if (error) throw error

            recentMatchesPage.value = normalizedPage
            recentMatchesTotal.value = count ?? 0
            recentMatches.value = ((data ?? []) as MatchRow[]).filter((match) =>
                isFinishedMatch(match)
            )
            const ids = recentMatches.value.map((m) => m.id)
            if (!ids.length) {
                recentMatchDetails.value = {}
                return
            }
            const { data: stats } = await supabase
                .from('player_match_stats')
                .select('match_id, player_id, goals, own_goals, players(name)')
                .in('match_id', ids)
            const byMatch: Record<string, Array<{ playerId: string; playerName: string; goals: number; ownGoals: number }>> = {}
            ;(stats ?? []).forEach((row: { match_id: string; player_id: string; goals: number | null; own_goals: number | null; players: { name: string } | null }) => {
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
            recentMatchDetails.value = byMatch
        }

        function normalizedMatchStatus(match: MatchRow) {
            return String(match.status).trim().toLowerCase()
        }

        function isFinishedMatch(match: MatchRow) {
            return normalizedMatchStatus(match) === 'finished'
        }

        function upsertRecentMatch(match: MatchRow) {
            if (!isFinishedMatch(match)) return

            recentMatchesPage.value = 1
            recentMatchesTotal.value += recentMatches.value.some(
                (recentMatch) => recentMatch.id === match.id
            )
                ? 0
                : 1
            recentMatches.value = [
                match,
                ...recentMatches.value.filter((recentMatch) => recentMatch.id !== match.id)
            ].slice(0, MATCHES_PAGE_SIZE)
        }

        async function goToPreviousMatchesPage() {
            if (!canGoToPreviousMatchesPage.value) return

            await loadRecentMatches(recentMatchesPage.value - 1)
        }

        async function goToNextMatchesPage() {
            if (!canGoToNextMatchesPage.value) return

            await loadRecentMatches(recentMatchesPage.value + 1)
        }

        async function loadData() {
            loading.value = true
            errorMessage.value = ''
            successMessage.value = ''

            try {
                const today = new Date().toISOString().slice(0, 10)
                const existingKey = localStorage.getItem(VOTER_KEY_STORAGE)
                const voterKey = existingKey ?? crypto.randomUUID()
                if (!existingKey) localStorage.setItem(VOTER_KEY_STORAGE, voterKey)

                await loadTeams()
                await loadPlayers()
                await loadActiveMatch()
                await loadJornadaStatus()
                await loadJornadaAttendance()
                await loadActiveMatchAttendance()
                await loadActiveMatchPlayers()
                await loadActiveMatchStats()
                await loadRecentMatches()
                const { data: voteData, error: voteError } = await supabase
                    .from('jornada_mvp_votes')
                    .select('id')
                    .eq('jornada_date', today)
                    .eq('voter_key', voterKey)
                    .maybeSingle()
                if (voteError) throw voteError
                needsMvpVote.value = !voteData
                if (!activeMatch.value) {
                    syncSelectedPlayersForTeam('a')
                    syncSelectedPlayersForTeam('b')
                }
            } catch (error) {
                errorMessage.value = getErrorMessage(error, 'Error cargando partidos')
            } finally {
                loading.value = false
            }
        }

        function validateStartMatch() {
            if (activeMatch.value) {
                return 'Todavía tienes un partido en progreso.'
            }

            if (!hasEnoughTeams.value) {
                return 'Necesitas al menos dos equipos para iniciar un partido.'
            }

            if (!formTeamAId.value || !formTeamBId.value) {
                return 'Selecciona los dos equipos.'
            }

            if (formTeamAId.value === formTeamBId.value) {
                return 'Selecciona equipos diferentes.'
            }

            return ''
        }

        function scoreValue(value: string) {
            if (!value.trim()) return 0

            return Number(value)
        }

        function validateScore() {
            const teamAScore = scoreValue(activeTeamAScore.value)
            const teamBScore = scoreValue(activeTeamBScore.value)

            if (
                !Number.isInteger(teamAScore) ||
                !Number.isInteger(teamBScore) ||
                teamAScore < 0 ||
                teamBScore < 0 ||
                teamAScore > 99 ||
                teamBScore > 99
            ) {
                return 'El marcador debe usar números enteros entre 0 y 99.'
            }

            return ''
        }

        function validateScoreMatchesGoals() {
            const scoreValidationError = validateScore()
            if (scoreValidationError) return scoreValidationError

            const teamAScore = scoreValue(activeTeamAScore.value)
            const teamBScore = scoreValue(activeTeamBScore.value)

            if (teamAScore !== teamAGoalsTotal.value || teamBScore !== teamBGoalsTotal.value) {
                return `El marcador debe coincidir con los goles por jugador: ${teamAGoalsTotal.value} - ${teamBGoalsTotal.value}.`
            }

            return ''
        }

        function isMissingOwnGoalsColumnError(error: unknown) {
            if (!error || typeof error !== 'object') return false

            const supabaseError = error as {
                code?: string
                message?: string
            }

            return (
                supabaseError.code === '42703' ||
                supabaseError.code === 'PGRST204' ||
                supabaseError.message?.includes('own_goals') === true
            )
        }

        async function getPreviousWinnerTeamId(matchId: string) {
            const { data, error } = await supabase
                .from('matches')
                .select('winner_team_id')
                .eq('status', 'finished')
                .not('winner_team_id', 'is', null)
                .neq('id', matchId)
                .order('played_at', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (error) throw error

            return data?.winner_team_id ?? ''
        }

        async function resolveWinner() {
            if (!activeMatch.value) {
                return {
                    firstGoalTeamId: null,
                    winnerTeamId: null,
                    winnerReason: null
                }
            }

            const teamAScore = scoreValue(activeTeamAScore.value)
            const teamBScore = scoreValue(activeTeamBScore.value)

            if (teamAScore > teamBScore) {
                return {
                    firstGoalTeamId: firstGoalTeamId.value || null,
                    winnerTeamId: activeMatch.value.team_a_id,
                    winnerReason: 'score'
                }
            }

            if (teamBScore > teamAScore) {
                return {
                    firstGoalTeamId: firstGoalTeamId.value || null,
                    winnerTeamId: activeMatch.value.team_b_id,
                    winnerReason: 'score'
                }
            }

            if (teamAScore > 0) {
                if (!firstGoalTeamId.value) {
                    throw new Error('Selecciona qué equipo hizo el primer gol.')
                }

                return {
                    firstGoalTeamId: firstGoalTeamId.value,
                    winnerTeamId: firstGoalTeamId.value,
                    winnerReason: 'first_goal'
                }
            }

            const previousWinnerTeamId = await getPreviousWinnerTeamId(activeMatch.value.id)
            const winnerTeamId = previousWinnerTeamId || manualWinnerTeamId.value

            if (!winnerTeamId) {
                throw new Error('Selecciona el ganador del primer partido.')
            }

            return {
                firstGoalTeamId: null,
                winnerTeamId,
                winnerReason: previousWinnerTeamId ? 'previous_winner' : 'manual'
            }
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

            const teamAScore = match.team_a_score ?? 0
            const teamBScore = match.team_b_score ?? 0

            if (teamAScore > teamBScore) return match.team_a_id
            if (teamBScore > teamAScore) return match.team_b_id

            return ''
        }

        function isMatchWinner(match: MatchRow, teamId: string) {
            return getVisualWinnerTeamId(match) === teamId
        }

        function isPlayerSelectedForTeam(playerId: string, teamSide: 'a' | 'b') {
            const selectedIds =
                teamSide === 'a' ? selectedTeamAPlayerIds.value : selectedTeamBPlayerIds.value

            return selectedIds.includes(playerId)
        }

        function isPlayerPresent(playerId: string) {
            return selectedJornadaPlayerIds.value.includes(playerId)
        }

        function toggleJornadaPlayer(playerId: string) {
            if (isJornadaClosed.value) return
            selectedJornadaPlayerIds.value = selectedJornadaPlayerIds.value.includes(playerId)
                ? selectedJornadaPlayerIds.value.filter((selectedId) => selectedId !== playerId)
                : [...selectedJornadaPlayerIds.value, playerId]

            if (!selectedJornadaPlayerIds.value.includes(playerId)) {
                selectedTeamAPlayerIds.value = selectedTeamAPlayerIds.value.filter(
                    (selectedId) => selectedId !== playerId
                )
                selectedTeamBPlayerIds.value = selectedTeamBPlayerIds.value.filter(
                    (selectedId) => selectedId !== playerId
                )
            }
        }

        function isPlayerDisabledForTeam(playerId: string, teamSide: 'a' | 'b') {
            if (!isPlayerPresent(playerId)) return true

            const oppositeSelectedIds =
                teamSide === 'a' ? selectedTeamBPlayerIds.value : selectedTeamAPlayerIds.value

            return oppositeSelectedIds.includes(playerId)
        }

        function togglePlayerForTeam(playerId: string, teamSide: 'a' | 'b') {
            if (isPlayerDisabledForTeam(playerId, teamSide)) return

            const selectedIds =
                teamSide === 'a' ? selectedTeamAPlayerIds : selectedTeamBPlayerIds

            selectedIds.value = selectedIds.value.includes(playerId)
                ? selectedIds.value.filter((selectedId) => selectedId !== playerId)
                : [...selectedIds.value, playerId]
        }

        function validateMatchPlayers(requireMinimum = true) {
            if (!selectedJornadaPlayerIds.value.length) {
                return 'Marca los jugadores que fueron a la jornada.'
            }

            const duplicatedPlayerId = selectedTeamAPlayerIds.value.find((playerId) =>
                selectedTeamBPlayerIds.value.includes(playerId)
            )

            if (duplicatedPlayerId) {
                return 'Un jugador no puede estar seleccionado en los dos equipos.'
            }

            const absentSelectedPlayerId = [
                ...selectedTeamAPlayerIds.value,
                ...selectedTeamBPlayerIds.value
            ].find((playerId) => !selectedJornadaPlayerIds.value.includes(playerId))

            if (absentSelectedPlayerId) {
                return 'Solo puedes seleccionar jugadores presentes en la jornada.'
            }

            if (requireMinimum && selectedTeamAPlayerIds.value.length < MIN_PLAYERS_PER_TEAM) {
                return `${getTeamName(currentTeamAId.value)} necesita al menos ${MIN_PLAYERS_PER_TEAM} jugadores.`
            }

            if (requireMinimum && selectedTeamBPlayerIds.value.length < MIN_PLAYERS_PER_TEAM) {
                return `${getTeamName(currentTeamBId.value)} necesita al menos ${MIN_PLAYERS_PER_TEAM} jugadores.`
            }

            return ''
        }

        async function persistJornadaAttendance() {
            if (isJornadaClosed.value) {
                throw new Error(`La jornada ${jornadaDate.value} ya está finalizada.`)
            }
            const { error: deleteError } = await supabase
                .from('jornada_attendance')
                .delete()
                .eq('jornada_date', jornadaDate.value)

            if (deleteError) throw deleteError

            if (!selectedJornadaPlayerIds.value.length) return

            const { error: insertError } = await supabase
                .from('jornada_attendance')
                .insert(
                    selectedJornadaPlayerIds.value.map((playerId) => ({
                        jornada_date: jornadaDate.value,
                        player_id: playerId
                    }))
                )

            if (insertError) throw insertError
        }

        async function persistAttendance() {
            if (!activeMatch.value) return

            const { error: deleteError } = await supabase
                .from('match_attendance')
                .delete()
                .eq('match_id', activeMatch.value.id)

            if (deleteError) throw deleteError

            if (!selectedJornadaPlayerIds.value.length) return

            const { error: insertError } = await supabase
                .from('match_attendance')
                .insert(
                    selectedJornadaPlayerIds.value.map((playerId) => ({
                        match_id: activeMatch.value?.id,
                        player_id: playerId
                    }))
                )

            if (insertError) throw insertError
        }

        async function saveJornadaAttendance() {
            if (!(await ensureAdminWriteAccess())) return
            errorMessage.value = ''
            successMessage.value = ''
            saving.value = true

            try {
                await persistJornadaAttendance()
                successMessage.value = 'Jornada actualizada.'
                await loadJornadaStatus()
            } catch (error) {
                errorMessage.value = getErrorMessage(error, 'Error guardando jornada')
            } finally {
                saving.value = false
            }
        }

        async function finishJornada() {
            if (!(await ensureAdminWriteAccess())) return
            if (activeMatch.value) {
                errorMessage.value = 'No puedes finalizar la jornada con un partido en progreso.'
                return
            }
            const { data: authData } = await supabase.auth.getUser()
            const { error } = await supabase.from('jornada_status').upsert({
                jornada_date: jornadaDate.value,
                is_closed: true,
                closed_at: new Date().toISOString(),
                closed_by: authData.user?.id ?? null
            })
            if (error) throw error
            await loadJornadaStatus()
            successMessage.value = `Jornada ${jornadaDate.value} finalizada.`
            activeTab.value = 'partido'
        }

        async function reopenJornada() {
            if (!(await ensureAdminWriteAccess())) return
            if (activeMatch.value) {
                errorMessage.value = 'No puedes reabrir la jornada con un partido en progreso.'
                return
            }

            const { error } = await supabase.from('jornada_status').upsert({
                jornada_date: jornadaDate.value,
                is_closed: false,
                closed_at: null,
                closed_by: null
            })

            if (error) throw error

            await loadJornadaStatus()
            successMessage.value = `Jornada ${jornadaDate.value} reabierta.`
        }

        async function resetJornada() {
            if (!(await ensureAdminWriteAccess())) return
            if (activeMatch.value) {
                errorMessage.value = 'No puedes reiniciar la jornada con un partido en progreso.'
                return
            }

            errorMessage.value = ''
            successMessage.value = ''
            saving.value = true

            try {
                // Clear attendance for the date and ensure status is open.
                const { error: deleteError } = await supabase
                    .from('jornada_attendance')
                    .delete()
                    .eq('jornada_date', jornadaDate.value)
                if (deleteError) throw deleteError

                const { error: statusError } = await supabase.from('jornada_status').upsert({
                    jornada_date: jornadaDate.value,
                    is_closed: false,
                    closed_at: null,
                    closed_by: null
                })
                if (statusError) throw statusError

                selectedJornadaPlayerIds.value = []
                selectedTeamAPlayerIds.value = []
                selectedTeamBPlayerIds.value = []
                playerGoals.value = {}
                playerOwnGoals.value = {}

                await loadJornadaStatus()
                successMessage.value = `Jornada ${jornadaDate.value} lista para empezar.`
                activeTab.value = 'jornada'
            } catch (error) {
                errorMessage.value = getErrorMessage(error, 'Error reiniciando jornada')
            } finally {
                saving.value = false
            }
        }

        async function persistMatchPlayers(requireMinimum = true) {
            if (!activeMatch.value) return

            const validationError = validateMatchPlayers(requireMinimum)
            if (validationError) throw new Error(validationError)

            const rows = [
                ...selectedTeamAPlayerIds.value.map((playerId) => ({
                    match_id: activeMatch.value?.id,
                    player_id: playerId,
                    team_id: activeMatch.value?.team_a_id
                })),
                ...selectedTeamBPlayerIds.value.map((playerId) => ({
                    match_id: activeMatch.value?.id,
                    player_id: playerId,
                    team_id: activeMatch.value?.team_b_id
                }))
            ]

            const { error: deleteError } = await supabase
                .from('match_players')
                .delete()
                .eq('match_id', activeMatch.value.id)

            if (deleteError) throw deleteError

            if (!rows.length) return

            const { error: insertError } = await supabase
                .from('match_players')
                .insert(rows)

            if (insertError) throw insertError

            filterPlayerEventsToSelectedPlayers()
        }

        async function persistPlayerGoals() {
            if (!activeMatch.value) return

            filterPlayerEventsToSelectedPlayers()

            const rows = selectedMatchPlayerIds().map((playerId) => ({
                match_id: activeMatch.value?.id,
                player_id: playerId,
                goals: getPlayerGoals(playerId),
                own_goals: getPlayerOwnGoals(playerId),
                assists: 0,
                yellow_cards: 0,
                red_cards: 0
            }))

            const { error: deleteError } = await supabase
                .from('player_match_stats')
                .delete()
                .eq('match_id', activeMatch.value.id)

            if (deleteError) throw deleteError

            if (!rows.length) return

            const { error: insertError } = await supabase
                .from('player_match_stats')
                .insert(rows)

            if (!insertError) return

            if (!isMissingOwnGoalsColumnError(insertError)) throw insertError

            const fallbackRows = rows.map(({ own_goals, ...row }) => row)
            const { error: fallbackInsertError } = await supabase
                .from('player_match_stats')
                .insert(fallbackRows)

            if (fallbackInsertError) throw fallbackInsertError
        }

        async function saveGoals() {
            if (!activeMatch.value) return
            if (!(await ensureAdminWriteAccess())) return

            errorMessage.value = ''
            successMessage.value = ''
            saving.value = true

            try {
                await persistMatchPlayers(true)
                syncScoreFromGoals()
                await persistPlayerGoals()
                const { data, error } = await supabase
                    .from('matches')
                    .update({
                        team_a_score: scoreValue(activeTeamAScore.value),
                        team_b_score: scoreValue(activeTeamBScore.value)
                    })
                    .eq('id', activeMatch.value.id)

                if (error) throw error

                successMessage.value = 'Goles guardados.'
                await loadRecentMatches()
            } catch (error) {
                errorMessage.value = getErrorMessage(error, 'Error guardando goles')
            } finally {
                saving.value = false
            }
        }

        async function saveMatchPlayers() {
            if (!activeMatch.value) return
            if (!(await ensureAdminWriteAccess())) return

            errorMessage.value = ''
            successMessage.value = ''
            saving.value = true

            try {
                await persistJornadaAttendance()
                await persistAttendance()
                await persistMatchPlayers(true)
                await persistPlayerGoals()
                await loadActiveMatchAttendance()
                await loadActiveMatchPlayers()
                await loadActiveMatchStats()
                successMessage.value = 'Jugadores guardados.'
            } catch (error) {
                errorMessage.value = getErrorMessage(error, 'Error guardando jugadores')
            } finally {
                saving.value = false
            }
        }

        async function startMatch() {
            if (!(await ensureAdminWriteAccess())) return
            errorMessage.value = ''
            successMessage.value = ''

            const validationError = validateStartMatch()
            if (validationError) {
                errorMessage.value = validationError
                return
            }

            const playersValidationError = validateMatchPlayers(true)
            if (playersValidationError) {
                errorMessage.value = playersValidationError
                return
            }

            saving.value = true

            try {
                const { data, error } = await supabase
                    .from('matches')
                    .insert({
                        played_at: new Date().toISOString(),
                        team_a_id: formTeamAId.value,
                        team_b_id: formTeamBId.value,
                        team_a_score: 0,
                        team_b_score: 0,
                        status: 'in_progress',
                        first_goal_team_id: null,
                        winner_team_id: null,
                        winner_reason: null
                    })
                    .select(MATCH_SELECT)
                    .single()

                if (error) throw error

                activeMatch.value = data
                syncActiveScore(activeMatch.value)
                playerGoals.value = {}
                playerOwnGoals.value = {}
                // If the jornada is closed, we don't attempt to edit asistencia anymore.
                if (!isJornadaClosed.value) {
                    await persistJornadaAttendance()
                } else {
                    await loadJornadaAttendance()
                }
                await persistAttendance()
                await persistMatchPlayers(true)
                await persistPlayerGoals()
                successMessage.value = 'Partido iniciado correctamente.'
                await loadRecentMatches()
            } catch (error) {
                errorMessage.value = getErrorMessage(error, 'Error iniciando partido')
            } finally {
                saving.value = false
            }
        }

        async function saveScore() {
            if (!activeMatch.value) return
            if (!(await ensureAdminWriteAccess())) return

            errorMessage.value = ''
            successMessage.value = ''

            const validationError = validateScore()
            if (validationError) {
                errorMessage.value = validationError
                return
            }

            saving.value = true

            try {
                const { data, error } = await supabase
                    .from('matches')
                    .update({
                        team_a_score: scoreValue(activeTeamAScore.value),
                        team_b_score: scoreValue(activeTeamBScore.value)
                    })
                    .eq('id', activeMatch.value.id)

                if (error) throw error

                successMessage.value = 'Marcador actualizado.'
                await loadActiveMatch()
                await loadActiveMatchAttendance()
                await loadActiveMatchPlayers()
                await loadActiveMatchStats()
                await loadRecentMatches()
            } catch (error) {
                errorMessage.value = getErrorMessage(error, 'Error actualizando marcador')
            } finally {
                saving.value = false
            }
        }

        async function finishMatch() {
            if (!activeMatch.value) return
            if (!(await ensureAdminWriteAccess())) return

            errorMessage.value = ''
            successMessage.value = ''

            const validationError = validateScoreMatchesGoals()
            if (validationError) {
                errorMessage.value = validationError
                return
            }

            saving.value = true

            try {
                await persistAttendance()
                await persistMatchPlayers(true)
                await persistPlayerGoals()
                const winner = await resolveWinner()

                const { data, error } = await supabase
                    .from('matches')
                    .update({
                        team_a_score: scoreValue(activeTeamAScore.value),
                        team_b_score: scoreValue(activeTeamBScore.value),
                        first_goal_team_id: winner.firstGoalTeamId,
                        winner_team_id: winner.winnerTeamId,
                        winner_reason: winner.winnerReason,
                        status: 'finished'
                    })
                    .eq('id', activeMatch.value.id)
                    .select(MATCH_SELECT)
                    .single()

                if (error) throw error

                upsertRecentMatch(data as MatchRow)
                activeMatch.value = null
                activeTeamAScore.value = '0'
                activeTeamBScore.value = '0'
                selectedTeamAPlayerIds.value = []
                selectedTeamBPlayerIds.value = []
                playerGoals.value = {}
                playerOwnGoals.value = {}
                successMessage.value = 'Partido finalizado correctamente.'
                await loadRecentMatches()
            } catch (error) {
                errorMessage.value = getErrorMessage(error, 'Error finalizando partido')
            } finally {
                saving.value = false
            }
        }

        onMounted(() => {
            loadData()
        })

        watch(formTeamAId, (teamId) => {
            if (activeMatch.value) return

            if (teamId && teamId === formTeamBId.value) {
                formTeamBId.value = teams.value.find((team) => team.id !== teamId)?.id ?? ''
            }

            syncSelectedPlayersForTeam('a')
            syncSelectedPlayersForTeam('b')
        })

        watch(formTeamBId, () => {
            if (activeMatch.value) return

            syncSelectedPlayersForTeam('b')
        })

        watch(selectedJornadaPlayerIds, () => {
            if (activeMatch.value) return

            syncSelectedPlayersForTeam('a')
            syncSelectedPlayersForTeam('b')
        })

        watch(activeTab, (tab) => {
            if (tab !== 'partido') return
            if (activeMatch.value) return
            syncSelectedPlayersForTeam('a')
            syncSelectedPlayersForTeam('b')
        })

        return {
            teams,
            players,
            activePlayers,
            recentMatches,
            recentMatchDetails,
            recentMatchesPage,
            recentMatchesTotal,
            recentMatchesTotalPages,
            activeMatch,
            loading,
            saving,
            errorMessage,
            successMessage,
            needsMvpVote,
            formTeamAId,
            formTeamBId,
            activeTeamAScore,
            activeTeamBScore,
            firstGoalTeamId,
            manualWinnerTeamId,
            selectedTeamAPlayerIds,
            selectedTeamBPlayerIds,
            selectedTeamAPlayers,
            selectedTeamBPlayers,
            playerGoals,
            playerOwnGoals,
            teamAGoalsTotal,
            teamBGoalsTotal,
            activeTab,
            isJornadaClosed,
            selectedJornadaPlayerIds,
            presentPlayers,
            jornadaDate,
            currentTeamAId,
            currentTeamBId,
            teamsMap,
            availableTeamBOptions,
            hasEnoughTeams,
            canStartMatch,
            canGoToPreviousMatchesPage,
            canGoToNextMatchesPage,
            tieHasGoals,
            isScorelessTie,
            getTeamName,
            getPlayerTeamName,
            isReinforcement,
            basePlayersForTeam,
            reinforcementPlayersForTeam,
            activePlayersForTeam,
            activePlayersOutsideTeams,
            presentPlayersForTeam,
            presentPlayersOutsideTeams,
            selectedPlayerCount,
            syncSelectedPlayersForTeam,
            formatMatchDate,
            getWinnerReasonLabel,
            getVisualWinnerTeamId,
            isMatchWinner,
            isPlayerPresent,
            toggleJornadaPlayer,
            isPlayerSelectedForTeam,
            isPlayerDisabledForTeam,
            togglePlayerForTeam,
            getPlayerGoals,
            getPlayerOwnGoals,
            incrementPlayerGoal,
            decrementPlayerGoal,
            incrementPlayerOwnGoal,
            decrementPlayerOwnGoal,
            syncScoreFromGoals,
            loadData,
            goToPreviousMatchesPage,
            goToNextMatchesPage,
            saveJornadaAttendance,
            finishJornada,
            reopenJornada,
            resetJornada,
            startMatch,
            saveScore,
            saveGoals,
            saveMatchPlayers,
            finishMatch,
            CalendarPlus,
            Check,
            Clock,
            RefreshCw,
            TriangleAlert,
            Trophy,
            Users
        }
    }
})
