import { defineComponent } from 'vue'
import { ChevronDown } from 'lucide-vue-next'

export default defineComponent({
    name: 'AppSelect',

    components: {
        ChevronDown
    },

    props: {
        modelValue: {
            type: [String, Number, Boolean],
            default: ''
        },
        label: {
            type: String,
            default: ''
        },
        disabled: {
            type: Boolean,
            default: false
        }
    },

    emits: ['update:modelValue'],

    setup(_, { emit }) {
        function updateValue(event: Event) {
            const target = event.target as HTMLSelectElement
            const selectedOption = target.selectedOptions[0] as HTMLOptionElement & {
                _value?: string | number | boolean
            }

            emit('update:modelValue', selectedOption?._value ?? target.value)
        }

        return {
            updateValue
        }
    }
})
