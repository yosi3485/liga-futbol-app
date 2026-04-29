import { defineComponent } from 'vue'

export default defineComponent({
    name: 'SectionTitle',

    props: {
        title: {
            type: String,
            required: true
        },
        subtitle: {
            type: String,
            default: ''
        }
    }
})
