<script lang="ts" src="./script.ts"></script>

<template>
  <div class="rounded-xl border border-slate-800 bg-slate-900 px-3 py-3">
    <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <p class="truncate text-right text-sm" :class="isWinnerA ? 'font-bold text-white' : 'font-semibold text-slate-400'">{{ teamAName }}</p>
      <p class="rounded-lg bg-slate-950 px-3 py-1 text-sm font-black text-white">{{ scoreA }} - {{ scoreB }}</p>
      <p class="truncate text-left text-sm" :class="isWinnerB ? 'font-bold text-white' : 'font-semibold text-slate-400'">{{ teamBName }}</p>
    </div>
    <div class="mt-2 flex items-center justify-center gap-2 text-xs text-slate-400">
      <span>{{ timeLabel }}</span>
      <span v-if="winnerReasonLabel">· {{ winnerReasonLabel }}</span>
      <span v-if="winnerName" class="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 font-semibold text-emerald-300">
        <Trophy class="h-3.5 w-3.5" />
        {{ winnerName }}
      </span>
    </div>
    <div v-if="details.length" class="mt-3 space-y-1 border-t border-slate-800 pt-2 text-xs text-slate-300">
      <p v-for="item in details" :key="item.playerId" class="flex items-center justify-between">
        <span class="truncate">{{ item.playerName }}</span>
        <span class="shrink-0">{{ item.goals }} G<span v-if="item.ownGoals"> · {{ item.ownGoals }} AG</span></span>
      </p>
    </div>
  </div>
</template>
