import { computed, defineComponent, onMounted, ref } from 'vue'
import {
    Pencil,
    Search,
    Trash2,
    UserCheck,
    UserRoundPlus,
    UserX,
    Users
} from 'lucide-vue-next'

type TeamRow = {
    id: string
    name: string
}

type PlayerRow = {
    id: string
    name: string
    team_id: string | null
    jersey_number: number | null
    is_active: boolean
    email: string | null
}

export default defineComponent({
    name: 'PlayersManager',

    components: {
        Pencil,
        Search,
        Trash2,
        UserCheck,
        UserRoundPlus,
        UserX,
        Users
    },

    setup() {
        const supabase = useSupabase()
        const { message: appError } = useAppError()

        const teams = ref<TeamRow[]>([])
        const players = ref<PlayerRow[]>([])
        const loading = ref(false)
        const saving = ref(false)
        const errorMessage = ref('')
        const successMessage = ref('')

        const editingPlayerId = ref<string | null>(null)
        const formName = ref('')
        const formTeamId = ref('')
        const formJerseyNumber = ref('')
        const formIsActive = ref(true)
        const formEmail = ref('')
        const formAuthPassword = ref('')
        const searchTerm = ref('')
        const activeFilter = ref<'all' | 'active' | 'inactive'>('all')
        const playerPendingDelete = ref<PlayerRow | null>(null)

        const teamsMap = computed(() => {
            return new Map(teams.value.map((team) => [team.id, team.name]))
        })

        const sortedPlayers = computed(() => {
            return [...players.value].sort((a, b) => a.name.localeCompare(b.name))
        })

        const filteredPlayers = computed(() => {
            const normalizedSearch = searchTerm.value.trim().toLowerCase()

            return sortedPlayers.value.filter((player) => {
                const matchesSearch =
                    !normalizedSearch ||
                    player.name.toLowerCase().includes(normalizedSearch) ||
                    (teamsMap.value.get(player.team_id ?? '') ?? '')
                        .toLowerCase()
                        .includes(normalizedSearch) ||
                    String(player.jersey_number ?? '').includes(normalizedSearch)

                const matchesStatus =
                    activeFilter.value === 'all' ||
                    (activeFilter.value === 'active' && player.is_active) ||
                    (activeFilter.value === 'inactive' && !player.is_active)

                return matchesSearch && matchesStatus
            })
        })

        const activePlayersCount = computed(() => {
            return players.value.filter((player) => player.is_active).length
        })

        const inactivePlayersCount = computed(() => {
            return players.value.filter((player) => !player.is_active).length
        })

        const isEditing = computed(() => Boolean(editingPlayerId.value))

        const jerseyNumberValue = computed(() => {
            if (!formJerseyNumber.value.trim()) return null

            return Number(formJerseyNumber.value)
        })

        async function loadTeams() {
            const { data, error } = await supabase
                .from('teams')
                .select('id, name')
                .order('name', { ascending: true })

            if (error) throw error

            teams.value = data ?? []

            if (!formTeamId.value) {
                formTeamId.value = teams.value[0]?.id ?? ''
            }
        }

        async function loadPlayers() {
            const { data, error } = await supabase
                .from('players')
                .select('id, name, team_id, jersey_number, is_active, email')
                .order('name', { ascending: true })

            if (error) throw error

            players.value = data ?? []
        }

        async function loadData() {
            loading.value = true
            errorMessage.value = ''
            successMessage.value = ''

            try {
                await loadTeams()
                await loadPlayers()
            } catch (error) {
                errorMessage.value = appError(error, 'Error cargando jugadores')
            } finally {
                loading.value = false
            }
        }

        function resetForm() {
            editingPlayerId.value = null
            formName.value = ''
            formTeamId.value = teams.value[0]?.id ?? ''
            formJerseyNumber.value = ''
            formIsActive.value = true
            formEmail.value = ''
            formAuthPassword.value = ''
            errorMessage.value = ''
        }

        function startEditing(player: PlayerRow) {
            editingPlayerId.value = player.id
            formName.value = player.name
            formTeamId.value = player.team_id ?? ''
            formJerseyNumber.value = player.jersey_number?.toString() ?? ''
            formIsActive.value = player.is_active
            formEmail.value = player.email ?? ''
            formAuthPassword.value = ''
            errorMessage.value = ''
            successMessage.value = ''
        }

        function validateForm() {
            const name = formName.value.trim()

            if (!name) {
                return 'Escribe el nombre del jugador.'
            }

            if (!formTeamId.value) {
                return teams.value.length
                    ? 'Selecciona el equipo del jugador.'
                    : 'Primero crea un equipo para poder registrar jugadores.'
            }

            if (formJerseyNumber.value.trim()) {
                const jerseyNumber = jerseyNumberValue.value

                if (
                    jerseyNumber === null ||
                    !Number.isInteger(jerseyNumber) ||
                    jerseyNumber < 0 ||
                    jerseyNumber > 999
                ) {
                    return 'El número debe ser un entero entre 0 y 999.'
                }
            }
            if (!formEmail.value.trim()) return 'Escribe el email del jugador.'
            if (!/^\S+@\S+\.\S+$/.test(formEmail.value.trim())) return 'Email inválido.'
            if (!editingPlayerId.value && !formAuthPassword.value.trim()) {
                return 'Escribe una contraseña inicial.'
            }
            if (!editingPlayerId.value && formAuthPassword.value.trim().length < 6) {
                return 'La contraseña debe tener al menos 6 caracteres.'
            }

            const duplicatedName = players.value.some((player) => {
                return (
                    player.id !== editingPlayerId.value &&
                    player.name.trim().toLowerCase() === name.toLowerCase()
                )
            })
            const duplicatedEmail = players.value.some((player) => {
                return (
                    player.id !== editingPlayerId.value &&
                    (player.email ?? '').trim().toLowerCase() === formEmail.value.trim().toLowerCase()
                )
            })
            if (duplicatedEmail) return 'Ya existe un jugador con ese email.'

            if (duplicatedName) {
                return 'Ya existe un jugador con ese nombre.'
            }

            const duplicatedJersey = players.value.some((player) => {
                return (
                    player.id !== editingPlayerId.value &&
                    player.team_id === formTeamId.value &&
                    player.jersey_number !== null &&
                    player.jersey_number === jerseyNumberValue.value
                )
            })

            if (jerseyNumberValue.value !== null && duplicatedJersey) {
                return 'Ese número ya está asignado en este equipo.'
            }

            return ''
        }

        async function savePlayer() {
            errorMessage.value = ''
            successMessage.value = ''

            const validationError = validateForm()
            if (validationError) {
                errorMessage.value = validationError
                return
            }

            saving.value = true

            try {
                const payload = {
                    name: formName.value.trim(),
                    team_id: formTeamId.value,
                    jersey_number: jerseyNumberValue.value,
                    is_active: formIsActive.value,
                    email: formEmail.value.trim().toLowerCase()
                }

                if (editingPlayerId.value) {
                    const { error } = await supabase
                        .from('players')
                        .update(payload)
                        .eq('id', editingPlayerId.value)

                    if (error) throw error

                    successMessage.value = 'Jugador actualizado correctamente.'
                } else {
                    const { data: insertedPlayer, error } = await supabase
                        .from('players')
                        .insert(payload)
                        .select('id, email')
                        .single()

                    if (error) throw error
                    if (!insertedPlayer) throw new Error('No se pudo crear el jugador.')

                    const email = insertedPlayer.email?.trim().toLowerCase()
                    if (!email) throw new Error('Email inválido para crear el usuario.')

                    try {
                        const { data: sessionData } = await supabase.auth.getSession()
                        const accessToken = sessionData.session?.access_token ?? ''
                        if (!accessToken) {
                            throw new Error('No hay sesión admin activa para crear el usuario del jugador.')
                        }
                        const result = await $fetch<{ ok: boolean; userId: string }>(
                            '/api/admin/create-player-user',
                            {
                                method: 'POST',
                                headers: { Authorization: `Bearer ${accessToken}` },
                                body: {
                                    email,
                                    password: formAuthPassword.value.trim(),
                                    playerId: insertedPlayer.id
                                }
                            }
                        )
                        if (!result?.ok) throw new Error('No se pudo crear el usuario del jugador.')
                    } catch (error) {
                        // Rollback: avoid players without a working login.
                        await supabase.from('players').delete().eq('id', insertedPlayer.id)
                        throw error
                    }

                    successMessage.value = 'Jugador y usuario creados correctamente.'
                }

                await loadPlayers()
                resetForm()
            } catch (error) {
                errorMessage.value = appError(error, 'Error guardando jugador')
            } finally {
                saving.value = false
            }
        }

        async function togglePlayerActive(player: PlayerRow) {
            errorMessage.value = ''
            successMessage.value = ''
            saving.value = true

            try {
                const { error } = await supabase
                    .from('players')
                    .update({ is_active: !player.is_active })
                    .eq('id', player.id)

                if (error) throw error

                successMessage.value = player.is_active
                    ? 'Jugador marcado como inactivo.'
                    : 'Jugador marcado como activo.'

                await loadPlayers()

                if (editingPlayerId.value === player.id) {
                    formIsActive.value = !player.is_active
                }
            } catch (error) {
                errorMessage.value = appError(error, 'Error actualizando jugador')
            } finally {
                saving.value = false
            }
        }

        function requestDeletePlayer(player: PlayerRow) {
            errorMessage.value = ''
            successMessage.value = ''
            playerPendingDelete.value = player
        }

        function cancelDeletePlayer() {
            if (saving.value) return

            playerPendingDelete.value = null
        }

        async function confirmDeletePlayer() {
            if (!playerPendingDelete.value) return

            const player = playerPendingDelete.value

            errorMessage.value = ''
            successMessage.value = ''
            saving.value = true

            try {
                const { error } = await supabase
                    .from('players')
                    .delete()
                    .eq('id', player.id)

                if (error) throw error

                successMessage.value = 'Jugador eliminado correctamente.'
                await loadPlayers()

                if (editingPlayerId.value === player.id) {
                    resetForm()
                }

                playerPendingDelete.value = null
            } catch (error) {
                errorMessage.value = appError(error, 'Error eliminando jugador')
            } finally {
                saving.value = false
            }
        }

        onMounted(() => {
            loadData()
        })

        function updateJerseyNumber(event: Event) {
            const target = event.target as HTMLInputElement
            formJerseyNumber.value = target.value
        }

        return {
            teams,
            sortedPlayers,
            filteredPlayers,
            loading,
            saving,
            errorMessage,
            successMessage,
            editingPlayerId,
            isEditing,
            formName,
            formTeamId,
            formJerseyNumber,
            formIsActive,
            formEmail,
            formAuthPassword,
            searchTerm,
            activeFilter,
            playerPendingDelete,
            activePlayersCount,
            inactivePlayersCount,
            teamsMap,
            resetForm,
            startEditing,
            savePlayer,
            togglePlayerActive,
            requestDeletePlayer,
            cancelDeletePlayer,
            confirmDeletePlayer,
            updateJerseyNumber,
            Pencil,
            Search,
            Trash2,
            UserCheck,
            UserRoundPlus,
            UserX,
            Users
        }
    }
})
