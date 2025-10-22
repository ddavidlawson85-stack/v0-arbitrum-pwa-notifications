export interface SnapshotProposal {
  id: string
  title: string
  body: string
  choices: string[]
  start: number
  end: number
  state: string
  author: string
  authorName?: string
  authorEns?: string
  scores: number[]
  scores_total: number
  quorum: number
  link: string
}

const SNAPSHOT_GRAPHQL_URL = "https://hub.snapshot.org/graphql"
const ARBITRUM_SPACE = "arbitrumfoundation.eth"

let snapshotCache: { data: SnapshotProposal[]; timestamp: number } | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function fetchSnapshotProposals(): Promise<SnapshotProposal[]> {
  if (snapshotCache && Date.now() - snapshotCache.timestamp < CACHE_TTL) {
    console.log("[v0] Returning cached Snapshot proposals")
    return snapshotCache.data
  }

  const query = `
    query Proposals {
      proposals(
        first: 20,
        skip: 0,
        where: {
          space_in: ["${ARBITRUM_SPACE}"]
        },
        orderBy: "created",
        orderDirection: desc
      ) {
        id
        title
        body
        choices
        start
        end
        state
        author
        scores
        scores_total
        quorum
        link
      }
      users(where: { id_in: [] }) {
        id
        name
      }
    }
  `

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const response = await fetch(SNAPSHOT_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`[v0] Snapshot API error (${response.status}):`, errorBody.slice(0, 200))

      // Return cached data if available, otherwise empty array
      if (snapshotCache) {
        console.log("[v0] Returning stale cached Snapshot proposals due to API error")
        return snapshotCache.data
      }

      console.log("[v0] No cached Snapshot data available, returning empty array")
      return []
    }

    const data = await response.json()
    const proposals = data.data.proposals || []

    console.log("[v0] Fetching author profiles for Snapshot proposals...")

    const authorAddresses = [...new Set(proposals.map((p: SnapshotProposal) => p.author))]
    const profilesQuery = `
      query Users {
        users(where: { id_in: ${JSON.stringify(authorAddresses)} }) {
          id
          name
        }
      }
    `

    const profilesResponse = await fetch(SNAPSHOT_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: profilesQuery }),
    })

    const profilesData = await profilesResponse.json()
    const profiles = profilesData.data?.users || []

    const profileMap = new Map(profiles.map((p: { id: string; name: string }) => [p.id.toLowerCase(), p.name]))

    console.log(`[v0] Found ${profiles.length} Snapshot author profiles`)

    const proposalsWithNames = proposals.map((proposal: SnapshotProposal) => ({
      ...proposal,
      authorName: profileMap.get(proposal.author.toLowerCase()) || undefined,
    }))

    snapshotCache = {
      data: proposalsWithNames,
      timestamp: Date.now(),
    }

    return proposalsWithNames
  } catch (error) {
    console.error("[v0] Error fetching Snapshot proposals:", error)

    // Return cached data if available, otherwise empty array
    if (snapshotCache) {
      console.log("[v0] Returning stale cached Snapshot proposals due to error")
      return snapshotCache.data
    }

    console.log("[v0] No cached Snapshot data available, returning empty array")
    return []
  }
}
