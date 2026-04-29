import { defineComponent } from 'vue'

export default defineComponent({
    name: 'AppInput',

    props: {
        modelValue: {
            type: [String, Number],
            default: ''
        },
        label: {
            type: String,
            default: ''
        },
        type: {
            type: String,
            default: 'text'
        },
        placeholder: {
            type: String,
            default: ''
        },
        min: {
            type: [String, Number],
            default: undefined
        },
        max: {
            type: [String, Number],
            default: undefined
        },
        disabled: {
            type: Boolean,
            default: false
        }
    },

    emits: ['update:modelValue'],

    setup(_, { emit }) {
        function updateValue(event: Event) {
            const target = event.target as HTMLInputElement
            emit('update:modelValue', target.value)
        }

        return {
            updateValue
        }
    }
})
