import { defineComponent } from 'vue'

export default defineComponent({
    name: 'EmptyState',

    props: {
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            default: ''
        },
        icon: {
            type: [Object, Function],
            default: null
        }
    }
})
