import { defineComponent } from 'vue'

export default defineComponent({
    name: 'AppCard',

    props: {
        compact: {
            type: Boolean,
            default: false
        }
    }
})
