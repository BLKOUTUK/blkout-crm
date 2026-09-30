'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase-browser'

function getSupabase() { return createClient() }

// --- Types ---

export interface HealthMetrics {
  totalContacts: number
  activeContacts: number
  dormantContacts: number
  newContactsThisQuarter: number
  cbsMembers: number
  engagementBreakdown: { level: string; count: number }[]
}

export interface WealthMetrics {
  totalIncome: number
  totalExpenses: number
  netBalance: number
  grantIncome: number
  membershipIncome: number
  donationIncome: number
  incomeByCategory: { category: string; amount: number }[]
  expenseByCategory: { category: string; amount: number }[]
}

export interface HappinessMetrics {
  totalEvents: number
  totalRsvps: number
  checkedInCount: number
  checkInRate: number
  avgRsvpsPerEvent: number
  topEvents: { title: string; rsvp_count: number; checked_in: number }[]
}

export interface MethodMetrics {
  automationsRunning: number
  crmPagesActive: number
  newsletterSubscribers: number
  contentItemsPublished: number
  platformUptime: string
}

export interface GovernanceMetrics {
  boardMembers: number
  totalOrganizations: number
  partnerOrganizations: number
  funderOrganizations: number
  grantsInPipeline: number
  grantsApproved: number
  totalGrantValue: number
}

export interface QuarterRange {
  label: string
  start: string
  end: string
}

// --- Helpers ---

function getQuarterRange(quarterOffset = 0): QuarterRange {
  const now = new Date()
  const currentQuarter = Math.floor(now.getMonth() / 3)
  const targetQuarter = currentQuarter + quarterOffset
  const year = now.getFullYear() + Math.floor(targetQuarter / 4)
  const q = ((targetQuarter % 4) + 4) % 4

  const startMonth = q * 3
  const start = new Date(year, startMonth, 1)
  const end = new Date(year, startMonth + 3, 0, 23, 59, 59)

  const qLabel = `Q${q + 1} ${year}`
  return {
    label: qLabel,
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

// --- Hooks ---

export function useQuarterRange(quarterOffset = 0) {
  return getQuarterRange(quarterOffset)
}

export function useHealthMetrics(quarter: QuarterRange) {
  return useQuery({
    queryKey: ['evidence', 'health', quarter.label],
    queryFn: async () => {
      const supabase = getSupabase()

      // Total contacts
      const { count: totalContacts } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })

      // New contacts this quarter
      const { count: newContactsThisQuarter } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', quarter.start)
        .lte('created_at', quarter.end)

      // CBS members
      const { count: cbsMembers } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('contact_type', 'cbs_member')

      // Engagement breakdown
      const { data: contacts } = await supabase
        .from('contacts')
        .select('engagement_level')

      const engagementMap = new Map<string, number>()
      let activeCount = 0
      let dormantCount = 0

      if (contacts) {
        for (const c of contacts) {
          const level = c.engagement_level || 'unknown'
          engagementMap.set(level, (engagementMap.get(level) || 0) + 1)
          if (level === 'high' || level === 'medium') activeCount++
          if (level === 'dormant' || level === 'inactive') dormantCount++
        }
      }

      const engagementBreakdown = Array.from(engagementMap.entries())
        .map(([level, count]) => ({ level, count }))
        .sort((a, b) => b.count - a.count)

      return {
        totalContacts: totalContacts ?? 0,
        activeContacts: activeCount,
        dormantContacts: dormantCount,
        newContactsThisQuarter: newContactsThisQuarter ?? 0,
        cbsMembers: cbsMembers ?? 0,
        engagementBreakdown,
      } as HealthMetrics
    },
  })
}

export function useWealthMetrics(quarter: QuarterRange) {
  return useQuery({
    queryKey: ['evidence', 'wealth', quarter.label],
    queryFn: async () => {
      const supabase = getSupabase()

      const { data: transactions } = await supabase
        .from('financial_transactions')
        .select('type, category, amount_gbp')
        .gte('transaction_date', quarter.start)
        .lte('transaction_date', quarter.end)

      let totalIncome = 0
      let totalExpenses = 0
      let grantIncome = 0
      let membershipIncome = 0
      let donationIncome = 0
      const incomeByCat = new Map<string, number>()
      const expenseByCat = new Map<string, number>()

      if (transactions) {
        for (const t of transactions) {
          const amount = Number(t.amount_gbp) || 0
          if (t.type === 'income') {
            totalIncome += amount
            incomeByCat.set(t.category, (incomeByCat.get(t.category) || 0) + amount)
            if (t.category === 'grant_income') grantIncome += amount
            if (t.category === 'membership_fees') membershipIncome += amount
            if (t.category === 'donations') donationIncome += amount
          } else {
            totalExpenses += amount
            expenseByCat.set(t.category, (expenseByCat.get(t.category) || 0) + amount)
          }
        }
      }

      return {
        totalIncome,
        totalExpenses,
        netBalance: totalIncome - totalExpenses,
        grantIncome,
        membershipIncome,
        donationIncome,
        incomeByCategory: Array.from(incomeByCat.entries())
          .map(([category, amount]) => ({ category, amount }))
          .sort((a, b) => b.amount - a.amount),
        expenseByCategory: Array.from(expenseByCat.entries())
          .map(([category, amount]) => ({ category, amount }))
          .sort((a, b) => b.amount - a.amount),
      } as WealthMetrics
    },
  })
}

export function useHappinessMetrics(quarter: QuarterRange) {
  return useQuery({
    queryKey: ['evidence', 'happiness', quarter.label],
    queryFn: async () => {
      const supabase = getSupabase()

      // Events in quarter
      const { data: events } = await supabase
        .from('events')
        .select('id, title, date')
        .gte('date', quarter.start)
        .lte('date', quarter.end)

      const totalEvents = events?.length ?? 0

      // RSVPs for those events
      let totalRsvps = 0
      let checkedInCount = 0
      const topEvents: { title: string; rsvp_count: number; checked_in: number }[] = []

      if (events && events.length > 0) {
        const eventIds = events.map((e) => e.id)

        const { data: rsvps } = await supabase
          .from('event_rsvps')
          .select('event_id, status, checked_in')
          .in('event_id', eventIds)

        if (rsvps) {
          const eventRsvpMap = new Map<string, { rsvps: number; checkins: number }>()
          for (const r of rsvps) {
            if (r.status === 'confirmed' || r.status === 'attended') {
              totalRsvps++
              const entry = eventRsvpMap.get(r.event_id) || { rsvps: 0, checkins: 0 }
              entry.rsvps++
              if (r.checked_in) {
                checkedInCount++
                entry.checkins++
              }
              eventRsvpMap.set(r.event_id, entry)
            }
          }

          for (const ev of events) {
            const stats = eventRsvpMap.get(ev.id)
            if (stats) {
              topEvents.push({
                title: ev.title,
                rsvp_count: stats.rsvps,
                checked_in: stats.checkins,
              })
            }
          }
          topEvents.sort((a, b) => b.rsvp_count - a.rsvp_count)
        }
      }

      return {
        totalEvents,
        totalRsvps,
        checkedInCount,
        checkInRate: totalRsvps > 0 ? Math.round((checkedInCount / totalRsvps) * 100) : 0,
        avgRsvpsPerEvent: totalEvents > 0 ? Math.round(totalRsvps / totalEvents) : 0,
        topEvents: topEvents.slice(0, 5),
      } as HappinessMetrics
    },
  })
}

export function useMethodMetrics() {
  return useQuery({
    queryKey: ['evidence', 'method'],
    queryFn: async () => {
      const supabase = getSupabase()

      // Newsletter subscribers
      const { count: newsletterSubscribers } = await supabase
        .from('newsletter_subscribers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      // Platform stats (static for now, can be enhanced)
      return {
        automationsRunning: 4, // node-cron jobs in ivor-core
        crmPagesActive: 8, // dashboard, contacts, orgs, grants, policy, financial, events, evidence
        newsletterSubscribers: newsletterSubscribers ?? 0,
        contentItemsPublished: 54, // from campaign calendar
        platformUptime: '99.5%', // estimated from Coolify
      } as MethodMetrics
    },
  })
}

export function useGovernanceMetrics() {
  return useQuery({
    queryKey: ['evidence', 'governance'],
    queryFn: async () => {
      const supabase = getSupabase()

      // Organizations
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, organization_type')

      let totalOrganizations = 0
      let partnerOrganizations = 0
      let funderOrganizations = 0

      if (orgs) {
        totalOrganizations = orgs.length
        for (const o of orgs) {
          if (o.organization_type === 'partner' || o.organization_type === 'coalition_member') partnerOrganizations++
          if (o.organization_type === 'funder_foundation' || o.organization_type === 'government_body') funderOrganizations++
        }
      }

      // Grants
      const { data: grants } = await supabase
        .from('grants')
        .select('id, status, amount_requested')

      let grantsInPipeline = 0
      let grantsApproved = 0
      let totalGrantValue = 0

      if (grants) {
        for (const g of grants) {
          grantsInPipeline++
          if (g.status === 'approved' || g.status === 'awarded') {
            grantsApproved++
            totalGrantValue += Number(g.amount_requested) || 0
          }
        }
      }

      // Board members (contacts with role 'board_member')
      const { count: boardMembers } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('contact_type', 'board_member')

      return {
        boardMembers: boardMembers ?? 0,
        totalOrganizations,
        partnerOrganizations,
        funderOrganizations,
        grantsInPipeline,
        grantsApproved,
        totalGrantValue,
      } as GovernanceMetrics
    },
  })
}
