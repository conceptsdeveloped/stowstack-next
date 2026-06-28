-- Customer dashboard backend tables (M4/M5).
-- Additive + idempotent: safe to run against prod. No data-loss operations.
-- Apply with (Blake, from a shell that has DATABASE_URL):
--   npx prisma db execute --file prisma/manual/2026-06-28-customer-dashboard-tables.sql --schema prisma/schema.prisma
-- Then redeploy so the generated client matches (build already runs prisma generate).

-- ── M4: durable two-way messaging ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  sender     text NOT NULL,            -- 'client' | 'admin'
  body       text NOT NULL,
  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_messages_client ON client_messages(client_id);
CREATE INDEX IF NOT EXISTS idx_client_messages_thread ON client_messages(client_id, created_at);

-- ── M5: invoices as a single system of record ──────────────────────────────
CREATE TABLE IF NOT EXISTS client_invoices (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount            numeric(12,2) NOT NULL,
  ad_spend          numeric(12,2),
  fee               numeric(12,2),
  status            text NOT NULL DEFAULT 'draft',  -- draft | sent | paid | overdue | void
  period            text,                           -- billing-period label, e.g. 'June 2026'
  description       text,
  stripe_invoice_id text,
  issued_at         timestamptz NOT NULL DEFAULT now(),
  due_at            timestamptz,
  paid_at           timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_invoices_client ON client_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_client_invoices_status ON client_invoices(status);

-- NOTE: client_goals (M1) is owned by the client-goals feature and applied
-- separately — intentionally not created here.
