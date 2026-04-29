import { computed, defineComponent } from 'vue'
import {
    CalendarDays,
    House,
    Medal,
    Shield,
    Trophy,
    Users
} from 'lucide-vue-next'

export default defineComponent({
    name: 'AppHeader',

    components: {
        Trophy
    },

    setup() {
        const supabase = useSupabase()
        const route = useRoute()
        const { isAdmin } = useAdminAccess()
        const userEmail = useState<string | null>('auth_user_email', () => null)
        const authLoading = useState<boolean>('auth_loading', () => true)

        const navItems = computed(() => [
            {
                to: '/',
                label: 'Inicio',
                icon: House
            },
            {
                to: '/jornadas',
                label: 'Jornadas',
                icon: CalendarDays
            },
            {
                to: '/tabla',
                label: 'Tabla',
                icon: Trophy
            },
            {
                to: '/jugadores',
                label: 'Jugadores',
                icon: Users
            },
            {
                to: '/mvp',
                label: 'MVP',
                icon: Medal
            },
            ...(isAdmin.value
                ? [{
                to: '/admin',
                label: 'Admin',
                icon: Shield
                }]
                : [])
        ])

        function isActive(path: string) {
            if (path === '/') {
                return route.path === '/'
            }

            return route.path.startsWith(path)
        }

        async function syncAuthState() {
            authLoading.value = true
            const { data } = await supabase.auth.getUser()
            userEmail.value = data.user?.email ?? null
            authLoading.value = false
        }

        async function signOut() {
            await supabase.auth.signOut()
            userEmail.value = null
        }

        if (import.meta.client) {
            syncAuthState()
            supabase.auth.onAuthStateChange(() => {
                syncAuthState()
            })
        }

        return {
            navItems,
            isActive,
            Trophy,
            userEmail,
            authLoading,
            signOut
        }
    }
})
