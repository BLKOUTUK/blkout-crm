'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useIvorSearch } from '@/hooks/use-ivor'
import {
  Search,
  Loader2,
  ExternalLink,
  MapPin,
  Tag,
} from 'lucide-react'
import type { IvorSearchResult } from '@/types/ivor'

interface IvorSearchProps {
  className?: string
}

export function IvorSearch({ className }: IvorSearchProps) {
  const [query, setQuery] = useState('')
  const { mutate: search, data, isPending, isError } = useIvorSearch()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    search({ query: query.trim(), limit: 10 })
  }

  return (
    <Card className={cn('animate-fade-in-up animate-delay-100', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Search className="h-5 w-5 text-blkout-teal" />
          Search Community Resources
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Form */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search resources, services, organizations..."
            className="flex-1"
          />
          <Button type="submit" disabled={isPending || !query.trim()}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </form>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2">
          {['Mental Health', 'Sexual Health', 'Housing', 'Community', 'Crisis'].map(
            (filter) => (
              <Button
                key={filter}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setQuery(filter)
                  search({ query: filter, limit: 10 })
                }}
              >
                {filter}
              </Button>
            )
          )}
        </div>

        {/* Results */}
        {isError && (
          <div className="text-center py-4 text-red-500 text-sm">
            Failed to search resources. Please try again.
          </div>
        )}

        {data && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{data.total} results found</span>
              {data.processingTimeMs > 0 && (
                <span>{data.processingTimeMs}ms</span>
              )}
            </div>

            {data.results.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {data.results.map((result) => (
                  <SearchResultCard key={result.id} result={result} />
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No resources found for "{query}"
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!data && !isPending && (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Search IVOR's knowledge base for community resources,
            <br />
            organizations, and support services.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SearchResultCard({ result }: { result: IvorSearchResult }) {
  return (
    <div className="p-3 rounded-lg border bg-white hover:border-blkout-teal/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-blkout-forest truncate">
            {result.name}
          </h4>
          {result.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {result.description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            {result.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {result.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              {result.type}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge
            variant="outline"
            className={cn(
              'text-xs',
              result.score > 0.8
                ? 'border-green-500 text-green-600'
                : result.score > 0.6
                ? 'border-yellow-500 text-yellow-600'
                : 'border-gray-300 text-gray-500'
            )}
          >
            {Math.round(result.score * 100)}%
          </Badge>
          {typeof result.metadata?.url === 'string' && result.metadata.url && (
            <Button variant="ghost" size="sm" asChild>
              <a href={result.metadata.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
