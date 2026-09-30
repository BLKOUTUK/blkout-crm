-- ============================================
-- Financial Transactions RLS Policies
-- Allows authenticated + anon users to insert/update transactions
-- (CRM uses anon key via browser client)
-- ============================================

-- SELECT already exists: "Public can view transactions" (true for all)

CREATE POLICY "Authenticated can insert transactions"
  ON financial_transactions
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update transactions"
  ON financial_transactions
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can insert transactions"
  ON financial_transactions
  FOR INSERT TO anon
  WITH CHECK (true);
