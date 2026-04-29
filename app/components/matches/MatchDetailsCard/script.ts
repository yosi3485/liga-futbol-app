import { defineComponent } from 'vue'
import { Trophy } from 'lucide-vue-next'

type MatchDetail = { playerId: string; playerName: string; goals: number; ownGoals: number }

export default defineComponent({
    name: 'MatchDetailsCard',
    components: { Trophy },
    props: {
        teamAName: { type: String, required: true },
        teamBName: { type: String, required: true },
        scoreA: { type: Number, required: true },
        scoreB: { type: Number, required: true },
        isWinnerA: { type: Boolean, required: true },
        isWinnerB: { type: Boolean, required: true },
        timeLabel: { type: String, required: true },
        winnerReasonLabel: { type: String, default: '' },
        winnerName: { type: String, default: '' },
        details: { type: Array as () => MatchDetail[], default: () => [] }
    }
})
