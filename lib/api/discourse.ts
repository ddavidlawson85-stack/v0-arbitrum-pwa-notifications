export interface DiscourseTopic {
  id: number
  title: string
  excerpt: string
  created_at: string
  last_posted_at: string
  posts_count: number
  reply_count: number
  like_count: number
  views: number
  category_id: number
  posters: Array<{
    user_id: number
    description: string
  }>
  creator_username?: string
  creator_name?: string
}

const DISCOURSE_API_URL = "https://forum.arbitrum.foundation"
const PROPOSALS_CATEGORY_ID = 7 // Arbitrum proposals category

let cachedTopics: DiscourseTopic[] | null = null
let cacheTimestamp = 0
const CACHE_TTL = 12 * 60 * 60 * 1000 // 12 hours

let ongoingRequest: Promise<DiscourseTopic[]> | null = null
let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 10000 // Minimum 10 seconds between requests

export async function fetchDiscourseTopics(): Promise<DiscourseTopic[]> {
  try {
    const now = Date.now()

    // Return cached data if still valid
    if (cachedTopics && now - cacheTimestamp < CACHE_TTL) {
      console.log("[v0] Returning cached Discourse topics")
      return cachedTopics
    }

    const timeSinceLastRequest = now - lastRequestTime
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      console.log(`[v0] Rate limiting: ${MIN_REQUEST_INTERVAL - timeSinceLastRequest}ms until next request allowed`)
      if (cachedTopics) {
        console.log("[v0] Returning cached data due to rate limiting")
        return cachedTopics
      }
    }

    if (ongoingRequest) {
      console.log("[v0] Waiting for ongoing Discourse request")
      return await ongoingRequest
    }

    ongoingRequest = (async () => {
      try {
        lastRequestTime = Date.now()

        console.log("[v0] Fetching Discourse topics from:", `${DISCOURSE_API_URL}/latest.json`)

        const response = await fetch(`${DISCOURSE_API_URL}/latest.json`, {
          headers: {
            Accept: "application/json",
          },
          redirect: "follow",
          signal: AbortSignal.timeout(10000), // 10 second timeout
        })

        if (response.status === 429) {
          const errorText = await response.text()
          console.warn("[v0] Discourse API rate limit hit:", errorText)

          if (cachedTopics) {
            console.log("[v0] Returning stale cached data due to rate limit")
            cacheTimestamp = Date.now() - CACHE_TTL + 5 * 60 * 1000
            return cachedTopics
          }

          console.log("[v0] No cached data available, returning empty array")
          return []
        }

        if (!response.ok) {
          const errorText = await response.text()
          console.error("[v0] Discourse API error response:", {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
          })

          if (cachedTopics) {
            console.log("[v0] Returning cached data due to API error")
            return cachedTopics
          }

          return []
        }

        const data = await response.json()

        if (data.topic_list?.topics?.[0]) {
          console.log("[v0] Sample Discourse topic fields:", Object.keys(data.topic_list.topics[0]))
        }

        const users = data.users || []
        const userMap = new Map(users.map((u: any) => [u.id, u]))

        const topics = data.topic_list?.topics || []
        const proposalTopics = topics
          .filter((topic: any) => topic.category_id === PROPOSALS_CATEGORY_ID)
          .map((topic: any) => {
            const creatorId = topic.posters?.[0]?.user_id
            const creator = creatorId ? userMap.get(creatorId) : null

            return {
              ...topic,
              creator_username: creator?.username || topic.creator_username || "Unknown",
              creator_name: creator?.name || creator?.username || "Unknown User",
            }
          })

        const result = proposalTopics.slice(0, 10)

        cachedTopics = result
        cacheTimestamp = now

        console.log(
          "[v0] Discourse API returned",
          result.length,
          "proposal topics (filtered from",
          topics.length,
          "total)",
        )

        return result
      } finally {
        ongoingRequest = null
      }
    })()

    return await ongoingRequest
  } catch (error) {
    console.error("[v0] Error fetching Discourse topics:", error)

    ongoingRequest = null

    if (cachedTopics) {
      console.log("[v0] Returning cached data due to fetch error")
      return cachedTopics
    }

    return []
  }
}
