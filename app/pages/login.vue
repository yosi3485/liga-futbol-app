<script lang="ts">
import { defineComponent, onMounted, ref } from 'vue'

export default defineComponent({
    name: 'LoginPage',
    setup() {
        const supabase = useSupabase()
        const { isAdmin, isAdminLoading, refreshAdminAccess } = useAdminAccess()
        const email = ref('')
        const password = ref('')
        const loading = ref(false)
        const errorMessage = ref('')
        const successMessage = ref('')

        async function redirectAfterLogin() {
            if (isAdminLoading.value) {
                await refreshAdminAccess()
            } else if (!isAdmin.value) {
                await refreshAdminAccess()
            }
            await navigateTo(isAdmin.value ? '/admin' : '/')
        }

        async function login() {
            errorMessage.value = ''
            successMessage.value = ''
            loading.value = true
            const { error } = await supabase.auth.signInWithPassword({
                email: email.value.trim().toLowerCase(),
                password: password.value
            })
            loading.value = false
            if (error) {
                errorMessage.value = error.message
                return
            }
            await redirectAfterLogin()
        }

        async function resetPassword() {
            errorMessage.value = ''
            successMessage.value = ''
            const normalizedEmail = email.value.trim().toLowerCase()
            if (!normalizedEmail) {
                errorMessage.value = 'Escribe tu email para recuperar contraseña.'
                return
            }
            const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail)
            if (error) {
                errorMessage.value = error.message
                return
            }
            successMessage.value = 'Te enviamos un correo para restablecer tu contraseña.'
        }

        onMounted(async () => {
            const { data } = await supabase.auth.getUser()
            if (!data.user) return
            await redirectAfterLogin()
        })

        return { email, password, loading, errorMessage, successMessage, login, resetPassword }
    }
})
</script>

<template>
  <section class="mx-auto w-full max-w-md space-y-4">
    <UiSectionTitle title="Acceso" subtitle="Inicia sesión para votar y administrar" />
    <div v-if="errorMessage" class="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{{ errorMessage }}</div>
    <div v-if="successMessage" class="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">{{ successMessage }}</div>
    <UiAppCard>
      <form class="grid gap-3" @submit.prevent="login">
        <UiAppInput v-model="email" label="Email" type="email" placeholder="correo@liga.com" :disabled="loading" />
        <UiAppInput v-model="password" label="Contraseña" type="password" placeholder="••••••••" :disabled="loading" />
        <UiAppButton type="submit" :disabled="loading">{{ loading ? 'Entrando...' : 'Entrar' }}</UiAppButton>
        <button type="button" class="text-xs font-semibold text-slate-400 hover:text-slate-200" @click="resetPassword">
          Olvidé mi contraseña
        </button>
      </form>
    </UiAppCard>
  </section>
</template>
