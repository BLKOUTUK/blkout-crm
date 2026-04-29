import { createAdminClient } from '@/lib/supabase'
import Link from 'next/link'

// Server-side contacts list with topic mix per contact (top-engagement first).
// Search via ?q= URL param — keeps everything stateless and shareable.
export const dynamic = 'force-dynamic'
export const revalidate = 0

const TOPIC_LABELS: Record<string, string> = {
  funding: 'funding',
  partnership: 'partnership',
  events: 'events',
  governance: 'governance',
  community: 'community',
  media: 'media',
  research: 'research',
  advocacy: 'advocacy',
  professional_development: 'pro-dev',
  marketing: 'marketing',
  personal: 'personal',
}

async function loadContacts(query?: string) {
  const sb = createAdminClient()
  let builder = sb
    .from('contacts')
    .select('id, first_name, last_name, email, contact_type, organization_id')
    .order('last_name', { ascending: true })
    .limit(500)
  if (query) {
    const q = query.toLowerCase()
    builder = builder.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)
  }
  const { data: contacts, error } = await builder
  if (error) throw new Error(error.message)

  // Pull org names separately — implicit join had multiple-FK ambiguity
  const orgIds = [...new Set((contacts || []).map((c: any) => c.organization_id).filter(Boolean))]
  let orgNameMap: Record<string, string> = {}
  if (orgIds.length) {
    const { data: orgs } = await sb.from('organizations').select('id, name').in('id', orgIds)
    for (const o of orgs || []) orgNameMap[(o as any).id] = (o as any).name
  }
  for (const c of contacts || []) {
    (c as any).organizations = c.organization_id ? { name: orgNameMap[c.organization_id] } : null
  }

  // For each contact, sum activities + top topic.
  const ids = (contacts || []).map((c: any) => c.id).filter(Boolean)
  let activityMap: Record<string, { total: number; topics: Record<string, number> }> = {}
  if (ids.length) {
    const { data: acts } = await sb
      .from('activities')
      .select('contact_id, metadata')
      .in('activity_type', ['email_sent', 'email_received'])
      .in('contact_id', ids)
    for (const row of acts || []) {
      const cid = (row as any).contact_id as string
      const topic = (row as any).metadata?.topic
      if (!cid) continue
      if (!activityMap[cid]) activityMap[cid] = { total: 0, topics: {} }
      activityMap[cid].total++
      if (topic) activityMap[cid].topics[topic] = (activityMap[cid].topics[topic] || 0) + 1
    }
  }

  const enriched = (contacts || []).map((c: any) => {
    const stats = activityMap[c.id] || { total: 0, topics: {} }
    const topTopics = Object.entries(stats.topics)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 3)
      .map(([topic, n]) => ({ topic, n: n as number }))
    return { ...c, threads: stats.total, topTopics }
  })

  // Sort by thread count, descending
  enriched.sort((a, b) => b.threads - a.threads)
  return enriched
}

function TopicChip({ topic, n }: { topic: string; n: number }) {
  return (
    <span className="border border-[#d4af37]/40 px-1.5 py-0.5 font-meta text-[10px] text-[#d4af37]">
      {TOPIC_LABELS[topic] || topic} <span className="text-[#a8a195]">{n}</span>
    </span>
  )
}

export default async function ContactsPage({ searchParams }: { searchParams: { q?: string } }) {
  const query = searchParams?.q
  const contacts = await loadContacts(query)
  const withActivity = contacts.filter((c: any) => c.threads > 0).length

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      {/* Hero */}
      <header className="border-b border-[#d4af37]/30 pb-8">
        <div className="font-meta text-[#a8a195]">Contacts · {contacts.length.toLocaleString()} loaded · {withActivity.toLocaleString()} with email activity</div>
        <h1 className="mt-4 font-display text-4xl text-[#f5f1e8]">
          People &amp; correspondents
        </h1>
        <p className="mt-3 max-w-xl font-tender text-[#a8a195]">
          Sorted by thread count. Topic chips show what each relationship is mostly about.
        </p>
      </header>

      {/* Search */}
      <form className="flex gap-3">
        <input
          type="search"
          name="q"
          defaultValue={query || ''}
          placeholder="Search name or email…"
          className="flex-1 border-2 border-[#d4af37]/30 bg-[#14141f] px-4 py-3 text-[#f5f1e8] placeholder:text-[#a8a195] focus:border-[#d4af37] focus:outline-none"
        />
        <button
          type="submit"
          className="border-2 border-[#d4af37] bg-transparent px-6 py-3 font-meta text-[#d4af37] hover:bg-[#d4af37] hover:text-[#0a0a14]"
        >
          Search
        </button>
        {query && (
          <Link
            href="/contacts"
            className="border-2 border-[#a8a195]/30 px-6 py-3 font-meta text-[#a8a195] hover:border-[#a8a195]"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Results */}
      <section>
        {contacts.length === 0 ? (
          <p className="font-tender text-[#a8a195]">No contacts match. Try a different search.</p>
        ) : (
          <ol className="divide-y divide-[#14141f]">
            {contacts.map((c: any) => {
              const name = `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || '(unknown)'
              const orgName = c.organizations?.name
              return (
                <li key={c.id} className="grid grid-cols-[1fr_auto] items-baseline gap-6 py-4">
                  <div className="min-w-0">
                    <Link href={`/contacts/${c.id}`} className="block">
                      <div className="text-lg text-[#f5f1e8] hover:text-[#d4af37]">{name}</div>
                      <div className="mt-1 truncate font-tender text-sm text-[#a8a195]">
                        {c.email}
                        {orgName && <span className="ml-2 text-[#d4af37]">· {orgName}</span>}
                      </div>
                    </Link>
                    {c.topTopics.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {c.topTopics.map((t: any) => (
                          <TopicChip key={t.topic} topic={t.topic} n={t.n} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-display text-3xl text-[#f5f1e8]">{c.threads}</div>
                    <div className="font-meta text-[#a8a195]">threads</div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </div>
  )
}
