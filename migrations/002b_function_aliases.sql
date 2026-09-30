-- ============================================
-- CRM Function Aliases
-- The migration 001 created functions with crm_ prefix,
-- but the CRM app hooks call them without prefix.
-- These aliases bridge the gap.
-- ============================================

-- Alias: get_dashboard_metrics → crm_get_dashboard_metrics
CREATE OR REPLACE FUNCTION get_dashboard_metrics()
RETURNS json AS $$
BEGIN
  RETURN crm_get_dashboard_metrics();
END;
$$ LANGUAGE plpgsql;

-- Alias: get_grant_pipeline_stats → crm_get_grant_pipeline_stats
CREATE OR REPLACE FUNCTION get_grant_pipeline_stats()
RETURNS json AS $$
BEGIN
  RETURN crm_get_grant_pipeline_stats();
END;
$$ LANGUAGE plpgsql;

-- Alias: search_contacts → crm_search_contacts
CREATE OR REPLACE FUNCTION search_contacts(search_term text)
RETURNS SETOF contacts AS $$
BEGIN
  RETURN QUERY SELECT * FROM crm_search_contacts(search_term);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Missing function: get_upcoming_deadlines
-- Used by use-dashboard.ts hook
-- Queries grant_pipeline + partnerships for upcoming dates
-- ============================================
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
        'grant'::TEXT AS deadline_type,
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
        'report'::TEXT AS deadline_type,
        ('Report: ' || gp.grant_name)::TEXT AS title,
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
        'renewal'::TEXT AS deadline_type,
        ('Renew: ' || p.name)::TEXT AS title,
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
-- Missing function: increment_ivor_interactions
-- Used by use-ivor.ts hook to update contact interaction count
-- ============================================
CREATE OR REPLACE FUNCTION increment_ivor_interactions(p_contact_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE contacts
    SET
        ivor_interaction_count = COALESCE(ivor_interaction_count, 0) + 1,
        ivor_last_interaction = NOW(),
        updated_at = NOW()
    WHERE id = p_contact_id;
END;
$$ LANGUAGE plpgsql;
