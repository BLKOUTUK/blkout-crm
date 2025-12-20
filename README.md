# BLKOUT CRM

A community-centered relationship management system built for BLKOUT UK, designed to support the organisation's mission of liberation, community ownership, and democratic governance for Black queer communities.

## Features

- **Contact Management**: Track relationships with CBS members, community members, partners, funders, volunteers, and more
- **Organization Directory**: Manage relationships across 10 partner types (grassroots, government, international NGOs, funders, etc.)
- **Grant Pipeline**: Visual Kanban and list views for managing funding applications with probability tracking
- **Policy Tracking**: Monitor advocacy work and policy engagements
- **Dashboard Analytics**: Real-time metrics and visualizations
- **Integration Ready**: Built to connect with BLKOUT Events Calendar, IVOR AI, and n8n workflows

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **UI Components**: shadcn/ui, Tailwind CSS, Radix UI
- **Database**: Supabase (PostgreSQL)
- **State Management**: TanStack Query (React Query)
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod validation

## Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase project (existing BLKOUT infrastructure)

## Getting Started

### 1. Install Dependencies

```bash
cd /home/robbe/ACTIVE_PROJECTS/BLKOUTNXT_Ecosystem/BLKOUTNXT_Projects/CRM
npm install
```

### 2. Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Apply Database Migration

Run the migration in your Supabase SQL editor:

```bash
# Copy contents of migrations/001_crm_complete_schema.sql
# Paste into Supabase SQL Editor and execute
```

Or use Supabase CLI:

```bash
supabase db push
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the CRM.

## Project Structure

```
CRM/
├── app/                      # Next.js App Router pages
│   ├── dashboard/           # Main dashboard with metrics
│   ├── contacts/            # Contact management
│   │   └── [id]/           # Contact detail view
│   ├── organizations/       # Organization directory
│   │   └── [id]/           # Organization detail view
│   ├── grants/              # Grant pipeline
│   │   └── [id]/           # Grant detail view
│   ├── campaigns/           # Campaigns & communications
│   ├── reports/             # Analytics & reports
│   └── settings/            # System settings
├── components/              # React components
│   ├── ui/                 # shadcn/ui components
│   ├── sidebar.tsx         # Navigation sidebar
│   ├── header.tsx          # Top header
│   └── query-provider.tsx  # TanStack Query setup
├── hooks/                   # React Query hooks
│   ├── use-contacts.ts     # Contact CRUD operations
│   ├── use-organizations.ts # Organization CRUD
│   ├── use-grants.ts       # Grant management
│   └── use-dashboard.ts    # Dashboard metrics
├── lib/                     # Utilities
│   ├── supabase.ts         # Supabase client
│   └── utils.ts            # Helper functions
├── types/                   # TypeScript definitions
│   └── database.ts         # Database types
└── migrations/              # SQL migrations
    └── 001_crm_complete_schema.sql
```

## Organization Types

The CRM supports 10 distinct organizational partner types:

| Type | Icon | Description |
|------|------|-------------|
| Grassroots & Community | 🌱 | Community-led organizations |
| Policy & Advocacy | 📣 | Rights and advocacy organizations |
| Government & Public Sector | 🏛 | Government departments and agencies |
| International NGOs | 🌍 | Global organizations and networks |
| Funder & Foundation | 💰 | Grant-making organizations |
| Academic & Research | 🎓 | Universities and research institutions |
| Healthcare Provider | 🏥 | Health services and providers |
| Media & Cultural | 🎭 | Media outlets and cultural orgs |
| Corporate | 🏢 | Private sector partners |
| Other | 📌 | Other partner types |

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

```bash
vercel --prod
```

### Environment Variables for Production

Set these in your Vercel project settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Integration Points

### Events Calendar
- Sync event participants as contacts
- Track event attendance and engagement

### IVOR AI
- Log AI interactions with community members
- Store conversation summaries and support requests

### n8n Workflows
- Automate email campaigns
- Sync data with external systems
- Trigger notifications on key events

## Database Functions

The CRM includes PostgreSQL functions for:

- `get_dashboard_metrics()` - Aggregate dashboard statistics
- `get_grant_pipeline_stats()` - Grant pipeline calculations
- `get_upcoming_deadlines()` - Deadline tracking
- `search_contacts()` - Full-text contact search
- `calculate_engagement_score()` - Engagement scoring

## Contributing

This CRM is built for BLKOUT UK's specific needs. For contributions:

1. Follow existing code patterns
2. Use TypeScript strictly
3. Maintain accessibility standards
4. Test with real data scenarios

## License

Private - BLKOUT UK Community Benefit Society

---

Built with liberation technology principles for Black queer communities.
