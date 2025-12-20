'use client'

import { Bot, Settings, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  IvorStatus,
  IvorChat,
  IvorStats,
  IvorSearch,
  IvorRecent,
} from '@/components/ivor'
import { IVOR_CONFIG } from '@/types/ivor'

export default function IvorInsightsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blkout-teal to-blkout-forest flex items-center justify-center shadow-lg">
              <Bot className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-blkout-forest">
                IVOR Insights
              </h1>
              <p className="text-muted-foreground">
                AI-powered community support and resource discovery
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {IVOR_CONFIG.baseUrl.replace('https://', '')}
          </Badge>
          <Button variant="outline" size="sm" asChild>
            <a
              href={IVOR_CONFIG.baseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open IVOR
            </a>
          </Button>
        </div>
      </div>

      {/* Main Grid - Chat and Status */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Chat Interface */}
          <IvorChat className="min-h-[500px]" />
        </div>
        <div className="space-y-6">
          {/* Status */}
          <IvorStatus />
          {/* Stats */}
          <IvorStats />
        </div>
      </section>

      {/* Secondary Grid - Search and Recent */}
      <section className="grid gap-6 md:grid-cols-2">
        {/* Resource Search */}
        <IvorSearch />
        {/* Recent Conversations */}
        <IvorRecent />
      </section>

      {/* Info Banner */}
      <section className="p-6 rounded-xl bg-gradient-to-r from-blkout-teal/10 to-blkout-gold/10 border">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blkout-teal/20 flex items-center justify-center">
            <Bot className="h-5 w-5 text-blkout-teal" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-blkout-forest mb-1">
              About IVOR
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              IVOR (Intelligent Virtual Outreach Resource) is an AI assistant designed specifically
              for the Black queer community in the UK. IVOR provides culturally affirming support,
              connects community members with resources, and offers immediate crisis assistance.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Community Resources</Badge>
              <Badge variant="secondary">Mental Health Support</Badge>
              <Badge variant="secondary">Crisis Intervention</Badge>
              <Badge variant="secondary">Sexual Health</Badge>
              <Badge variant="secondary">Housing Support</Badge>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
