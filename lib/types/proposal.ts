export interface Proposal {
  id: string
  external_id: string
  source: "discourse" | "snapshot" | "tally"
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
  created_at: string
  updated_at: string
  replies?: number
  views?: number
}

export type ProposalSource = "all" | "discourse" | "snapshot" | "tally"
export type ProposalStatus = "all" | "active" | "pending" | "closed" | "completed"
