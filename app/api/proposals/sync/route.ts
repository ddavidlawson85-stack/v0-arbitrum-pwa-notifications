import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { fetchSnapshotProposals } from "@/lib/api/snapshot"
import { fetchTallyProposals } from "@/lib/api/tally"
import { fetchDiscourseTopics } from "@/lib/api/discourse"

export const dynamic = "force-dynamic"

export async function POST() {
  try {
    const supabase = await createClient()
    const newProposals: Array<{
      external_id: string
      source: string
      title: string
      description: string | null
      author: string | null
      status: string
      voting_starts_at: string | null
      voting_ends_at: string | null
      for_votes: number
      against_votes: number
      quorum: number | null
      url: string
    }> = []

    // Fetch Snapshot proposals
    console.log("[v0] Fetching Snapshot proposals...")
    const snapshotProposals = await fetchSnapshotProposals()

    for (const proposal of snapshotProposals) {
      const forVotes = proposal.scores[0] || 0
      const againstVotes = proposal.scores[1] || 0

      newProposals.push({
        external_id: proposal.id,
        source: "snapshot",
        title: proposal.title,
        description: proposal.body?.substring(0, 500) || null,
        author: proposal.author,
        status: proposal.state,
        voting_starts_at: new Date(proposal.start * 1000).toISOString(),
        voting_ends_at: new Date(proposal.end * 1000).toISOString(),
        for_votes: forVotes,
        against_votes: againstVotes,
        quorum: proposal.quorum,
        url: proposal.link || `https://snapshot.org/#/arbitrumfoundation.eth/proposal/${proposal.id}`,
      })
    }

    // Fetch Tally proposals
    console.log("[v0] Fetching Tally proposals...")
    const tallyProposals = await fetchTallyProposals()

    for (const proposal of tallyProposals) {
      const forVotes = proposal.voteStats.find((v) => v.type === "FOR")?.votes || "0"
      const againstVotes = proposal.voteStats.find((v) => v.type === "AGAINST")?.votes || "0"

      newProposals.push({
        external_id: proposal.id,
        source: "tally",
        title: proposal.title,
        description: proposal.description?.substring(0, 500) || null,
        author: proposal.proposer?.address || null,
        status: proposal.status.toLowerCase(),
        voting_starts_at: proposal.start?.timestamp || null,
        voting_ends_at: proposal.end?.timestamp || null,
        for_votes: Number.parseFloat(forVotes),
        against_votes: Number.parseFloat(againstVotes),
        quorum: null,
        url: `https://www.tally.xyz/gov/arbitrum/proposal/${proposal.id}`,
      })
    }

    // Fetch Discourse topics
    console.log("[v0] Fetching Discourse topics...")
    const discourseTopics = await fetchDiscourseTopics()

    for (const topic of discourseTopics) {
      newProposals.push({
        external_id: topic.id.toString(),
        source: "discourse",
        title: topic.title,
        description: topic.excerpt || null,
        author: topic.posters[0]?.description || null,
        status: "active",
        voting_starts_at: topic.created_at,
        voting_ends_at: null,
        for_votes: topic.like_count,
        against_votes: 0,
        quorum: null,
        url: `https://forum.arbitrum.foundation/t/${topic.id}`,
      })
    }

    // Upsert proposals into database
    console.log(`[v0] Upserting ${newProposals.length} proposals...`)
    const { data, error } = await supabase
      .from("proposals")
      .upsert(newProposals, {
        onConflict: "external_id,source",
        ignoreDuplicates: false,
      })
      .select()

    if (error) {
      console.error("[v0] Error upserting proposals:", error)
      throw error
    }

    console.log(`[v0] Successfully synced ${data?.length || 0} proposals`)

    return NextResponse.json({
      success: true,
      synced: data?.length || 0,
      message: `Successfully synced ${data?.length || 0} proposals`,
    })
  } catch (error) {
    console.error("[v0] Error syncing proposals:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
