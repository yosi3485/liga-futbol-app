import { defineComponent, type Component, type PropType } from 'vue'

export default defineComponent({
    name: 'StatCard',

    props: {
        label: {
            type: String,
            required: true
        },
        value: {
            type: [String, Number],
            required: true
        },
        subtitle: {
            type: String,
            default: ''
        },
        icon: {
            // Vue components (like lucide-vue-next icons) are functions in Vue 3,
            // so accept both Function and Object to avoid noisy warnings.
            type: [Object, Function] as PropType<Component | null>,
            default: null
        }
    }
})
