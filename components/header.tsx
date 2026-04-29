'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Search } from 'lucide-react'

export function Header() {
  const router = useRouter()
  const [q, setQ] = useState('')

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (q.trim()) router.push(`/contacts?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <header className="flex h-16 items-center gap-6 border-b border-[#d4af37]/30 bg-[#0a0a14] px-8">
      <form onSubmit={onSubmit} className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a8a195]" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search contacts and orgs…"
            className="w-full border-2 border-[#d4af37]/20 bg-[#14141f] py-2 pl-10 pr-3 text-sm text-[#f5f1e8] placeholder:text-[#a8a195] focus:border-[#d4af37] focus:outline-none"
          />
        </div>
      </form>
      <div className="font-meta text-[10px] text-[#a8a195]">v6 · 286 sources · 17,053 threads · 11-topic taxonomy</div>
    </header>
  )
}
