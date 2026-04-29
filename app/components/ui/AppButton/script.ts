import { computed, defineComponent } from 'vue'

export default defineComponent({
    name: 'AppButton',

    props: {
        type: {
            type: String as () => 'button' | 'submit',
            default: 'button'
        },
        variant: {
            type: String as () => 'primary' | 'secondary' | 'danger',
            default: 'primary'
        },
        disabled: {
            type: Boolean,
            default: false
        }
    },

    setup(props) {
        const variantClasses = computed(() => {
            const variants = {
                primary: 'bg-emerald-500 text-slate-950 hover:bg-emerald-400',
                secondary: 'bg-slate-800 text-white hover:bg-slate-700',
                danger: 'bg-red-500 text-white hover:bg-red-400'
            }

            return variants[props.variant]
        })

        return {
            variantClasses
        }
    }
})
