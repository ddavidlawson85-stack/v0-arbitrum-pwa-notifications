import { NextResponse } from "next/server"
import { fetchTallyProposals } from "@/lib/api/tally"
import { fetchSnapshotProposals } from "@/lib/api/snapshot"
import { fetchDiscourseTopics } from "@/lib/api/discourse"

export const dynamic = "force-dynamic"
export const revalidate = 300 // Revalidate every 5 minutes

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const source = searchParams.get("source")
    const status = searchParams.get("status")
    const limit = Number.parseInt(searchParams.get("limit") || "100") // Increased limit to ensure all proposals are included

    console.log("[v0] Fetching proposals from APIs...")

    const [tallyProposals, snapshotProposals, discourseTopics] = await Promise.allSettled([
      fetchTallyProposals(),
      fetchSnapshotProposals(),
      fetchDiscourseTopics(),
    ])

    const tallyData =
      tallyProposals.status === "fulfilled"
        ? tallyProposals.value.map((p) => {
            const now = Date.now()
            const endTime = new Date(p.end.timestamp).getTime()
            const startTime = new Date(p.start.timestamp).getTime()

            let status = "pending"
            const tallyStatus = p.status.toLowerCase()

            if (tallyStatus.includes("executed") || now > endTime) {
              status = "closed"
            } else if (now >= startTime && now <= endTime) {
              status = "active"
            }

            let forVotes = 0
            let againstVotes = 0

            if (p.voteStats && Array.isArray(p.voteStats)) {
              console.log(`[v0] Tally proposal "${p.title}" voteStats:`, JSON.stringify(p.voteStats, null, 2))

              const forStat = p.voteStats.find(
                (stat: any) => stat.type.toLowerCase() === "for" || stat.type.toLowerCase() === "yes",
              )
              const againstStat = p.voteStats.find(
                (stat: any) => stat.type.toLowerCase() === "against" || stat.type.toLowerCase() === "no",
              )

              if (forStat?.votesCount) {
                forVotes = Number.parseFloat(forStat.votesCount)
                console.log(`[v0] For votes raw: ${forStat.votesCount}, parsed: ${forVotes}`)
              }
              if (againstStat?.votesCount) {
                againstVotes = Number.parseFloat(againstStat.votesCount)
                console.log(`[v0] Against votes raw: ${againstStat.votesCount}, parsed: ${againstVotes}`)
              }
            } else {
              console.log(`[v0] Tally proposal "${p.title}" has no voteStats`)
            }

            return {
              id: p.id,
              external_id: p.id,
              source: "tally" as const,
              title: p.title,
              description: null,
              author: p.proposer || "Unknown",
              status,
              for_votes: forVotes,
              against_votes: againstVotes,
              quorum: 0,
              url: `https://www.tally.xyz/gov/arbitrum/proposal/${p.id}`,
              voting_ends_at: p.end.timestamp,
              voting_starts_at: p.start.timestamp,
              created_at: p.start.timestamp,
              updated_at: p.end.timestamp,
            }
          })
        : []

    if (tallyProposals.status === "rejected") {
      console.error("[v0] Tally API error:", tallyProposals.reason)
    }

    const snapshotData =
      snapshotProposals.status === "fulfilled"
        ? snapshotProposals.value.map((p) => {
            const now = Date.now() / 1000
            let status = "pending"
            if (now >= p.start && now <= p.end) {
              status = "active"
            } else if (now > p.end) {
              status = "closed"
            }

            const displayAuthor = p.authorName || `${p.author.slice(0, 6)}...${p.author.slice(-4)}`

            return {
              id: p.id,
              external_id: p.id,
              source: "snapshot" as const,
              title: p.title,
              description: null,
              author: displayAuthor,
              status,
              for_votes: p.scores[0] || 0,
              against_votes: p.scores[1] || 0,
              quorum: p.quorum,
              url: p.link || `https://snapshot.org/#/arbitrumfoundation.eth/proposal/${p.id}`,
              voting_ends_at: new Date(p.end * 1000).toISOString(),
              voting_starts_at: new Date(p.start * 1000).toISOString(),
              created_at: new Date(p.start * 1000).toISOString(),
              updated_at: new Date(p.end * 1000).toISOString(),
            }
          })
        : []

    if (snapshotProposals.status === "rejected") {
      console.error("[v0] Snapshot API error:", snapshotProposals.reason)
    }

    const discourseData =
      discourseTopics.status === "fulfilled"
        ? discourseTopics.value.slice(0, 10).map((topic) => ({
            id: `discourse-${topic.id}`,
            external_id: String(topic.id),
            source: "discourse" as const,
            title: topic.title,
            description: topic.excerpt || null,
            author: topic.creator_name || topic.creator_username || "Unknown User",
            status: "discussion" as const,
            for_votes: 0,
            against_votes: 0,
            quorum: 0,
            url: `https://forum.arbitrum.foundation/t/${topic.id}`,
            voting_ends_at: topic.last_posted_at,
            voting_starts_at: topic.created_at,
            created_at: topic.created_at,
            updated_at: topic.last_posted_at,
            replies: topic.reply_count,
            views: topic.views,
          }))
        : []

    if (discourseTopics.status === "rejected") {
      console.error("[v0] Discourse API error:", discourseTopics.reason)
    }

    let allProposals = [...tallyData, ...snapshotData, ...discourseData]

    if (source && source !== "all") {
      allProposals = allProposals.filter((p) => p.source === source)
    }

    if (status && status !== "all") {
      allProposals = allProposals.filter((p) => p.status === status)
    }

    allProposals.sort((a, b) => {
      const platformOrder = { tally: 0, snapshot: 1, discourse: 2 }
      const platformDiff = platformOrder[a.source] - platformOrder[b.source]

      if (platformDiff !== 0) return platformDiff

      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return dateB - dateA
    })

    allProposals = allProposals.slice(0, limit)

    console.log(
      `[v0] Fetched ${allProposals.length} proposals (Tally: ${tallyData.length}, Snapshot: ${snapshotData.length}, Discourse: ${discourseData.length})`,
    )

    return NextResponse.json({
      success: true,
      proposals: allProposals,
      count: allProposals.length,
      sources: {
        tally: tallyData.length,
        snapshot: snapshotData.length,
        discourse: discourseData.length,
      },
    })
  } catch (error) {
    console.error("[v0] Error fetching proposals:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
