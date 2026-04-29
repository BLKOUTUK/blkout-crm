import { createAdminClient } from '@/lib/supabase'
import Link from 'next/link'

// BLKOUT CRM — relationship overview.
// Server component; reads directly from Supabase via the admin client.
// Service-role key is needed at runtime, not build, so force dynamic.
export const dynamic = 'force-dynamic'
export const revalidate = 0

const TOPIC_LABELS: Record<string, string> = {
  funding: 'Funding',
  partnership: 'Partnership',
  events: 'Events',
  governance: 'Governance',
  community: 'Community',
  media: 'Media',
  research: 'Research',
  advocacy: 'Advocacy',
  professional_development: 'Pro-dev',
  marketing: 'Marketing',
  personal: 'Personal',
}

const TOPIC_ORDER = [
  'funding', 'partnership', 'events', 'governance', 'community',
  'media', 'research', 'advocacy', 'professional_development', 'marketing', 'personal',
]

async function loadOverview() {
  const sb = createAdminClient()

  const [contactsCount, orgsCount, activitiesCount, last30, topicAggRaw, topPeopleRaw] = await Promise.all([
    sb.from('contacts').select('id', { count: 'exact', head: true }),
    sb.from('organizations').select('id', { count: 'exact', head: true }),
    sb.from('activities').select('id', { count: 'exact', head: true }).in('activity_type', ['email_sent', 'email_received']),
    sb.from('activities').select('id', { count: 'exact', head: true })
      .in('activity_type', ['email_sent', 'email_received'])
      .gte('occurred_at', new Date(Date.now() - 30 * 86400000).toISOString()),
    // Topic aggregation — pull metadata.topic for all email activities. Fast enough.
    sb.from('activities').select('metadata').in('activity_type', ['email_sent', 'email_received']).limit(15000),
    // Top correspondents — group activities by contact_id
    sb.from('activities').select('contact_id').in('activity_type', ['email_sent', 'email_received']).limit(15000),
  ])

  const topicCounts: Record<string, number> = {}
  let directionInbound = 0
  let directionOutbound = 0
  for (const row of topicAggRaw.data || []) {
    const t = (row as any).metadata?.topic
    if (t) topicCounts[t] = (topicCounts[t] || 0) + 1
    const d = (row as any).metadata?.direction
    if (d === 'inbound') directionInbound++
    else if (d === 'outbound') directionOutbound++
  }

  const peopleCounts: Record<string, number> = {}
  for (const row of topPeopleRaw.data || []) {
    const cid = (row as any).contact_id
    if (cid) peopleCounts[cid] = (peopleCounts[cid] || 0) + 1
  }
  const topContactIds = Object.entries(peopleCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
  const topPeopleDetails = topContactIds.length
    ? await sb.from('contacts').select('id, first_name, last_name, email, organization_id').in('id', topContactIds.map(([id]) => id))
    : { data: [] }
  const topPeople = topContactIds.map(([id, count]) => {
    const c = (topPeopleDetails.data || []).find((p: any) => p.id === id)
    return { id, count, name: c ? `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email : 'Unknown', email: c?.email }
  })

  return {
    contacts: contactsCount.count || 0,
    orgs: orgsCount.count || 0,
    threads: activitiesCount.count || 0,
    last30: last30.count || 0,
    topicCounts,
    directionInbound,
    directionOutbound,
    topPeople,
  }
}

function MetaLabel({ children }: { children: React.ReactNode }) {
  return <span className="font-meta text-[#a8a195]">{children}</span>
}

function StatBlock({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="border-l-2 border-[#d4af37] pl-4">
      <div className="font-meta text-[#a8a195]">{label}</div>
      <div className="mt-1 font-display text-4xl text-[#f5f1e8]">{value}</div>
      {sub && <div className="mt-1 font-tender text-sm text-[#a8a195]">{sub}</div>}
    </div>
  )
}

export default async function DashboardPage() {
  const data = await loadOverview()
  const totalTopics = Object.values(data.topicCounts).reduce((a, b) => a + b, 0)
  const sortedTopics = TOPIC_ORDER
    .map((id) => ({ id, count: data.topicCounts[id] || 0 }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count)
  const directionTotal = data.directionInbound + data.directionOutbound

  return (
    <div className="mx-auto max-w-6xl space-y-12">
      {/* Hero */}
      <header className="border-b border-[#d4af37]/30 pb-8">
        <MetaLabel>BLKOUT CRM — relationship corpus</MetaLabel>
        <h1 className="mt-4 font-display text-5xl text-[#f5f1e8] md:text-6xl">
          Who BLKOUT<br />
          is in conversation with
        </h1>
        <p className="mt-6 max-w-xl font-tender text-lg text-[#a8a195]">
          Twelve years of correspondence, classified and indexed. The cooperative&rsquo;s relational memory — searchable, attributable, ours.
        </p>
      </header>

      {/* Stat row */}
      <section className="grid grid-cols-2 gap-8 md:grid-cols-4">
        <StatBlock label="Contacts" value={data.contacts.toLocaleString()} />
        <StatBlock label="Organisations" value={data.orgs.toLocaleString()} />
        <StatBlock label="Email threads" value={data.threads.toLocaleString()} sub="across sent + inbox important" />
        <StatBlock label="Last 30 days" value={data.last30.toLocaleString()} />
      </section>

      {/* Direction split */}
      <section>
        <MetaLabel>Direction · who initiates</MetaLabel>
        <div className="mt-4 flex h-3 w-full overflow-hidden">
          <div className="bg-[#d4af37]" style={{ width: `${(data.directionOutbound / directionTotal) * 100}%` }} />
          <div className="bg-[#9b4dca]" style={{ width: `${(data.directionInbound / directionTotal) * 100}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <span className="text-[#f5f1e8]"><span className="mr-2 inline-block h-2 w-2 bg-[#d4af37]" />→ outbound · {data.directionOutbound.toLocaleString()} ({((data.directionOutbound / directionTotal) * 100).toFixed(0)}%)</span>
          <span className="text-[#f5f1e8]"><span className="mr-2 inline-block h-2 w-2 bg-[#9b4dca]" />← inbound · {data.directionInbound.toLocaleString()} ({((data.directionInbound / directionTotal) * 100).toFixed(0)}%)</span>
        </div>
      </section>

      {/* Topic distribution */}
      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl text-[#f5f1e8]">Topic mix</h2>
          <MetaLabel>{totalTopics.toLocaleString()} classified threads</MetaLabel>
        </div>
        <div className="mt-6 space-y-3">
          {sortedTopics.map(({ id, count }) => {
            const pct = (count / totalTopics) * 100
            return (
              <div key={id} className="grid grid-cols-[8rem_1fr_5rem] items-center gap-4">
                <div className="font-meta text-[#a8a195]">{TOPIC_LABELS[id] || id}</div>
                <div className="h-2 bg-[#14141f]">
                  <div className="h-full bg-[#d4af37]" style={{ width: `${pct}%` }} />
                </div>
                <div className="text-right text-sm text-[#f5f1e8]">
                  {count.toLocaleString()} <span className="text-[#a8a195]">·  {pct.toFixed(1)}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Top correspondents */}
      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl text-[#f5f1e8]">Top correspondents</h2>
          <MetaLabel>by thread count</MetaLabel>
        </div>
        <ol className="mt-6 space-y-3">
          {data.topPeople.map((p, i) => (
            <li key={p.id} className="grid grid-cols-[2rem_1fr_5rem] items-baseline gap-4 border-b border-[#14141f] pb-3">
              <span className="font-meta text-[#a8a195]">{String(i + 1).padStart(2, '0')}</span>
              <Link href={`/contacts/${p.id}`} className="text-[#f5f1e8] hover:text-[#d4af37]">
                {p.name}
                {p.email && p.email !== p.name && (
                  <span className="ml-2 font-tender text-sm text-[#a8a195]">— {p.email}</span>
                )}
              </Link>
              <span className="text-right text-sm text-[#f5f1e8]">{p.count}</span>
            </li>
          ))}
        </ol>
      </section>

      <footer className="pt-8 font-tender text-sm text-[#a8a195]">
        Generated server-side from Supabase. Reflects v6 of the relationship corpus — including topic classifications via Llama 3.3 (29 Apr 2026).
      </footer>
    </div>
  )
}
