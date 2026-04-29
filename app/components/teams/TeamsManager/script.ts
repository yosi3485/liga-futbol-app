import { computed, defineComponent, onMounted, ref } from 'vue'
import {
    Pencil,
    Plus,
    Search,
    Shield,
    Trash2
} from 'lucide-vue-next'

type TeamRow = {
    id: string
    name: string
}

export default defineComponent({
    name: 'TeamsManager',

    components: {
        Pencil,
        Plus,
        Search,
        Shield,
        Trash2
    },

    setup() {
        const supabase = useSupabase()
        const { message: appError } = useAppError()

        const teams = ref<TeamRow[]>([])
        const loading = ref(false)
        const saving = ref(false)
        const errorMessage = ref('')
        const successMessage = ref('')

        const editingTeamId = ref<string | null>(null)
        const formName = ref('')
        const teamPendingDelete = ref<TeamRow | null>(null)
        const searchTerm = ref('')

        const sortedTeams = computed(() => {
            return [...teams.value].sort((a, b) => a.name.localeCompare(b.name))
        })

        const filteredTeams = computed(() => {
            const normalizedSearch = searchTerm.value.trim().toLowerCase()

            if (!normalizedSearch) return sortedTeams.value

            return sortedTeams.value.filter((team) => {
                return team.name.toLowerCase().includes(normalizedSearch)
            })
        })

        const isEditing = computed(() => Boolean(editingTeamId.value))

        async function loadTeams() {
            loading.value = true
            errorMessage.value = ''

            try {
                const { data, error } = await supabase
                    .from('teams')
                    .select('id, name')
                    .order('name', { ascending: true })

                if (error) throw error

                teams.value = data ?? []
            } catch (error) {
                errorMessage.value = appError(error, 'Error cargando equipos')
            } finally {
                loading.value = false
            }
        }

        function resetForm() {
            editingTeamId.value = null
            formName.value = ''
            errorMessage.value = ''
        }

        function startEditing(team: TeamRow) {
            editingTeamId.value = team.id
            formName.value = team.name
            errorMessage.value = ''
            successMessage.value = ''
        }

        async function saveTeam() {
            errorMessage.value = ''
            successMessage.value = ''

            if (!formName.value.trim()) {
                errorMessage.value = 'Escribe el nombre del equipo.'
                return
            }

            const duplicatedName = teams.value.some((team) => {
                return (
                    team.id !== editingTeamId.value &&
                    team.name.trim().toLowerCase() === formName.value.trim().toLowerCase()
                )
            })

            if (duplicatedName) {
                errorMessage.value = 'Ya existe un equipo con ese nombre.'
                return
            }

            saving.value = true

            try {
                if (editingTeamId.value) {
                    const { error } = await supabase
                        .from('teams')
                        .update({ name: formName.value.trim() })
                        .eq('id', editingTeamId.value)

                    if (error) throw error

                    successMessage.value = 'Equipo actualizado correctamente.'
                } else {
                    const { error } = await supabase
                        .from('teams')
                        .insert({ name: formName.value.trim() })

                    if (error) throw error

                    successMessage.value = 'Equipo creado correctamente.'
                }

                await loadTeams()
                resetForm()
            } catch (error) {
                errorMessage.value = appError(error, 'Error guardando equipo')
            } finally {
                saving.value = false
            }
        }

        function requestDeleteTeam(team: TeamRow) {
            errorMessage.value = ''
            successMessage.value = ''
            teamPendingDelete.value = team
        }

        function cancelDeleteTeam() {
            if (saving.value) return

            teamPendingDelete.value = null
        }

        async function confirmDeleteTeam() {
            if (!teamPendingDelete.value) return

            const team = teamPendingDelete.value

            errorMessage.value = ''
            successMessage.value = ''
            saving.value = true

            try {
                const { error } = await supabase
                    .from('teams')
                    .delete()
                    .eq('id', team.id)

                if (error) throw error

                successMessage.value = 'Equipo eliminado correctamente.'
                await loadTeams()

                if (editingTeamId.value === team.id) {
                    resetForm()
                }

                teamPendingDelete.value = null
            } catch (error) {
                errorMessage.value = appError(error, 'Error eliminando equipo')
            } finally {
                saving.value = false
            }
        }

        onMounted(() => {
            loadTeams()
        })

        return {
            teams,
            loading,
            saving,
            errorMessage,
            successMessage,
            editingTeamId,
            isEditing,
            formName,
            teamPendingDelete,
            searchTerm,
            sortedTeams,
            filteredTeams,
            resetForm,
            startEditing,
            saveTeam,
            requestDeleteTeam,
            cancelDeleteTeam,
            confirmDeleteTeam,
            Pencil,
            Plus,
            Search,
            Shield,
            Trash2
        }
    }
})
