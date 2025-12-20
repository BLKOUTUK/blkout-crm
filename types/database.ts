// BLKOUT CRM Database Types
// Generated from Supabase schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enum Types
export type OrgType =
  | 'grassroots_community'
  | 'policy_advocacy'
  | 'government_public_sector'
  | 'international_ngo'
  | 'funder_foundation'
  | 'academic_research'
  | 'healthcare_provider'
  | 'media_cultural'
  | 'corporate'
  | 'other'

export type GeographyScope =
  | 'local'
  | 'regional'
  | 'national'
  | 'uk_wide'
  | 'european'
  | 'international'
  | 'global'

export type RelationshipType =
  | 'coalition_member'
  | 'strategic_partner'
  | 'funder'
  | 'policy_ally'
  | 'service_partner'
  | 'research_collaborator'
  | 'media_partner'
  | 'sponsor'
  | 'prospect'
  | 'dormant'
  | 'former'

export type RelationshipStatus =
  | 'active'
  | 'developing'
  | 'on_hold'
  | 'ended'
  | 'prospect'

export type ContactStatus = 'active' | 'inactive' | 'prospect' | 'archived'

export type EngagementLevel =
  | 'champion'
  | 'high'
  | 'medium'
  | 'low'
  | 'new'
  | 'dormant'

export type InfluenceLevel =
  | 'decision_maker'
  | 'influencer'
  | 'recommender'
  | 'gatekeeper'
  | 'user'

export type PartnershipType =
  | 'mou'
  | 'coalition'
  | 'project'
  | 'funding'
  | 'service_agreement'
  | 'informal'
  | 'referral_network'

export type PolicyEngagementType =
  | 'consultation_response'
  | 'meeting'
  | 'roundtable'
  | 'inquiry_evidence'
  | 'lobbying_meeting'
  | 'public_statement'
  | 'joint_letter'
  | 'campaign'
  | 'working_group'
  | 'advisory_panel'
  | 'speaking_engagement'

export type GrantStage =
  | 'research'
  | 'preparing'
  | 'submitted'
  | 'under_review'
  | 'interview'
  | 'decision_pending'
  | 'approved'
  | 'rejected'
  | 'withdrawn'
  | 'active'
  | 'reporting'
  | 'completed'

export type ActivityType =
  | 'note'
  | 'email_sent'
  | 'email_received'
  | 'call'
  | 'meeting'
  | 'event_attendance'
  | 'donation'
  | 'task_completed'
  | 'status_change'
  | 'ivor_interaction'
  | 'form_submission'
  | 'website_visit'
  | 'policy_engagement'
  | 'grant_update'
  | 'partnership_update'
  | 'social_media_interaction'

export type TaskType =
  | 'follow_up'
  | 'meeting_prep'
  | 'grant_deadline'
  | 'report_due'
  | 'renewal_review'
  | 'outreach'
  | 'internal'
  | 'event_related'

export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'deferred'

export type DonationType =
  | 'individual'
  | 'corporate'
  | 'grant'
  | 'sponsorship'
  | 'in_kind'
  | 'legacy'

export type DonationStatus =
  | 'pledged'
  | 'pending'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'cancelled'

export type VolunteerStatus =
  | 'active'
  | 'inactive'
  | 'onboarding'
  | 'alumni'
  | 'prospect'

export type OutcomeRating =
  | 'very_positive'
  | 'positive'
  | 'neutral'
  | 'negative'
  | 'unknown'
  | 'pending'

// Database Tables
export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          org_type: OrgType
          sector: string[] | null
          jurisdiction: string | null
          geography_scope: GeographyScope | null
          department_agency: string | null
          country: string
          relationship_type: RelationshipType | null
          relationship_status: RelationshipStatus
          relationship_start_date: string | null
          relationship_end_date: string | null
          policy_areas: string[] | null
          advocacy_positions: Json
          website: string | null
          email: string | null
          phone: string | null
          address: Json
          social_media: Json
          is_funder: boolean
          funding_priorities: string[] | null
          typical_grant_range: string | null
          application_deadlines: Json
          primary_contact_id: string | null
          notes: string | null
          logo_url: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          name: string
          org_type: OrgType
          sector?: string[] | null
          jurisdiction?: string | null
          geography_scope?: GeographyScope | null
          department_agency?: string | null
          country?: string
          relationship_type?: RelationshipType | null
          relationship_status?: RelationshipStatus
          relationship_start_date?: string | null
          relationship_end_date?: string | null
          policy_areas?: string[] | null
          advocacy_positions?: Json
          website?: string | null
          email?: string | null
          phone?: string | null
          address?: Json
          social_media?: Json
          is_funder?: boolean
          funding_priorities?: string[] | null
          typical_grant_range?: string | null
          application_deadlines?: Json
          primary_contact_id?: string | null
          notes?: string | null
          logo_url?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          org_type?: OrgType
          sector?: string[] | null
          jurisdiction?: string | null
          geography_scope?: GeographyScope | null
          department_agency?: string | null
          country?: string
          relationship_type?: RelationshipType | null
          relationship_status?: RelationshipStatus
          relationship_start_date?: string | null
          relationship_end_date?: string | null
          policy_areas?: string[] | null
          advocacy_positions?: Json
          website?: string | null
          email?: string | null
          phone?: string | null
          address?: Json
          social_media?: Json
          is_funder?: boolean
          funding_priorities?: string[] | null
          typical_grant_range?: string | null
          application_deadlines?: Json
          primary_contact_id?: string | null
          notes?: string | null
          logo_url?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
      }
      contacts: {
        Row: {
          id: string
          first_name: string
          last_name: string
          email: string | null
          phone: string | null
          preferred_name: string | null
          pronouns: string | null
          contact_type: string[]
          status: ContactStatus
          engagement_level: EngagementLevel | null
          organization_id: string | null
          job_title: string | null
          department: string | null
          seniority_level: string | null
          policy_responsibilities: string[] | null
          influence_level: InfluenceLevel | null
          decision_areas: string[] | null
          communication_preferences: Json
          preferred_contact_method: string
          best_time_to_contact: string | null
          source: string | null
          referrer_id: string | null
          cbs_member_id: string | null
          ivor_user_id: string | null
          ivor_last_interaction: string | null
          ivor_interaction_count: number
          ivor_topics: string[] | null
          avatar_url: string | null
          social_links: Json
          custom_fields: Json
          notes: string | null
          created_at: string
          updated_at: string
          last_contacted: string | null
          next_follow_up: string | null
          created_by: string | null
        }
        Insert: {
          id?: string
          first_name: string
          last_name: string
          email?: string | null
          phone?: string | null
          preferred_name?: string | null
          pronouns?: string | null
          contact_type?: string[]
          status?: ContactStatus
          engagement_level?: EngagementLevel | null
          organization_id?: string | null
          job_title?: string | null
          department?: string | null
          seniority_level?: string | null
          policy_responsibilities?: string[] | null
          influence_level?: InfluenceLevel | null
          decision_areas?: string[] | null
          communication_preferences?: Json
          preferred_contact_method?: string
          best_time_to_contact?: string | null
          source?: string | null
          referrer_id?: string | null
          cbs_member_id?: string | null
          ivor_user_id?: string | null
          ivor_last_interaction?: string | null
          ivor_interaction_count?: number
          ivor_topics?: string[] | null
          avatar_url?: string | null
          social_links?: Json
          custom_fields?: Json
          notes?: string | null
          created_at?: string
          updated_at?: string
          last_contacted?: string | null
          next_follow_up?: string | null
          created_by?: string | null
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          email?: string | null
          phone?: string | null
          preferred_name?: string | null
          pronouns?: string | null
          contact_type?: string[]
          status?: ContactStatus
          engagement_level?: EngagementLevel | null
          organization_id?: string | null
          job_title?: string | null
          department?: string | null
          seniority_level?: string | null
          policy_responsibilities?: string[] | null
          influence_level?: InfluenceLevel | null
          decision_areas?: string[] | null
          communication_preferences?: Json
          preferred_contact_method?: string
          best_time_to_contact?: string | null
          source?: string | null
          referrer_id?: string | null
          cbs_member_id?: string | null
          ivor_user_id?: string | null
          ivor_last_interaction?: string | null
          ivor_interaction_count?: number
          ivor_topics?: string[] | null
          avatar_url?: string | null
          social_links?: Json
          custom_fields?: Json
          notes?: string | null
          created_at?: string
          updated_at?: string
          last_contacted?: string | null
          next_follow_up?: string | null
          created_by?: string | null
        }
      }
      grant_pipeline: {
        Row: {
          id: string
          funder_id: string
          funder_contact_id: string | null
          grant_name: string
          grant_program: string | null
          description: string | null
          amount_requested: number | null
          amount_awarded: number | null
          currency: string
          is_multi_year: boolean
          grant_period_months: number | null
          stage: GrantStage
          stage_entered_at: string
          probability: number | null
          deadline: string | null
          submitted_at: string | null
          decision_expected: string | null
          decision_received: string | null
          grant_start_date: string | null
          grant_end_date: string | null
          is_restricted: boolean
          restrictions_description: string | null
          match_funding_required: boolean
          match_funding_amount: number | null
          reporting_requirements: string | null
          next_report_due: string | null
          application_document_url: string | null
          budget_document_url: string | null
          assigned_to: string | null
          reviewed_by: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          funder_id: string
          funder_contact_id?: string | null
          grant_name: string
          grant_program?: string | null
          description?: string | null
          amount_requested?: number | null
          amount_awarded?: number | null
          currency?: string
          is_multi_year?: boolean
          grant_period_months?: number | null
          stage?: GrantStage
          stage_entered_at?: string
          probability?: number | null
          deadline?: string | null
          submitted_at?: string | null
          decision_expected?: string | null
          decision_received?: string | null
          grant_start_date?: string | null
          grant_end_date?: string | null
          is_restricted?: boolean
          restrictions_description?: string | null
          match_funding_required?: boolean
          match_funding_amount?: number | null
          reporting_requirements?: string | null
          next_report_due?: string | null
          application_document_url?: string | null
          budget_document_url?: string | null
          assigned_to?: string | null
          reviewed_by?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          funder_id?: string
          funder_contact_id?: string | null
          grant_name?: string
          grant_program?: string | null
          description?: string | null
          amount_requested?: number | null
          amount_awarded?: number | null
          currency?: string
          is_multi_year?: boolean
          grant_period_months?: number | null
          stage?: GrantStage
          stage_entered_at?: string
          probability?: number | null
          deadline?: string | null
          submitted_at?: string | null
          decision_expected?: string | null
          decision_received?: string | null
          grant_start_date?: string | null
          grant_end_date?: string | null
          is_restricted?: boolean
          restrictions_description?: string | null
          match_funding_required?: boolean
          match_funding_amount?: number | null
          reporting_requirements?: string | null
          next_report_due?: string | null
          application_document_url?: string | null
          budget_document_url?: string | null
          assigned_to?: string | null
          reviewed_by?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      activities: {
        Row: {
          id: string
          contact_id: string | null
          organization_id: string | null
          activity_type: ActivityType
          subject: string | null
          description: string | null
          metadata: Json
          partnership_id: string | null
          grant_id: string | null
          policy_engagement_id: string | null
          occurred_at: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          contact_id?: string | null
          organization_id?: string | null
          activity_type: ActivityType
          subject?: string | null
          description?: string | null
          metadata?: Json
          partnership_id?: string | null
          grant_id?: string | null
          policy_engagement_id?: string | null
          occurred_at?: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          contact_id?: string | null
          organization_id?: string | null
          activity_type?: ActivityType
          subject?: string | null
          description?: string | null
          metadata?: Json
          partnership_id?: string | null
          grant_id?: string | null
          policy_engagement_id?: string | null
          occurred_at?: string
          created_by?: string | null
          created_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          contact_id: string | null
          organization_id: string | null
          grant_id: string | null
          partnership_id: string | null
          title: string
          description: string | null
          task_type: TaskType | null
          due_date: string | null
          due_time: string | null
          reminder_date: string | null
          priority: Priority
          status: TaskStatus
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          is_recurring: boolean
          recurrence_pattern: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          contact_id?: string | null
          organization_id?: string | null
          grant_id?: string | null
          partnership_id?: string | null
          title: string
          description?: string | null
          task_type?: TaskType | null
          due_date?: string | null
          due_time?: string | null
          reminder_date?: string | null
          priority?: Priority
          status?: TaskStatus
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          is_recurring?: boolean
          recurrence_pattern?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          contact_id?: string | null
          organization_id?: string | null
          grant_id?: string | null
          partnership_id?: string | null
          title?: string
          description?: string | null
          task_type?: TaskType | null
          due_date?: string | null
          due_time?: string | null
          reminder_date?: string | null
          priority?: Priority
          status?: TaskStatus
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          is_recurring?: boolean
          recurrence_pattern?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tags: {
        Row: {
          id: string
          name: string
          color: string
          category: string | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          color?: string
          category?: string | null
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          color?: string
          category?: string | null
          description?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_dashboard_metrics: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_grant_pipeline_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_upcoming_deadlines: {
        Args: {
          days_ahead?: number
        }
        Returns: {
          id: string
          deadline_type: string
          title: string
          due_date: string
          related_org: string
          priority: string
        }[]
      }
      search_contacts: {
        Args: {
          search_term: string
        }
        Returns: Database['public']['Tables']['contacts']['Row'][]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Organization = Database['public']['Tables']['organizations']['Row']
export type OrganizationInsert = Database['public']['Tables']['organizations']['Insert']
export type OrganizationUpdate = Database['public']['Tables']['organizations']['Update']

export type Contact = Database['public']['Tables']['contacts']['Row']
export type ContactInsert = Database['public']['Tables']['contacts']['Insert']
export type ContactUpdate = Database['public']['Tables']['contacts']['Update']

export type Grant = Database['public']['Tables']['grant_pipeline']['Row']
export type GrantInsert = Database['public']['Tables']['grant_pipeline']['Insert']
export type GrantUpdate = Database['public']['Tables']['grant_pipeline']['Update']

export type Activity = Database['public']['Tables']['activities']['Row']
export type ActivityInsert = Database['public']['Tables']['activities']['Insert']

export type Task = Database['public']['Tables']['tasks']['Row']
export type TaskInsert = Database['public']['Tables']['tasks']['Insert']
export type TaskUpdate = Database['public']['Tables']['tasks']['Update']

export type Tag = Database['public']['Tables']['tags']['Row']

// Dashboard metrics type
export interface DashboardMetrics {
  total_contacts: number
  community_members: number
  organizations: number
  active_grants: number
  pipeline_value: number
  funds_secured: number
  pending_tasks: number
  overdue_tasks: number
}

// Grant pipeline stats type
export interface GrantPipelineStats {
  by_stage: Record<GrantStage, number>
  pipeline_value: number
  weighted_pipeline: number
  pending_count: number
  this_year_secured: number
}

// Upcoming deadline type
export interface UpcomingDeadline {
  id: string
  deadline_type: 'grant' | 'report' | 'renewal'
  title: string
  due_date: string
  related_org: string
  priority: 'urgent' | 'high' | 'medium'
}
