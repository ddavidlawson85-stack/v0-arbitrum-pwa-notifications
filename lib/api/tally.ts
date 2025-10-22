export interface TallyProposal {
  id: string
  title: string
  description: string
  status: string
  proposer: string
  start: {
    timestamp: string
  }
  end: {
    timestamp: string
  }
  voteStats?: Array<{
    type: string
    votesCount: string // Added votesCount field
    percent: number
  }>
}

const TALLY_API_URL = "https://api.tally.xyz/query"
const TALLY_API_KEY = "66631c4fe12f1007ea3e497c7c18acaa29c459c447e0bb8ec5b94777bfd96695"
const ARBITRUM_ORG_ID = "2206072050315953936"

async function fetchArbitrumGovernors(): Promise<string[]> {
  const query = `
    query Organization($input: OrganizationInput!) {
      organization(input: $input) {
        governorIds
      }
    }
  `

  const response = await fetch(TALLY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Api-Key": TALLY_API_KEY,
    },
    body: JSON.stringify({
      query,
      variables: {
        input: {
          slug: "arbitrum",
        },
      },
    }),
  })

  if (!response.ok) {
    console.error("[v0] Failed to fetch Arbitrum governors, falling back to known governors")
    // Fallback to known governors if API fails
    return [
      "eip155:42161:0xf07DeD9dC292157749B6Fd268E37DF6EA38395B9", // Core
      "eip155:42161:0x789fC99093B09aD01C34DC7251D0C89ce743e5a4", // Treasury
    ]
  }

  const data = await response.json()
  const governorIds = data.data?.organization?.governorIds || []

  console.log("[v0] Found", governorIds.length, "Arbitrum governors:", governorIds)

  return governorIds.length > 0
    ? governorIds
    : [
        "eip155:42161:0xf07DeD9dC292157749B6Fd268E37DF6EA38395B9",
        "eip155:42161:0x789fC99093B09aD01C34DC7251D0C89ce743e5a4",
      ]
}

async function fetchProposalsFromGovernor(governorId: string): Promise<any[]> {
  const query = `
    query ProposalsByGovernor($input: ProposalsInput!) {
      proposals(input: $input) {
        nodes {
          ... on Proposal {
            id
            onchainId
            status
            proposer {
              address
              name
            }
            metadata {
              title
              description
            }
            start {
              ... on Block {
                timestamp
              }
              ... on BlocklessTimestamp {
                timestamp
              }
            }
            end {
              ... on Block {
                timestamp
              }
              ... on BlocklessTimestamp {
                timestamp
              }
            }
            voteStats {
              type
              votesCount
              percent
            }
          }
        }
      }
    }
  `

  const response = await fetch(TALLY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Api-Key": TALLY_API_KEY,
    },
    body: JSON.stringify({
      query,
      variables: {
        input: {
          filters: {
            governorId,
          },
          page: {
            limit: 20,
          },
          sort: {
            sortBy: "id",
            isDescending: true,
          },
        },
      },
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error("[v0] Tally API HTTP error:", response.status, errorBody)
    throw new Error(`fetch to ${TALLY_API_URL} failed with status ${response.status} and body: ${errorBody}`)
  }

  const data = await response.json()

  if (data.errors) {
    console.error("[v0] Tally API GraphQL errors:", data.errors)
    throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`)
  }

  return data.data?.proposals?.nodes || []
}

export async function fetchTallyProposals(): Promise<TallyProposal[]> {
  try {
    const governorIds = await fetchArbitrumGovernors()

    const proposalArrays = await Promise.all(governorIds.map((governorId) => fetchProposalsFromGovernor(governorId)))

    const allProposals = proposalArrays.flat().sort((a, b) => {
      return BigInt(b.id) > BigInt(a.id) ? 1 : -1
    })

    console.log("[v0] Tally API returned", allProposals.length, "proposals from", governorIds.length, "governors")

    return allProposals.map((proposal: any) => ({
      id: proposal.id,
      title: proposal.metadata?.title || "Untitled Proposal",
      description: proposal.metadata?.description || "",
      status: proposal.status,
      proposer: proposal.proposer?.name || proposal.proposer?.address || "",
      start: {
        timestamp: proposal.start?.timestamp || proposal.end?.timestamp || new Date().toISOString(),
      },
      end: {
        timestamp: proposal.end?.timestamp || new Date().toISOString(),
      },
      voteStats: proposal.voteStats || [],
    }))
  } catch (error) {
    console.error("[v0] Error fetching Tally proposals:", error)
    throw error
  }
}
