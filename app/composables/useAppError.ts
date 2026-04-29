export function useAppError() {
    function message(error: unknown, fallback: string) {
        if (!error || typeof error !== 'object') return fallback
        const e = error as { code?: string; message?: string; details?: string }
        if (e.code === '42501') return 'No tienes permisos para esta acción.'
        if (e.code === 'PGRST301') return 'Tu sesión expiró. Inicia sesión de nuevo.'
        if (e.message) return e.message
        return fallback
    }
    return { message }
}
