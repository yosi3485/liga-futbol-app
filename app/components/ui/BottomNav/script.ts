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
    name: 'BottomNav',

    setup() {
        const route = useRoute()
        const { isAdmin } = useAdminAccess()

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

        return {
            navItems,
            isActive
        }
    }
})
