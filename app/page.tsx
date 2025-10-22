"use client"

import { useState, useMemo, useEffect } from "react"
import { ProposalCard } from "@/components/proposal-card"
import { DashboardHeader } from "@/components/dashboard-header"
import { InstallPrompt } from "@/components/install-prompt"
import { NotificationPrompt } from "@/components/notification-prompt"
import type { Proposal } from "@/lib/types/proposal"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type PlatformFilter = "all" | "snapshot" | "tally" | "discourse"
type StatusFilter = "all" | "active" | "pending" | "closed" | "completed"

export default function HomePage() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [delegateId] = useState<string | null>(null)
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active")
  const [searchQuery, setSearchQuery] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    fetchProposals()
  }, [])

  const fetchProposals = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/proposals")
      const data = await response.json()

      if (data.success) {
        setProposals(data.proposals)
      } else {
        throw new Error(data.error || "Failed to fetch proposals")
      }
    } catch (error) {
      console.error("[v0] Error fetching proposals:", error)
      toast({
        title: "Error",
        description: "Failed to load proposals. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    await fetchProposals()
    toast({
      title: "Refreshed",
      description: "Proposals have been updated.",
    })
  }

  const handleNotificationToggle = async () => {
    setIsSubscribed(!isSubscribed)
    toast({
      title: isSubscribed ? "Unsubscribed" : "Subscribed",
      description: isSubscribed
        ? "You will no longer receive push notifications."
        : "You will now receive push notifications for new proposals.",
    })
  }

  const filteredProposals = useMemo(() => {
    return proposals.filter((proposal) => {
      const isDiscourse = proposal.source === "discourse"

      if (platformFilter !== "all" && proposal.source !== platformFilter) {
        return false
      }

      if (isDiscourse) {
        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          return proposal.title.toLowerCase().includes(query) || proposal.author.toLowerCase().includes(query)
        }
        return true
      }

      // For non-Discourse proposals, apply status filter normally
      if (statusFilter !== "all" && proposal.status !== statusFilter) {
        return false
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return proposal.title.toLowerCase().includes(query) || proposal.author.toLowerCase().includes(query)
      }
      return true
    })
  }, [proposals, platformFilter, statusFilter, searchQuery])

  const snapshotProposals = filteredProposals.filter((p) => p.source === "snapshot")
  const tallyProposals = filteredProposals.filter((p) => p.source === "tally")
  const discourseProposals = filteredProposals.filter((p) => p.source === "discourse")

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        onRefresh={handleRefresh}
        onNotificationToggle={handleNotificationToggle}
        isSubscribed={isSubscribed}
        delegateId={delegateId}
      />

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-6xl">
        <div className="mb-6 sm:mb-8">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
            <SelectTrigger className="w-full sm:w-[200px] h-12 sm:h-11 bg-card border-border text-foreground rounded-xl text-base sm:text-sm">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border rounded-xl">
              <SelectItem value="all" className="text-base sm:text-sm">
                All Status
              </SelectItem>
              <SelectItem value="active" className="text-base sm:text-sm">
                Active
              </SelectItem>
              <SelectItem value="pending" className="text-base sm:text-sm">
                Pending
              </SelectItem>
              <SelectItem value="closed" className="text-base sm:text-sm">
                Closed
              </SelectItem>
              <SelectItem value="completed" className="text-base sm:text-sm">
                Completed
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-6 sm:mb-8 -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            onClick={() => setPlatformFilter("all")}
            className={`px-3 py-2 rounded-xl whitespace-nowrap transition-all font-medium text-sm min-h-[44px] sm:min-h-0 ${
              platformFilter === "all"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground border border-border"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setPlatformFilter("tally")}
            className={`px-3 py-2 rounded-xl whitespace-nowrap transition-all font-medium text-sm min-h-[44px] sm:min-h-0 ${
              platformFilter === "tally"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground border border-border"
            }`}
          >
            Tally
          </button>
          <button
            onClick={() => setPlatformFilter("snapshot")}
            className={`px-3 py-2 rounded-xl whitespace-nowrap transition-all font-medium text-sm min-h-[44px] sm:min-h-0 ${
              platformFilter === "snapshot"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground border border-border"
            }`}
          >
            Snapshot
          </button>
          <button
            onClick={() => setPlatformFilter("discourse")}
            className={`px-3 py-2 rounded-xl whitespace-nowrap transition-all font-medium text-sm min-h-[44px] sm:min-h-0 ${
              platformFilter === "discourse"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground border border-border"
            }`}
          >
            Discourse
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
              <p className="text-muted-foreground text-base sm:text-sm">Loading proposals...</p>
            </div>
          </div>
        ) : filteredProposals.length === 0 ? (
          <div className="text-center py-16 sm:py-20 bg-card border border-border rounded-xl">
            <p className="text-muted-foreground text-lg">No proposals found matching your filters.</p>
            <p className="text-muted-foreground text-sm mt-2">Try adjusting your search or filter criteria.</p>
          </div>
        ) : (
          <div className="space-y-8 sm:space-y-10">
            {(platformFilter === "all" || platformFilter === "tally") && tallyProposals.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-3 pb-2">
                  <h2 className="text-xl sm:text-xl font-semibold text-foreground">Tally Proposals</h2>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-sm">
                    {tallyProposals.length}
                  </Badge>
                </div>
                <div className="space-y-3 sm:space-y-3">
                  {tallyProposals.map((proposal) => (
                    <ProposalCard key={proposal.id} proposal={proposal} />
                  ))}
                </div>
              </section>
            )}

            {(platformFilter === "all" || platformFilter === "snapshot") && snapshotProposals.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-3 pb-2">
                  <h2 className="text-xl sm:text-xl font-semibold text-foreground">Snapshot Proposals</h2>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-sm">
                    {snapshotProposals.length}
                  </Badge>
                </div>
                <div className="space-y-3 sm:space-y-3">
                  {snapshotProposals.map((proposal) => (
                    <ProposalCard key={proposal.id} proposal={proposal} />
                  ))}
                </div>
              </section>
            )}

            {(platformFilter === "all" || platformFilter === "discourse") && discourseProposals.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-3 pb-2">
                  <h2 className="text-xl sm:text-xl font-semibold text-foreground">Discourse Proposals</h2>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-sm">
                    {discourseProposals.length}
                  </Badge>
                </div>
                <div className="space-y-3 sm:space-y-3">
                  {discourseProposals.map((proposal) => (
                    <ProposalCard key={proposal.id} proposal={proposal} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      <Toaster />
      <InstallPrompt />
      <NotificationPrompt />
    </div>
  )
}
