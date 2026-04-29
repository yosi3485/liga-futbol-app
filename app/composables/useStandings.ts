export type TeamBase = {
    id: string
    name: string
}

export type MatchBase = {
    id?: string
    played_at: string
    team_a_id: string
    team_b_id: string
    team_a_score: number | null
    team_b_score: number | null
    winner_team_id?: string | null
}

export type StandingRow = {
    teamId: string
    teamName: string
    pj: number
    g: number
    p: number
    gf: number
    gc: number
    dg: number
    pts: number
    form: ('W' | 'L' | 'D')[]
}

export function useStandings(teams: TeamBase[], matches: MatchBase[]) {
    const sortedMatches = [...matches].sort((a, b) => {
        const byPlayedAt = new Date(a.played_at).getTime() - new Date(b.played_at).getTime()
        if (byPlayedAt !== 0) return byPlayedAt
        return (a.id ?? '').localeCompare(b.id ?? '')
    })

    const rowsByTeam = new Map<string, StandingRow>()

    teams.forEach((team) => {
        rowsByTeam.set(team.id, {
            teamId: team.id,
            teamName: team.name,
            pj: 0,
            g: 0,
            p: 0,
            gf: 0,
            gc: 0,
            dg: 0,
            pts: 0,
            form: []
        })
    })

    sortedMatches.forEach((match) => {
        const teamA = rowsByTeam.get(match.team_a_id)
        const teamB = rowsByTeam.get(match.team_b_id)
        if (!teamA || !teamB) return

        const scoreA = match.team_a_score ?? 0
        const scoreB = match.team_b_score ?? 0

        teamA.pj += 1
        teamB.pj += 1
        teamA.gf += scoreA
        teamA.gc += scoreB
        teamB.gf += scoreB
        teamB.gc += scoreA

        if (scoreA > scoreB) {
            teamA.g += 1
            teamA.pts += 3
            teamB.p += 1
            teamA.form.push('W')
            teamB.form.push('L')
            return
        }

        if (scoreB > scoreA) {
            teamB.g += 1
            teamB.pts += 3
            teamA.p += 1
            teamA.form.push('L')
            teamB.form.push('W')
            return
        }

        teamA.form.push('D')
        teamB.form.push('D')
    })

    return [...rowsByTeam.values()]
        .map((row) => ({
            ...row,
            dg: row.gf - row.gc,
            form: row.form.slice(-5).reverse()
        }))
        .sort((a, b) => {
            if (b.pts !== a.pts) return b.pts - a.pts
            if (b.dg !== a.dg) return b.dg - a.dg
            if (b.gf !== a.gf) return b.gf - a.gf
            return a.teamName.localeCompare(b.teamName)
        })
}
