<script setup lang="ts">
const supabase = useSupabase()

const loading = ref(true)
const message = ref('')
const errorMessage = ref('')

onMounted(async () => {
  const { data, error } = await supabase
      .from('teams')
      .select('*')
      .limit(5)

  loading.value = false

  if (error) {
    errorMessage.value = error.message
    console.error(error)
    return
  }

  message.value = `Conectado correctamente. Registros encontrados: ${data?.length ?? 0}`
  console.log(data)
})
</script>

<template>
  <section class="space-y-4">
    <UiSectionTitle
        title="Test Supabase"
        subtitle="Verificando conexión"
    />

    <div class="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <p v-if="loading" class="text-slate-400">
        Probando conexión...
      </p>

      <p v-else-if="errorMessage" class="text-red-400">
        Error: {{ errorMessage }}
      </p>

      <p v-else class="text-emerald-400">
        {{ message }}
      </p>
    </div>
  </section>
</template>
