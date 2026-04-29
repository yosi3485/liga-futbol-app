import type { SupabaseClient } from '@supabase/supabase-js'

export const useSupabase = () => {
    const { $supabase } = useNuxtApp()

    return $supabase as SupabaseClient
}
