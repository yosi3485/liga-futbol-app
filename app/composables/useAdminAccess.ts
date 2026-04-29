import { computed, ref } from 'vue'

const isAdminState = ref(false)
const loadingState = ref(true)
const initialized = ref(false)

export function useAdminAccess() {
    const supabase = useSupabase()

    async function resolveRole() {
        const { data: userRes } = await supabase.auth.getUser()
        const userId = userRes.user?.id
        if (!userId) {
            isAdminState.value = false
            loadingState.value = false
            return
        }
        const { data } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .maybeSingle()
        isAdminState.value = data?.role === 'admin'
        loadingState.value = false
    }

    if (!initialized.value && import.meta.client) {
        initialized.value = true
        resolveRole()
        supabase.auth.onAuthStateChange(() => {
            loadingState.value = true
            resolveRole()
        })
    }

    return {
        isAdmin: computed(() => isAdminState.value),
        isAdminLoading: computed(() => loadingState.value),
        refreshAdminAccess: resolveRole
    }
}
