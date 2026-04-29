export default defineNuxtRouteMiddleware((to) => {
    if (!to.path.startsWith('/admin')) return
    if (!import.meta.client) return navigateTo('/')

    const supabase = useSupabase()

    return supabase.auth.getUser().then(async ({ data }) => {
        const userId = data.user?.id
        if (!userId) return navigateTo('/')

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .maybeSingle()

        if (profile?.role !== 'admin') return navigateTo('/')
    })
})
