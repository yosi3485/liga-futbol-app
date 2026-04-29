import { computed, defineComponent } from 'vue'
import {
    AlertTriangle,
    Info
} from 'lucide-vue-next'

export default defineComponent({
    name: 'ConfirmDialog',

    props: {
        open: {
            type: Boolean,
            default: false
        },
        title: {
            type: String,
            required: true
        },
        message: {
            type: String,
            default: ''
        },
        confirmLabel: {
            type: String,
            default: 'Confirmar'
        },
        cancelLabel: {
            type: String,
            default: 'Cancelar'
        },
        loadingLabel: {
            type: String,
            default: 'Procesando...'
        },
        loading: {
            type: Boolean,
            default: false
        },
        variant: {
            type: String as () => 'danger' | 'neutral',
            default: 'neutral'
        }
    },

    emits: ['cancel', 'confirm'],

    setup(props, { emit }) {
        const confirmVariant = computed(() => {
            return props.variant === 'danger' ? 'danger' : 'primary'
        })

        const iconComponent = computed(() => {
            return props.variant === 'danger' ? AlertTriangle : Info
        })

        const variantClasses = computed(() => {
            if (props.variant === 'danger') {
                return {
                    icon: 'bg-red-500/10 text-red-300'
                }
            }

            return {
                icon: 'bg-emerald-500/10 text-emerald-300'
            }
        })

        function cancel() {
            if (props.loading) return

            emit('cancel')
        }

        function confirm() {
            emit('confirm')
        }

        return {
            confirmVariant,
            iconComponent,
            variantClasses,
            cancel,
            confirm
        }
    }
})
