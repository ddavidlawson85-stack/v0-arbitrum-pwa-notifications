"use client"

import { Button } from "@/components/ui/button"
import type { ProposalSource, ProposalStatus } from "@/lib/types/proposal"

interface ProposalFiltersProps {
  selectedSource: ProposalSource
  selectedStatus: ProposalStatus
  onSourceChange: (source: ProposalSource) => void
  onStatusChange: (status: ProposalStatus) => void
  proposalCounts: {
    all: number
    snapshot: number
    tally: number
    discourse: number
  }
}

export function ProposalFilters({
  selectedSource,
  selectedStatus,
  onSourceChange,
  onStatusChange,
  proposalCounts,
}: ProposalFiltersProps) {
  const sources: Array<{ value: ProposalSource; label: string }> = [
    { value: "all", label: `All (${proposalCounts.all})` },
    { value: "snapshot", label: `Snapshot (${proposalCounts.snapshot})` },
    { value: "tally", label: `Tally (${proposalCounts.tally})` },
    { value: "discourse", label: `Discourse (${proposalCounts.discourse})` },
  ]

  const statuses: Array<{ value: ProposalStatus; label: string }> = [
    { value: "all", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "pending", label: "Pending" },
    { value: "closed", label: "Closed" },
    { value: "completed", label: "Completed" },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2 text-muted-foreground">Source</h3>
        <div className="flex flex-wrap gap-2">
          {sources.map((source) => (
            <Button
              key={source.value}
              variant={selectedSource === source.value ? "default" : "outline"}
              size="sm"
              onClick={() => onSourceChange(source.value)}
            >
              {source.label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-2 text-muted-foreground">Status</h3>
        <div className="flex flex-wrap gap-2">
          {statuses.map((status) => (
            <Button
              key={status.value}
              variant={selectedStatus === status.value ? "default" : "outline"}
              size="sm"
              onClick={() => onStatusChange(status.value)}
            >
              {status.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
