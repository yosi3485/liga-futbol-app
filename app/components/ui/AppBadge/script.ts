import { computed, defineComponent } from 'vue'

export default defineComponent({
    name: 'AppBadge',

    props: {
        variant: {
            type: String as () => 'success' | 'neutral' | 'warning' | 'danger',
            default: 'neutral'
        }
    },

    setup(props) {
        const variantClasses = computed(() => {
            const variants = {
                success: 'bg-emerald-500/10 text-emerald-300',
                neutral: 'bg-slate-800 text-slate-300',
                warning: 'bg-amber-500/10 text-amber-300',
                danger: 'bg-red-500/10 text-red-300'
            }

            return variants[props.variant]
        })

        return {
            variantClasses
        }
    }
})
