import { defineComponent } from 'vue'
import {
    CalendarPlus,
    Shield,
    Users
} from 'lucide-vue-next'

export default defineComponent({
    name: 'AdminShell',

    setup() {
        const route = useRoute()

        const adminItems = [
            {
                to: '/admin/equipos',
                label: 'Equipos',
                icon: Shield
            },
            {
                to: '/admin/jugadores',
                label: 'Jugadores',
                icon: Users
            },
            {
                to: '/admin/partidos',
                label: 'Partidos',
                icon: CalendarPlus
            }
        ]

        function isActive(path: string) {
            return route.path === path || route.path.startsWith(`${path}/`)
        }

        return {
            adminItems,
            isActive
        }
    }
})
