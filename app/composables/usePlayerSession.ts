import { computed, ref } from 'vue'

type PlayerSession = {
    playerId: string
    playerName: string
}

const STORAGE_KEY = 'lsf_player_session'
const session = ref<PlayerSession | null>(null)
const initialized = ref(false)

function readSession() {
    if (initialized.value || !import.meta.client) return
    initialized.value = true
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    try {
        session.value = JSON.parse(raw) as PlayerSession
    } catch {
        localStorage.removeItem(STORAGE_KEY)
        session.value = null
    }
}

export function usePlayerSession() {
    readSession()

    function setSession(next: PlayerSession | null) {
        session.value = next
        if (!import.meta.client) return
        if (!next) {
            localStorage.removeItem(STORAGE_KEY)
            return
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    }

    return {
        session: computed(() => session.value),
        setSession
    }
}
