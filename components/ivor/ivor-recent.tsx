'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRecentIvorInteractions } from '@/hooks/use-ivor'
import { DataSourceBadge } from '@/components/dashboard'
import { formatRelativeDate } from '@/lib/utils'
import { MessageSquare, User, Bot } from 'lucide-react'
import Link from 'next/link'

interface IvorRecentProps {
  className?: string
}

export function IvorRecent({ className }: IvorRecentProps) {
  const { data: interactions, isLoading } = useRecentIvorInteractions(5)

  return (
    <Card className={cn('animate-fade-in-up animate-delay-200', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-blkout-teal" />
            Recent Conversations
          </CardTitle>
          <DataSourceBadge source={interactions?.length ? 'live' : 'mock'} />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : interactions && interactions.length > 0 ? (
          <div className="space-y-4">
            {interactions.map((interaction) => {
              const metadata = interaction.metadata as { query?: string; response?: string }
              const contact = interaction.contact as {
                id: string
                first_name: string
                last_name: string
              } | null

              return (
                <div
                  key={interaction.id}
                  className="flex gap-3 p-3 rounded-lg border bg-gray-50/50 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    {contact ? (
                      <Link
                        href={`/contacts/${contact.id}`}
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-blkout-gold text-white text-xs font-medium"
                      >
                        {contact.first_name[0]}
                        {contact.last_name[0]}
                      </Link>
                    ) : (
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200">
                        <User className="h-4 w-4 text-gray-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-blkout-forest">
                        {contact
                          ? `${contact.first_name} ${contact.last_name}`
                          : 'Anonymous User'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeDate(interaction.occurred_at)}
                      </span>
                    </div>
                    {metadata?.query && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        <span className="font-medium">Q:</span> {metadata.query}
                      </p>
                    )}
                    {metadata?.response && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        <Bot className="h-3 w-3 inline mr-1" />
                        {metadata.response.substring(0, 100)}...
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-20" />
            No IVOR conversations yet.
            <br />
            Start chatting to see activity here.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
