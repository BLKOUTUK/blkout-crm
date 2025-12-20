-- ============================================
-- BLKOUT CRM Complete Database Schema
-- Version: 1.0.0
-- Created: 2025-12-19
-- ============================================
-- Run this migration in Supabase SQL Editor
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES (for type safety)
-- ============================================

-- Organization type enum
CREATE TYPE org_type_enum AS ENUM (
    'grassroots_community',
    'policy_advocacy',
    'government_public_sector',
    'international_ngo',
    'funder_foundation',
    'academic_research',
    'healthcare_provider',
    'media_cultural',
    'corporate',
    'other'
);

-- Geography scope enum
CREATE TYPE geography_scope_enum AS ENUM (
    'local', 'regional', 'national', 'uk_wide', 'european', 'international', 'global'
);

-- Relationship type enum
CREATE TYPE relationship_type_enum AS ENUM (
    'coalition_member', 'strategic_partner', 'funder', 'policy_ally',
    'service_partner', 'research_collaborator', 'media_partner', 'sponsor',
    'prospect', 'dormant', 'former'
);

-- Relationship status enum
CREATE TYPE relationship_status_enum AS ENUM (
    'active', 'developing', 'on_hold', 'ended', 'prospect'
);

-- Contact status enum
CREATE TYPE contact_status_enum AS ENUM (
    'active', 'inactive', 'prospect', 'archived'
);

-- Engagement level enum
CREATE TYPE engagement_level_enum AS ENUM (
    'champion', 'high', 'medium', 'low', 'new', 'dormant'
);

-- Influence level enum
CREATE TYPE influence_level_enum AS ENUM (
    'decision_maker', 'influencer', 'recommender', 'gatekeeper', 'user'
);

-- Partnership type enum
CREATE TYPE partnership_type_enum AS ENUM (
    'mou', 'coalition', 'project', 'funding', 'service_agreement',
    'informal', 'referral_network'
);

-- Policy engagement type enum
CREATE TYPE policy_engagement_type_enum AS ENUM (
    'consultation_response', 'meeting', 'roundtable', 'inquiry_evidence',
    'lobbying_meeting', 'public_statement', 'joint_letter', 'campaign',
    'working_group', 'advisory_panel', 'speaking_engagement'
);

-- Grant stage enum
CREATE TYPE grant_stage_enum AS ENUM (
    'research', 'preparing', 'submitted', 'under_review',
    'interview', 'decision_pending', 'approved', 'rejected',
    'withdrawn', 'active', 'reporting', 'completed'
);

-- Activity type enum
CREATE TYPE activity_type_enum AS ENUM (
    'note', 'email_sent', 'email_received', 'call', 'meeting',
    'event_attendance', 'donation', 'task_completed', 'status_change',
    'ivor_interaction', 'form_submission', 'website_visit',
    'policy_engagement', 'grant_update', 'partnership_update',
    'social_media_interaction'
);

-- Task type enum
CREATE TYPE task_type_enum AS ENUM (
    'follow_up', 'meeting_prep', 'grant_deadline', 'report_due',
    'renewal_review', 'outreach', 'internal', 'event_related'
);

-- Priority enum
CREATE TYPE priority_enum AS ENUM ('low', 'medium', 'high', 'urgent');

-- Task status enum
CREATE TYPE task_status_enum AS ENUM (
    'pending', 'in_progress', 'completed', 'cancelled', 'deferred'
);

-- Donation type enum
CREATE TYPE donation_type_enum AS ENUM (
    'individual', 'corporate', 'grant', 'sponsorship', 'in_kind', 'legacy'
);

-- Donation status enum
CREATE TYPE donation_status_enum AS ENUM (
    'pledged', 'pending', 'completed', 'failed', 'refunded', 'cancelled'
);

-- Volunteer status enum
CREATE TYPE volunteer_status_enum AS ENUM (
    'active', 'inactive', 'onboarding', 'alumni', 'prospect'
);

-- Outcome rating enum
CREATE TYPE outcome_rating_enum AS ENUM (
    'very_positive', 'positive', 'neutral', 'negative', 'unknown', 'pending'
);

-- ============================================
-- ORGANIZATIONS TABLE
-- All organizational partners across sectors
-- ============================================
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,

    -- Classification
    org_type org_type_enum NOT NULL,

    -- Sector & Scope
    sector TEXT[] DEFAULT '{}', -- ['health', 'lgbtq', 'racial_justice', 'arts', etc.]
    jurisdiction TEXT, -- 'uk_national', 'england', 'london', 'scotland', 'wales', 'international'
    geography_scope geography_scope_enum,

    -- For Government/International bodies
    department_agency TEXT, -- e.g., "Department of Health and Social Care"
    country TEXT DEFAULT 'UK',

    -- Relationship Status
    relationship_type relationship_type_enum,
    relationship_status relationship_status_enum DEFAULT 'active',
    relationship_start_date DATE,
    relationship_end_date DATE,

    -- Policy & Advocacy Focus
    policy_areas TEXT[] DEFAULT '{}', -- ['hiv_aids', 'mental_health', 'racial_equity', 'lgbtq_rights']
    advocacy_positions JSONB DEFAULT '{}', -- Track their stances on key issues

    -- Contact Details
    website TEXT,
    email TEXT,
    phone TEXT,
    address JSONB DEFAULT '{}',
    social_media JSONB DEFAULT '{}',

    -- For Funders
    is_funder BOOLEAN DEFAULT FALSE,
    funding_priorities TEXT[] DEFAULT '{}',
    typical_grant_range TEXT, -- e.g., "£10,000-£50,000"
    application_deadlines JSONB DEFAULT '{}',

    -- Internal
    primary_contact_id UUID, -- Will add FK constraint after contacts table
    notes TEXT,
    logo_url TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- ============================================
-- CONTACTS TABLE
-- All individual stakeholders
-- ============================================
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Basic Info
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    preferred_name TEXT,
    pronouns TEXT,

    -- Classification (can have multiple types)
    contact_type TEXT[] DEFAULT '{}',
    -- Types: 'cbs_member', 'community_member', 'partner_contact',
    --        'funder_contact', 'government_official', 'volunteer',
    --        'event_participant', 'subscriber', 'ally', 'media_contact'

    -- Status
    status contact_status_enum DEFAULT 'active',
    engagement_level engagement_level_enum,

    -- Organization Link
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    job_title TEXT,
    department TEXT, -- Important for government contacts

    -- For Government/Policy Contacts
    seniority_level TEXT, -- 'ministerial', 'senior_civil_service', 'policy_official'
    policy_responsibilities TEXT[] DEFAULT '{}',

    -- Influence & Decision Making
    influence_level influence_level_enum,
    decision_areas TEXT[] DEFAULT '{}', -- What they can influence

    -- Communication Preferences
    communication_preferences JSONB DEFAULT '{"email": true, "sms": false, "phone": false}',
    preferred_contact_method TEXT DEFAULT 'email',
    best_time_to_contact TEXT,

    -- Source & Attribution
    source TEXT,
    referrer_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

    -- CBS Member Link (to existing members table)
    cbs_member_id UUID, -- Will reference members table

    -- IVOR Interaction Tracking
    ivor_user_id TEXT, -- IVOR's internal user ID
    ivor_last_interaction TIMESTAMPTZ,
    ivor_interaction_count INTEGER DEFAULT 0,
    ivor_topics TEXT[] DEFAULT '{}', -- Topics discussed with IVOR

    -- Metadata
    avatar_url TEXT,
    social_links JSONB DEFAULT '{}',
    custom_fields JSONB DEFAULT '{}',
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_contacted TIMESTAMPTZ,
    next_follow_up DATE,
    created_by UUID REFERENCES auth.users(id)
);

-- Add FK constraint for organizations.primary_contact_id
ALTER TABLE organizations
ADD CONSTRAINT fk_primary_contact
FOREIGN KEY (primary_contact_id) REFERENCES contacts(id) ON DELETE SET NULL;

-- ============================================
-- PARTNERSHIPS TABLE
-- Formal partnership tracking
-- ============================================
CREATE TABLE partnerships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    partnership_type partnership_type_enum,

    name TEXT NOT NULL, -- Partnership/agreement name
    description TEXT,

    -- Timeline
    start_date DATE,
    end_date DATE,
    renewal_date DATE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Documentation
    agreement_document_url TEXT,
    objectives JSONB DEFAULT '[]',
    deliverables JSONB DEFAULT '[]',
    success_metrics JSONB DEFAULT '[]',

    -- Value (if applicable)
    financial_value DECIMAL(12, 2),
    in_kind_value DECIMAL(12, 2),
    currency TEXT DEFAULT 'GBP',

    -- Ownership
    lead_contact_blkout UUID REFERENCES auth.users(id),
    lead_contact_partner UUID REFERENCES contacts(id) ON DELETE SET NULL,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- POLICY_ENGAGEMENTS TABLE
-- Track policy & advocacy activities
-- ============================================
CREATE TABLE policy_engagements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Who we engaged with
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

    engagement_type policy_engagement_type_enum,

    -- Details
    title TEXT NOT NULL,
    description TEXT,
    policy_area TEXT[] DEFAULT '{}',

    -- For consultations/inquiries
    consultation_reference TEXT,
    submission_deadline DATE,
    our_submission_url TEXT,

    -- Dates
    engagement_date DATE,
    follow_up_date DATE,

    -- Outcome tracking
    outcome TEXT,
    outcome_rating outcome_rating_enum,
    impact_notes TEXT,

    -- Who was involved
    blkout_attendees UUID[] DEFAULT '{}',
    external_attendees TEXT[] DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- ============================================
-- GRANT_PIPELINE TABLE
-- Track funding applications
-- ============================================
CREATE TABLE grant_pipeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    funder_id UUID REFERENCES organizations(id) ON DELETE SET NULL NOT NULL,
    funder_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

    -- Grant Details
    grant_name TEXT NOT NULL,
    grant_program TEXT, -- Which program within the funder
    description TEXT,

    -- Financials
    amount_requested DECIMAL(12, 2),
    amount_awarded DECIMAL(12, 2),
    currency TEXT DEFAULT 'GBP',
    is_multi_year BOOLEAN DEFAULT FALSE,
    grant_period_months INTEGER,

    -- Pipeline Stage
    stage grant_stage_enum NOT NULL DEFAULT 'research',
    stage_entered_at TIMESTAMPTZ DEFAULT NOW(),
    probability INTEGER CHECK (probability BETWEEN 0 AND 100),

    -- Key Dates
    deadline DATE,
    submitted_at DATE,
    decision_expected DATE,
    decision_received DATE,
    grant_start_date DATE,
    grant_end_date DATE,

    -- Requirements
    is_restricted BOOLEAN DEFAULT FALSE, -- Restricted vs unrestricted funding
    restrictions_description TEXT,
    match_funding_required BOOLEAN DEFAULT FALSE,
    match_funding_amount DECIMAL(12, 2),

    -- Reporting
    reporting_requirements TEXT,
    next_report_due DATE,

    -- Application Materials
    application_document_url TEXT,
    budget_document_url TEXT,

    -- Ownership
    assigned_to UUID REFERENCES auth.users(id),
    reviewed_by UUID REFERENCES auth.users(id),

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ACTIVITIES TABLE
-- Timeline of all interactions
-- ============================================
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    activity_type activity_type_enum NOT NULL,

    subject TEXT,
    description TEXT,
    metadata JSONB DEFAULT '{}',

    -- Links to related entities
    partnership_id UUID REFERENCES partnerships(id) ON DELETE SET NULL,
    grant_id UUID REFERENCES grant_pipeline(id) ON DELETE SET NULL,
    policy_engagement_id UUID REFERENCES policy_engagements(id) ON DELETE SET NULL,

    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TASKS TABLE
-- Follow-ups and action items
-- ============================================
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    grant_id UUID REFERENCES grant_pipeline(id) ON DELETE SET NULL,
    partnership_id UUID REFERENCES partnerships(id) ON DELETE SET NULL,

    title TEXT NOT NULL,
    description TEXT,

    task_type task_type_enum,

    due_date DATE,
    due_time TIME,
    reminder_date DATE,

    priority priority_enum DEFAULT 'medium',
    status task_status_enum DEFAULT 'pending',

    assigned_to UUID REFERENCES auth.users(id),
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES auth.users(id),

    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern TEXT,

    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DONATIONS TABLE
-- Financial contributions (individuals & orgs)
-- ============================================
CREATE TABLE donations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    grant_id UUID REFERENCES grant_pipeline(id) ON DELETE SET NULL,

    amount DECIMAL(12, 2) NOT NULL,
    currency TEXT DEFAULT 'GBP',

    donation_type donation_type_enum,

    status donation_status_enum DEFAULT 'completed',

    -- Payment
    payment_method TEXT,
    payment_reference TEXT,
    stripe_payment_id TEXT, -- Link to Stripe

    -- Restrictions
    is_restricted BOOLEAN DEFAULT FALSE,
    restriction_description TEXT,
    designated_purpose TEXT,

    -- Recognition
    recognition_name TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    public_thanks_given BOOLEAN DEFAULT FALSE,

    -- Attribution
    campaign TEXT,
    appeal TEXT,
    source TEXT,

    -- Tax
    gift_aid_eligible BOOLEAN DEFAULT FALSE,
    gift_aid_claimed BOOLEAN DEFAULT FALSE,

    notes TEXT,
    receipt_sent BOOLEAN DEFAULT FALSE,
    receipt_sent_at TIMESTAMPTZ,

    donated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- ============================================
-- VOLUNTEERS TABLE
-- Volunteer management
-- ============================================
CREATE TABLE volunteers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,

    status volunteer_status_enum DEFAULT 'prospect',

    -- Skills & Availability
    skills TEXT[] DEFAULT '{}',
    interests TEXT[] DEFAULT '{}',
    availability JSONB DEFAULT '{}', -- {"weekdays": true, "evenings": true, etc.}

    -- Hours
    total_hours DECIMAL(8, 2) DEFAULT 0,
    hours_this_month DECIMAL(8, 2) DEFAULT 0,
    hours_this_year DECIMAL(8, 2) DEFAULT 0,

    -- Training & Compliance
    training_completed TEXT[] DEFAULT '{}',
    dbs_check_date DATE,
    dbs_check_status TEXT,
    safeguarding_training_date DATE,

    -- Preferences
    preferred_roles TEXT[] DEFAULT '{}',
    location_preference TEXT,
    remote_ok BOOLEAN DEFAULT TRUE,

    -- Emergency Contact
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relationship TEXT,

    notes TEXT,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_volunteered TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- VOLUNTEER_HOURS TABLE
-- Track volunteer hours
-- ============================================
CREATE TABLE volunteer_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    volunteer_id UUID REFERENCES volunteers(id) ON DELETE CASCADE NOT NULL,

    date DATE NOT NULL,
    hours DECIMAL(4, 2) NOT NULL,
    activity TEXT NOT NULL,
    event_id TEXT, -- Link to events calendar

    verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES auth.users(id),

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- IVOR_INTERACTIONS TABLE
-- Track IVOR AI conversations
-- ============================================
CREATE TABLE ivor_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

    -- IVOR Session Info
    ivor_session_id TEXT NOT NULL,
    ivor_user_id TEXT,
    platform TEXT, -- 'web', 'whatsapp', 'telegram', etc.

    -- Interaction Details
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    message_count INTEGER DEFAULT 0,

    -- Topics & Sentiment
    topics TEXT[] DEFAULT '{}',
    sentiment TEXT, -- 'positive', 'neutral', 'negative'
    satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),

    -- Outcomes
    resources_shared TEXT[] DEFAULT '{}',
    referrals_made TEXT[] DEFAULT '{}',
    crm_actions_triggered TEXT[] DEFAULT '{}', -- Any CRM actions triggered

    -- Raw Data (sanitized)
    summary TEXT,
    key_insights TEXT[] DEFAULT '{}',
    follow_up_needed BOOLEAN DEFAULT FALSE,
    follow_up_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EVENT_REGISTRATIONS TABLE
-- Link contacts to events
-- ============================================
CREATE TABLE event_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,

    -- Event Info (from Events Calendar)
    event_id TEXT NOT NULL, -- External event ID
    event_name TEXT NOT NULL,
    event_date DATE NOT NULL,
    event_type TEXT,

    -- Registration Details
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    registration_source TEXT, -- 'website', 'ivor', 'manual', etc.

    -- Attendance
    attended BOOLEAN,
    checked_in_at TIMESTAMPTZ,
    no_show BOOLEAN DEFAULT FALSE,

    -- Feedback
    feedback_rating INTEGER CHECK (feedback_rating BETWEEN 1 AND 5),
    feedback_text TEXT,

    -- Ticket Info
    ticket_type TEXT,
    ticket_price DECIMAL(8, 2),
    payment_status TEXT,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NEWSLETTER_SUBSCRIPTIONS TABLE
-- Email subscription management
-- ============================================
CREATE TABLE newsletter_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,

    email TEXT NOT NULL,

    -- Subscription Status
    is_subscribed BOOLEAN DEFAULT TRUE,
    subscribed_at TIMESTAMPTZ DEFAULT NOW(),
    unsubscribed_at TIMESTAMPTZ,

    -- Preferences
    lists TEXT[] DEFAULT '{"general"}', -- Which lists they're on
    frequency_preference TEXT DEFAULT 'weekly', -- 'daily', 'weekly', 'monthly'

    -- Engagement Metrics
    emails_sent INTEGER DEFAULT 0,
    emails_opened INTEGER DEFAULT 0,
    emails_clicked INTEGER DEFAULT 0,
    last_email_sent TIMESTAMPTZ,
    last_email_opened TIMESTAMPTZ,

    -- Source
    source TEXT,
    source_form TEXT,

    -- Compliance
    consent_method TEXT, -- 'double_opt_in', 'single_opt_in', 'imported'
    consent_date TIMESTAMPTZ,
    gdpr_consent BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TAGS TABLE
-- Flexible tagging system
-- ============================================
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#6B7280',
    category TEXT, -- 'org_type', 'policy_area', 'relationship', 'status', 'influence'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction tables for tags
CREATE TABLE contact_tags (
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    added_by UUID REFERENCES auth.users(id),
    PRIMARY KEY (contact_id, tag_id)
);

CREATE TABLE organization_tags (
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    added_by UUID REFERENCES auth.users(id),
    PRIMARY KEY (organization_id, tag_id)
);

-- ============================================
-- DOCUMENTS TABLE
-- Document management
-- ============================================
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Ownership
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    partnership_id UUID REFERENCES partnerships(id) ON DELETE SET NULL,
    grant_id UUID REFERENCES grant_pipeline(id) ON DELETE SET NULL,

    -- Document Info
    name TEXT NOT NULL,
    description TEXT,
    document_type TEXT, -- 'mou', 'application', 'report', 'letter', etc.

    -- Storage
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,

    -- Metadata
    version INTEGER DEFAULT 1,
    is_current_version BOOLEAN DEFAULT TRUE,

    -- Access
    is_confidential BOOLEAN DEFAULT FALSE,
    shared_with UUID[] DEFAULT '{}',

    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SEED DATA
-- ============================================

-- Default tags
INSERT INTO tags (name, color, category) VALUES
    -- Organization Types
    ('Grassroots', '#10B981', 'org_type'),
    ('Government', '#3B82F6', 'org_type'),
    ('International NGO', '#8B5CF6', 'org_type'),
    ('Funder', '#F59E0B', 'org_type'),
    ('Healthcare', '#EF4444', 'org_type'),
    ('Academic', '#6366F1', 'org_type'),
    ('Media', '#EC4899', 'org_type'),
    ('Corporate', '#64748B', 'org_type'),

    -- Policy Areas
    ('HIV/AIDS', '#DC2626', 'policy_area'),
    ('Mental Health', '#7C3AED', 'policy_area'),
    ('Sexual Health', '#EC4899', 'policy_area'),
    ('Racial Justice', '#F97316', 'policy_area'),
    ('LGBTQ+ Rights', '#E11D48', 'policy_area'),
    ('Immigration', '#0891B2', 'policy_area'),
    ('Housing', '#84CC16', 'policy_area'),
    ('Employment', '#06B6D4', 'policy_area'),
    ('Education', '#8B5CF6', 'policy_area'),

    -- Relationship Status
    ('Strategic Partner', '#22C55E', 'relationship'),
    ('Coalition Member', '#14B8A6', 'relationship'),
    ('Prospect', '#F59E0B', 'relationship'),
    ('High Priority', '#EF4444', 'status'),
    ('Needs Follow-up', '#3B82F6', 'status'),
    ('At Risk', '#DC2626', 'status'),

    -- Influence Levels
    ('Decision Maker', '#DC2626', 'influence'),
    ('Policy Lead', '#7C3AED', 'influence'),
    ('Champion', '#22C55E', 'influence'),
    ('Ally', '#14B8A6', 'influence');

-- ============================================
-- INDEXES
-- ============================================

-- Organizations
CREATE INDEX idx_orgs_type ON organizations(org_type);
CREATE INDEX idx_orgs_relationship ON organizations(relationship_type);
CREATE INDEX idx_orgs_funder ON organizations(is_funder) WHERE is_funder = TRUE;
CREATE INDEX idx_orgs_policy_areas ON organizations USING GIN(policy_areas);
CREATE INDEX idx_orgs_status ON organizations(relationship_status);

-- Contacts
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_type ON contacts USING GIN(contact_type);
CREATE INDEX idx_contacts_org ON contacts(organization_id);
CREATE INDEX idx_contacts_influence ON contacts(influence_level);
CREATE INDEX idx_contacts_status ON contacts(status);
CREATE INDEX idx_contacts_ivor ON contacts(ivor_user_id) WHERE ivor_user_id IS NOT NULL;

-- Grants
CREATE INDEX idx_grants_stage ON grant_pipeline(stage);
CREATE INDEX idx_grants_deadline ON grant_pipeline(deadline);
CREATE INDEX idx_grants_funder ON grant_pipeline(funder_id);
CREATE INDEX idx_grants_assigned ON grant_pipeline(assigned_to);

-- Activities
CREATE INDEX idx_activities_contact ON activities(contact_id);
CREATE INDEX idx_activities_org ON activities(organization_id);
CREATE INDEX idx_activities_date ON activities(occurred_at DESC);
CREATE INDEX idx_activities_type ON activities(activity_type);

-- Tasks
CREATE INDEX idx_tasks_due ON tasks(due_date);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);

-- IVOR Interactions
CREATE INDEX idx_ivor_contact ON ivor_interactions(contact_id);
CREATE INDEX idx_ivor_session ON ivor_interactions(ivor_session_id);
CREATE INDEX idx_ivor_date ON ivor_interactions(started_at DESC);

-- Event Registrations
CREATE INDEX idx_events_contact ON event_registrations(contact_id);
CREATE INDEX idx_events_event ON event_registrations(event_id);
CREATE INDEX idx_events_date ON event_registrations(event_date);

-- Volunteers
CREATE INDEX idx_volunteers_status ON volunteers(status);
CREATE INDEX idx_volunteers_skills ON volunteers USING GIN(skills);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE grant_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE ivor_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Service role full access policies
CREATE POLICY "service_role_all" ON organizations FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "service_role_all" ON contacts FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "service_role_all" ON partnerships FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "service_role_all" ON policy_engagements FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "service_role_all" ON grant_pipeline FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "service_role_all" ON activities FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "service_role_all" ON tasks FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "service_role_all" ON donations FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "service_role_all" ON volunteers FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "service_role_all" ON volunteer_hours FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "service_role_all" ON ivor_interactions FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "service_role_all" ON event_registrations FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "service_role_all" ON newsletter_subscriptions FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "service_role_all" ON tags FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "service_role_all" ON contact_tags FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "service_role_all" ON organization_tags FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "service_role_all" ON documents FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Authenticated users can read all CRM data
CREATE POLICY "authenticated_read" ON organizations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read" ON contacts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read" ON partnerships FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read" ON policy_engagements FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read" ON grant_pipeline FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read" ON activities FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read" ON tasks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read" ON donations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read" ON volunteers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read" ON volunteer_hours FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read" ON ivor_interactions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read" ON event_registrations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read" ON newsletter_subscriptions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read" ON tags FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read" ON contact_tags FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read" ON organization_tags FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read" ON documents FOR SELECT USING (auth.role() = 'authenticated');

-- Authenticated users can create/update most CRM data
CREATE POLICY "authenticated_insert" ON organizations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_update" ON organizations FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert" ON contacts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_update" ON contacts FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert" ON partnerships FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_update" ON partnerships FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert" ON policy_engagements FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_update" ON policy_engagements FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert" ON grant_pipeline FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_update" ON grant_pipeline FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert" ON activities FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert" ON tasks FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_update" ON tasks FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert" ON volunteers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_update" ON volunteers FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert" ON volunteer_hours FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert" ON event_registrations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_update" ON event_registrations FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert" ON contact_tags FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert" ON organization_tags FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert" ON documents FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER orgs_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER partnerships_updated_at BEFORE UPDATE ON partnerships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER grants_updated_at BEFORE UPDATE ON grant_pipeline
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER volunteers_updated_at BEFORE UPDATE ON volunteers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER newsletter_updated_at BEFORE UPDATE ON newsletter_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-update volunteer hours
CREATE OR REPLACE FUNCTION update_volunteer_hours()
RETURNS TRIGGER AS $$
BEGIN
    -- Update total hours
    UPDATE volunteers
    SET total_hours = (
        SELECT COALESCE(SUM(hours), 0)
        FROM volunteer_hours
        WHERE volunteer_id = NEW.volunteer_id
    ),
    hours_this_month = (
        SELECT COALESCE(SUM(hours), 0)
        FROM volunteer_hours
        WHERE volunteer_id = NEW.volunteer_id
        AND date >= date_trunc('month', CURRENT_DATE)
    ),
    hours_this_year = (
        SELECT COALESCE(SUM(hours), 0)
        FROM volunteer_hours
        WHERE volunteer_id = NEW.volunteer_id
        AND date >= date_trunc('year', CURRENT_DATE)
    ),
    last_volunteered = (
        SELECT MAX(date)
        FROM volunteer_hours
        WHERE volunteer_id = NEW.volunteer_id
    )
    WHERE id = NEW.volunteer_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER volunteer_hours_update AFTER INSERT OR UPDATE OR DELETE ON volunteer_hours
    FOR EACH ROW EXECUTE FUNCTION update_volunteer_hours();

-- Auto-log grant stage changes
CREATE OR REPLACE FUNCTION log_grant_stage_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.stage IS DISTINCT FROM NEW.stage THEN
        NEW.stage_entered_at = NOW();

        INSERT INTO activities (
            organization_id,
            grant_id,
            activity_type,
            subject,
            description,
            created_by
        ) VALUES (
            NEW.funder_id,
            NEW.id,
            'grant_update',
            'Grant stage changed: ' || OLD.stage || ' → ' || NEW.stage,
            'Grant "' || NEW.grant_name || '" moved from ' || OLD.stage || ' to ' || NEW.stage,
            NEW.assigned_to
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER grant_stage_change BEFORE UPDATE ON grant_pipeline
    FOR EACH ROW EXECUTE FUNCTION log_grant_stage_change();

-- Auto-update contact IVOR stats
CREATE OR REPLACE FUNCTION update_contact_ivor_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.contact_id IS NOT NULL THEN
        UPDATE contacts
        SET ivor_last_interaction = NEW.started_at,
            ivor_interaction_count = (
                SELECT COUNT(*)
                FROM ivor_interactions
                WHERE contact_id = NEW.contact_id
            ),
            ivor_topics = (
                SELECT ARRAY(
                    SELECT DISTINCT unnest(topics)
                    FROM ivor_interactions
                    WHERE contact_id = NEW.contact_id
                )
            )
        WHERE id = NEW.contact_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ivor_stats_update AFTER INSERT ON ivor_interactions
    FOR EACH ROW EXECUTE FUNCTION update_contact_ivor_stats();

-- ============================================
-- VIEWS
-- ============================================

-- Active grants view
CREATE OR REPLACE VIEW active_grants_view AS
SELECT
    gp.*,
    o.name AS funder_name,
    o.org_type AS funder_type,
    u.email AS assigned_to_email
FROM grant_pipeline gp
LEFT JOIN organizations o ON gp.funder_id = o.id
LEFT JOIN auth.users u ON gp.assigned_to = u.id
WHERE gp.stage NOT IN ('completed', 'rejected', 'withdrawn');

-- Contact engagement view
CREATE OR REPLACE VIEW contact_engagement_view AS
SELECT
    c.*,
    o.name AS organization_name,
    o.org_type AS organization_type,
    (SELECT COUNT(*) FROM activities WHERE contact_id = c.id) AS activity_count,
    (SELECT COUNT(*) FROM event_registrations WHERE contact_id = c.id AND attended = true) AS events_attended,
    (SELECT COALESCE(SUM(amount), 0) FROM donations WHERE contact_id = c.id AND status = 'completed') AS total_donated
FROM contacts c
LEFT JOIN organizations o ON c.organization_id = o.id;

-- Organization relationship summary
CREATE OR REPLACE VIEW org_relationship_summary AS
SELECT
    o.*,
    (SELECT COUNT(*) FROM contacts WHERE organization_id = o.id) AS contact_count,
    (SELECT COUNT(*) FROM partnerships WHERE organization_id = o.id AND is_active = true) AS active_partnerships,
    (SELECT COUNT(*) FROM policy_engagements WHERE organization_id = o.id) AS policy_engagement_count,
    (SELECT COALESCE(SUM(amount_awarded), 0) FROM grant_pipeline WHERE funder_id = o.id AND stage IN ('approved', 'active', 'completed')) AS total_funding_received,
    (SELECT MAX(occurred_at) FROM activities WHERE organization_id = o.id) AS last_activity
FROM organizations o;

-- ============================================
-- FUNCTIONS FOR API
-- ============================================

-- Search contacts by name or email
CREATE OR REPLACE FUNCTION search_contacts(search_term TEXT)
RETURNS SETOF contacts AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM contacts
    WHERE
        first_name ILIKE '%' || search_term || '%' OR
        last_name ILIKE '%' || search_term || '%' OR
        email ILIKE '%' || search_term || '%' OR
        preferred_name ILIKE '%' || search_term || '%'
    ORDER BY last_name, first_name;
END;
$$ LANGUAGE plpgsql;

-- Get dashboard metrics
CREATE OR REPLACE FUNCTION get_dashboard_metrics()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_contacts', (SELECT COUNT(*) FROM contacts WHERE status = 'active'),
        'community_members', (SELECT COUNT(*) FROM contacts WHERE 'community_member' = ANY(contact_type)),
        'organizations', (SELECT COUNT(*) FROM organizations WHERE relationship_status = 'active'),
        'active_grants', (SELECT COUNT(*) FROM grant_pipeline WHERE stage IN ('submitted', 'under_review', 'interview', 'decision_pending', 'active')),
        'pipeline_value', (SELECT COALESCE(SUM(amount_requested), 0) FROM grant_pipeline WHERE stage IN ('submitted', 'under_review', 'interview', 'decision_pending')),
        'funds_secured', (SELECT COALESCE(SUM(amount_awarded), 0) FROM grant_pipeline WHERE stage IN ('approved', 'active', 'reporting', 'completed')),
        'pending_tasks', (SELECT COUNT(*) FROM tasks WHERE status = 'pending' AND due_date >= CURRENT_DATE),
        'overdue_tasks', (SELECT COUNT(*) FROM tasks WHERE status = 'pending' AND due_date < CURRENT_DATE)
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Get upcoming deadlines
CREATE OR REPLACE FUNCTION get_upcoming_deadlines(days_ahead INTEGER DEFAULT 30)
RETURNS TABLE(
    id UUID,
    deadline_type TEXT,
    title TEXT,
    due_date DATE,
    related_org TEXT,
    priority TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- Grant deadlines
    SELECT
        gp.id,
        'grant' AS deadline_type,
        gp.grant_name AS title,
        gp.deadline AS due_date,
        o.name AS related_org,
        CASE
            WHEN gp.deadline <= CURRENT_DATE + INTERVAL '7 days' THEN 'urgent'
            WHEN gp.deadline <= CURRENT_DATE + INTERVAL '14 days' THEN 'high'
            ELSE 'medium'
        END AS priority
    FROM grant_pipeline gp
    LEFT JOIN organizations o ON gp.funder_id = o.id
    WHERE gp.deadline IS NOT NULL
        AND gp.deadline <= CURRENT_DATE + (days_ahead || ' days')::INTERVAL
        AND gp.stage NOT IN ('completed', 'rejected', 'withdrawn')

    UNION ALL

    -- Report deadlines
    SELECT
        gp.id,
        'report' AS deadline_type,
        'Report: ' || gp.grant_name AS title,
        gp.next_report_due AS due_date,
        o.name AS related_org,
        CASE
            WHEN gp.next_report_due <= CURRENT_DATE + INTERVAL '7 days' THEN 'urgent'
            WHEN gp.next_report_due <= CURRENT_DATE + INTERVAL '14 days' THEN 'high'
            ELSE 'medium'
        END AS priority
    FROM grant_pipeline gp
    LEFT JOIN organizations o ON gp.funder_id = o.id
    WHERE gp.next_report_due IS NOT NULL
        AND gp.next_report_due <= CURRENT_DATE + (days_ahead || ' days')::INTERVAL

    UNION ALL

    -- Partnership renewals
    SELECT
        p.id,
        'renewal' AS deadline_type,
        'Renew: ' || p.name AS title,
        p.renewal_date AS due_date,
        o.name AS related_org,
        CASE
            WHEN p.renewal_date <= CURRENT_DATE + INTERVAL '14 days' THEN 'high'
            ELSE 'medium'
        END AS priority
    FROM partnerships p
    LEFT JOIN organizations o ON p.organization_id = o.id
    WHERE p.renewal_date IS NOT NULL
        AND p.renewal_date <= CURRENT_DATE + (days_ahead || ' days')::INTERVAL
        AND p.is_active = true

    ORDER BY due_date ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- GRANT PIPELINE STATS
-- ============================================
CREATE OR REPLACE FUNCTION get_grant_pipeline_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'by_stage', (
            SELECT json_object_agg(stage, cnt)
            FROM (
                SELECT stage, COUNT(*) as cnt
                FROM grant_pipeline
                WHERE stage NOT IN ('completed', 'rejected', 'withdrawn')
                GROUP BY stage
            ) s
        ),
        'pipeline_value', (
            SELECT COALESCE(SUM(amount_requested), 0)
            FROM grant_pipeline
            WHERE stage IN ('submitted', 'under_review', 'interview', 'decision_pending')
        ),
        'weighted_pipeline', (
            SELECT COALESCE(SUM(amount_requested * probability / 100), 0)
            FROM grant_pipeline
            WHERE stage IN ('submitted', 'under_review', 'interview', 'decision_pending')
            AND probability IS NOT NULL
        ),
        'pending_count', (
            SELECT COUNT(*)
            FROM grant_pipeline
            WHERE stage IN ('submitted', 'under_review', 'interview', 'decision_pending')
        ),
        'this_year_secured', (
            SELECT COALESCE(SUM(amount_awarded), 0)
            FROM grant_pipeline
            WHERE stage IN ('approved', 'active', 'reporting', 'completed')
            AND decision_received >= date_trunc('year', CURRENT_DATE)
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- END OF MIGRATION
-- ============================================
