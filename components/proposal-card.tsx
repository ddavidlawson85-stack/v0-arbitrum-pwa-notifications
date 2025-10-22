import { Badge } from "@/components/ui/badge"
import type { Proposal } from "@/lib/types/proposal"

interface ProposalCardProps {
  proposal: Proposal
}

const ClockIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
)

const TrendingUpIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
)

const CalendarIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
)

const ExternalLinkIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
    />
  </svg>
)

export function ProposalCard({ proposal }: ProposalCardProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-success/15 text-success border-success/30"
      case "pending":
        return "bg-muted-foreground/15 text-muted-foreground border-muted-foreground/30"
      case "closed":
        return "bg-destructive/15 text-destructive border-destructive/30"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getTimeRemaining = (endDate: string | null, startDate: string | null, status: string) => {
    if (status === "closed" || status === "completed") return null
    if (status === "pending" && startDate) {
      const now = new Date()
      const start = new Date(startDate)
      const diff = start.getTime() - now.getTime()
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      return `Starts in ${days}d ${hours}h`
    }
    if (!endDate) return null
    const now = new Date()
    const end = new Date(endDate)
    const diff = end.getTime() - now.getTime()

    if (diff < 0) return "Ended"

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    return `${days}d ${hours}h`
  }

  const formatVotes = (votes: number | string) => {
    const voteCount = typeof votes === "string" ? Number.parseFloat(votes) : votes
    const normalizedVotes = voteCount > 1e15 ? voteCount / 1e18 : voteCount

    if (normalizedVotes >= 1000000) {
      return `${(normalizedVotes / 1000000).toFixed(1)}M`
    } else if (normalizedVotes >= 1000) {
      return `${(normalizedVotes / 1000).toFixed(1)}K`
    } else {
      return Math.round(normalizedVotes).toLocaleString()
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const totalVotes = proposal.for_votes + proposal.against_votes
  const forPercentage = totalVotes > 0 ? (proposal.for_votes / totalVotes) * 100 : 0

  const isDiscourse = proposal.source === "discourse"
  const isActive = proposal.status.toLowerCase() === "active"

  return (
    <a
      href={proposal.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-card rounded-xl p-4 sm:p-5 space-y-4 border border-border hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5 group cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <h3 className="text-base sm:text-base font-semibold text-foreground leading-relaxed group-hover:text-primary transition-colors flex-1">
              {proposal.title}
            </h3>
            {!isDiscourse && <ExternalLinkIcon />}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {isDiscourse ? (
            <ExternalLinkIcon />
          ) : (
            <>
              <Badge
                variant="outline"
                className={`${getStatusColor(proposal.status)} font-medium text-xs sm:text-xs px-2.5 py-0.5`}
              >
                {proposal.status}
              </Badge>
              {isActive && (
                <div className="flex flex-col items-end gap-1">
                  {getTimeRemaining(proposal.voting_ends_at, proposal.voting_starts_at, proposal.status) && (
                    <div className="flex items-center gap-1.5 text-sm sm:text-sm text-foreground font-bold">
                      <ClockIcon />
                      <span className="whitespace-nowrap">
                        {getTimeRemaining(proposal.voting_ends_at, proposal.voting_starts_at, proposal.status)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm sm:text-sm text-muted-foreground">by {proposal.author}</p>
        {isDiscourse && proposal.created_at && (
          <div className="flex items-center gap-1.5 text-xs sm:text-xs text-muted-foreground">
            <CalendarIcon />
            <span className="whitespace-nowrap">{formatDate(proposal.created_at)}</span>
          </div>
        )}
      </div>

      {!isDiscourse && isActive && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-sm sm:text-sm font-medium">
            <div className="flex items-center gap-2">
              <TrendingUpIcon />
              <span className="text-success">For: {formatVotes(proposal.for_votes)}</span>
            </div>
            <span className="text-destructive">Against: {formatVotes(proposal.against_votes)}</span>
          </div>
          <div className="relative">
            <div className="flex gap-1 h-2.5 sm:h-2 rounded-full overflow-hidden bg-muted">
              {totalVotes > 0 ? (
                <>
                  <div
                    className="bg-success transition-all duration-500 ease-out"
                    style={{ width: `${forPercentage}%` }}
                  />
                  <div
                    className="bg-destructive transition-all duration-500 ease-out"
                    style={{ width: `${100 - forPercentage}%` }}
                  />
                </>
              ) : (
                <>
                  <div className="bg-success/30 transition-all duration-500 ease-out" style={{ width: "50%" }} />
                  <div className="bg-destructive/30 transition-all duration-500 ease-out" style={{ width: "50%" }} />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </a>
  )
}
