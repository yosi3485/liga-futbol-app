export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/admin')) return

  const { isAdmin, isAdminLoading, refreshAdminAccess } = useAdminAccess()

  if (isAdminLoading.value) {
    await refreshAdminAccess()
  } else if (!isAdmin.value) {
    await refreshAdminAccess()
  }

  if (isAdmin.value) return

  return navigateTo('/login')
})

