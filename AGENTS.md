# AGENTS.md

## Proyecto

Liga de Fútbol (LSF)

Aplicación mobile-first tipo PWA para administrar una liga de fútbol amateur.

La app debe sentirse como una app nativa mobile, no como una web tradicional.

Stack principal:

* Nuxt 4
* Vue 3
* TypeScript
* TailwindCSS v4
* Lucide Icons
* Supabase
* PWA support

El objetivo es reemplazar completamente la app anterior de basket y mejorar toda la arquitectura desde cero.

---

## Filosofía del proyecto

Este proyecto NO debe construirse rápido sacrificando estructura.

Debe mantenerse:

* limpio
* escalable
* reusable
* profesional
* mobile-first
* fácil de mantener

No queremos código improvisado ni componentes gigantes.

Siempre preferimos:

* componentes reutilizables
* estructura clara
* separación de responsabilidades
* UI consistente
* lógica limpia

Nunca usar Bootstrap.

Nunca usar Font Awesome.

Usar Lucide para iconografía.

---

## Estructura de componentes

No usamos `<script setup>` dentro del `.vue`.

Usamos estructura separada:

```text
Componente/
├── index.vue
└── script.ts
```

Ejemplo:

```text
app/components/ui/StatCard/
├── index.vue
└── script.ts
```

### Regla importante

En `index.vue` usamos:

```vue
<script lang="ts" src="./script.ts"></script>
```

Y en `script.ts` usamos:

```ts
export default defineComponent({
  setup() {
    return {}
  }
})
```

NO usar:

```vue
<script setup src="">
```

porque rompe el acceso correcto al template.

---

## Estructura actual

```text
app/
├── app.vue
├── assets/
│   └── css/
│       └── main.css
│
├── layouts/
│   └── default.vue
│
├── plugins/
│   └── supabase.client.ts
│
├── composables/
│   └── useSupabase.ts
│
├── components/
│   ├── ui/
│   │   ├── AppHeader/
│   │   ├── BottomNav/
│   │   ├── SectionTitle/
│   │   ├── StatCard/
│   │   └── AppButton/
│   │
│   ├── teams/
│   │   └── TeamsManager/
│   │
│   ├── players/
│   │   └── PlayersManager/
│   │
│   └── matches/
│       └── NewMatchFlow/
│
├── pages/
│   ├── index.vue
│   ├── jornadas.vue
│   ├── tabla.vue
│   │
│   ├── jugadores/
│   │   └── index.vue
│   │
│   └── admin/
│       ├── index.vue
│       ├── equipos.vue
│       ├── jugadores.vue
│       └── partidos.vue
```

---

## UI base

Ya existen:

* AppHeader
* BottomNav
* SectionTitle
* StatCard
* AppButton

Todos deben mantenerse reutilizables.

Los próximos reusable components serán:

* AppInput
* AppSelect
* EmptyState
* AppBadge
* AppModal
* ConfirmDialog
* AppCard

No duplicar UI innecesariamente.

---

## Navegación principal

Tabs principales:

* Inicio
* Jornadas
* Tabla
* Jugadores
* Admin

Bottom navigation mobile-first.

No usar dropdowns raros para tabs.

Debe sentirse nativo.

---

## Supabase

Ya conectado correctamente.

Proyecto creado y funcional.

Tablas actuales:

### teams

```sql
id
name
created_at
```

### players

```sql
id
name
team_id
jersey_number
is_active
created_at
```

### matches

```sql
id
played_at
team_a_id
team_b_id
team_a_score
team_b_score
status
created_at
```

### match_players

```sql
id
match_id
player_id
team_id
created_at
```

### player_match_stats

```sql
id
match_id
player_id
goals
assists
yellow_cards
red_cards
created_at
```

Actualmente estamos usando policies TEMP para desarrollo con anon access.

Luego se migrará a auth real con admin roles.

---

## MVP actual

Ya funcional:

### Equipos

CRUD completo:

* crear
* editar
* eliminar

### Jugadores

En progreso:

* crear
* editar
* activar / inactivar
* eliminar

Luego:

### Partidos

Luego:

### Tabla

Luego:

### Dashboard

Luego:

### Auth

---

## Reglas funcionales importantes

### Jornadas

Una jornada = un día.

Si cambia el día:

NO mostrar partidos pendientes del día anterior como si fueran actuales.

Evitar confusión.

---

### Partidos

Nunca se debe comenzar un nuevo partido si existe uno en progreso sin finalizar.

Debe advertirse:

"Todavía tienes un partido en progreso"

No duplicar stats si se guarda nuevamente un partido ya guardado.

Guardar != duplicar estadísticas.

---

### Refuerzos

Muy importante:

Si juega:

Equipo A vs Equipo B

y Equipo B necesita refuerzo:

puede usar un jugador de:

* Equipo A
* Equipo C

Ese jugador suma stats para ese partido

PERO:

NO cambia su equipo base permanente.

Solo refuerza ese día.

El cambio permanente de equipo solo ocurre desde el perfil del jugador.

Además:

si un jugador ya fue seleccionado como refuerzo para Equipo A

debe salir disabled para Equipo B.

Evitar doble selección.

---

### Tabla

Debe existir:

## Home

Con cards de resumen:

* líder actual
* último partido
* goleador general
* líder de asistencias
* récord de goles en una jornada
* récord de asistencias en una jornada

## Tabla

Separada de Home.

Debe permitir:

* standings generales
* head-to-head entre equipos
* histórico total
* resultado de última jornada entre dos equipos

No confundir total histórico con últimas jornadas.

---

### MVP votación

Cuando un jugador participa en una jornada:

si no ha votado MVP todavía:

mostrar aviso persistente:

"Ve aquí para votar por el MVP"

hasta que vote.

---

## Admin

Tab:

Usuarios ya NO existe.

Se eliminó.

Solo:

* Equipos
* Jugadores
* Partidos

Alta rápida y jugadores fueron fusionados.

Ahora crear jugador incluye:

* nombre
* equipo
* número
* estado
* email
* contraseña

Todo en un solo flujo.

No crear jugadores en dos pasos.

---

## Estilo visual

Queremos look:

* clean
* premium
* moderno
* SaaS
* app real
* native feeling

NO look Bootstrap.

NO look admin panel viejo.

Lucide icons.

Cards limpias.

Spacing correcto.

Typography limpia.

Mucho cuidado con spacing y paddings.

Eso importa mucho.

---

## Reglas de desarrollo

Nunca responder con:

"agrega esto"

si implica romper cosas existentes.

Siempre:

dar código completo listo para copiar y pegar.

No dar snippets sueltos si requieren contexto.

Cada cambio debe respetar features existentes.

No eliminar features sin avisar.

No inventar componentes que no existen.

No asumir archivos que no existen.

Mantener consistencia con el proyecto real.

---

## Prioridad inmediata

Ahora mismo:

seguir PlayersManager hasta dejarlo sólido.

Luego:

Partidos.

Luego:

Tabla.

Luego:

Dashboard.

Luego:

Auth real con Supabase.

Ese es el orden.
