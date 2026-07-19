-- ============================================================================
-- RECONCILE — Supabase Initial Schema Migration
-- ============================================================================
-- This migration creates the complete production schema for the Reconcile
-- invoice verification platform. All tables reference auth.users(id) and
-- have Row Level Security (RLS) enabled with per-user policies.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. VENDORS
-- ============================================================================
CREATE TABLE public.vendors (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  tax_id        TEXT,
  email         TEXT,
  phone         TEXT,
  address       TEXT,
  payment_terms TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vendors_user         ON public.vendors (user_id);
CREATE INDEX idx_vendors_user_name    ON public.vendors (user_id, name);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vendors"
  ON public.vendors FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own vendors"
  ON public.vendors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vendors"
  ON public.vendors FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own vendors"
  ON public.vendors FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 2. PURCHASE ORDERS
-- ============================================================================
CREATE TABLE public.purchase_orders (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  po_number     TEXT NOT NULL,
  vendor_id     BIGINT REFERENCES public.vendors(id) ON DELETE SET NULL,
  vendor_name   TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'partially_received', 'closed', 'cancelled')),
  currency      TEXT NOT NULL DEFAULT 'USD',
  order_date    TIMESTAMPTZ NOT NULL DEFAULT now(),
  subtotal      NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax           NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  total_amount  NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, po_number)
);

CREATE INDEX idx_po_user          ON public.purchase_orders (user_id);
CREATE INDEX idx_po_user_number   ON public.purchase_orders (user_id, po_number);
CREATE INDEX idx_po_user_status   ON public.purchase_orders (user_id, status);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own POs"
  ON public.purchase_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own POs"
  ON public.purchase_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own POs"
  ON public.purchase_orders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own POs"
  ON public.purchase_orders FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 3. PURCHASE ORDER ITEMS
-- ============================================================================
CREATE TABLE public.purchase_order_items (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  po_id         BIGINT NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  description   TEXT NOT NULL,
  sku           TEXT,
  quantity      NUMERIC(14, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price    NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  line_total    NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (line_total >= 0)
);

CREATE INDEX idx_po_items_po ON public.purchase_order_items (po_id);

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own PO items"
  ON public.purchase_order_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own PO items"
  ON public.purchase_order_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own PO items"
  ON public.purchase_order_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own PO items"
  ON public.purchase_order_items FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. INVOICES
-- ============================================================================
CREATE TABLE public.invoices (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- File metadata
  file_name         TEXT NOT NULL,
  file_url          TEXT NOT NULL,
  file_pathname     TEXT,
  file_type         TEXT,

  -- Pipeline status
  status            TEXT NOT NULL DEFAULT 'uploaded'
                      CHECK (status IN ('uploaded', 'processing', 'extracted', 'matched', 'validated', 'failed')),

  -- Extracted data (from OCR + LLM)
  ocr_text          TEXT,
  extracted         JSONB,
  invoice_number    TEXT,
  vendor_name       TEXT,
  invoice_date      TEXT,
  po_number_raw     TEXT,
  currency          TEXT,
  subtotal          NUMERIC(14, 2),
  tax               NUMERIC(14, 2),
  total_amount      NUMERIC(14, 2),

  -- Matching results
  matched_vendor_id BIGINT REFERENCES public.vendors(id) ON DELETE SET NULL,
  matched_po_id     BIGINT REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  match_confidence  NUMERIC(5, 4),

  -- Decision
  decision          TEXT CHECK (decision IS NULL OR decision IN ('approve', 'review', 'reject')),
  validation_score  NUMERIC(5, 4),
  error_message     TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_user          ON public.invoices (user_id);
CREATE INDEX idx_invoices_user_status   ON public.invoices (user_id, status);
CREATE INDEX idx_invoices_user_decision ON public.invoices (user_id, decision);
CREATE INDEX idx_invoices_user_number   ON public.invoices (user_id, invoice_number);
CREATE INDEX idx_invoices_user_created  ON public.invoices (user_id, created_at DESC);
CREATE INDEX idx_invoices_user_vendor   ON public.invoices (user_id, vendor_name);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoices"
  ON public.invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices"
  ON public.invoices FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices"
  ON public.invoices FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 5. INVOICE ITEMS
-- ============================================================================
CREATE TABLE public.invoice_items (
  id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id         BIGINT NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description        TEXT NOT NULL,
  sku                TEXT,
  quantity           NUMERIC(14, 2) NOT NULL DEFAULT 1,
  unit_price         NUMERIC(14, 2) NOT NULL DEFAULT 0,
  line_total         NUMERIC(14, 2) NOT NULL DEFAULT 0,
  matched_po_item_id BIGINT REFERENCES public.purchase_order_items(id) ON DELETE SET NULL,
  match_score        NUMERIC(5, 4)
);

CREATE INDEX idx_invoice_items_invoice ON public.invoice_items (invoice_id);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoice items"
  ON public.invoice_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own invoice items"
  ON public.invoice_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoice items"
  ON public.invoice_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoice items"
  ON public.invoice_items FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 6. VALIDATION REPORTS
-- ============================================================================
CREATE TABLE public.validation_reports (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id  BIGINT NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  decision    TEXT NOT NULL CHECK (decision IN ('approve', 'review', 'reject')),
  score       NUMERIC(5, 4) NOT NULL DEFAULT 0,
  checks      JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_invoice ON public.validation_reports (invoice_id);
CREATE INDEX idx_reports_user    ON public.validation_reports (user_id);

ALTER TABLE public.validation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports"
  ON public.validation_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own reports"
  ON public.validation_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reports"
  ON public.validation_reports FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reports"
  ON public.validation_reports FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 7. AUDIT LOGS
-- ============================================================================
CREATE TABLE public.audit_logs (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id  BIGINT REFERENCES public.invoices(id) ON DELETE SET NULL,
  step        TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('started', 'success', 'failed')),
  message     TEXT,
  data        JSONB,
  duration_ms INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_user_created  ON public.audit_logs (user_id, created_at DESC);
CREATE INDEX idx_audit_user_invoice  ON public.audit_logs (user_id, invoice_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit logs"
  ON public.audit_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Audit logs are immutable — no update/delete policies.

-- ============================================================================
-- 8. USER SETTINGS
-- ============================================================================
CREATE TABLE public.user_settings (
  id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  amount_tolerance_pct    NUMERIC(5, 4) NOT NULL DEFAULT 0.02,
  price_tolerance_pct     NUMERIC(5, 4) NOT NULL DEFAULT 0.05,
  auto_approve_threshold  NUMERIC(5, 4) NOT NULL DEFAULT 0.95,
  notifications_enabled   BOOLEAN NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own settings"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 9. INVOICE REVIEWS (Human review workflow)
-- ============================================================================
CREATE TABLE public.invoice_reviews (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id  BIGINT NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  action      TEXT NOT NULL CHECK (action IN ('approve', 'reject', 'comment')),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reviews_invoice ON public.invoice_reviews (invoice_id);
CREATE INDEX idx_reviews_user    ON public.invoice_reviews (user_id);

ALTER TABLE public.invoice_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reviews"
  ON public.invoice_reviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own reviews"
  ON public.invoice_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 10. TRIGGERS
-- ============================================================================

-- Auto-update updated_at on invoices
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- 11. STORAGE BUCKET
-- ============================================================================
-- Create the invoices storage bucket (private by default)
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users can only access files under their own user_id prefix
CREATE POLICY "Users can upload own invoices"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'invoices'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own invoices"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'invoices'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own invoices"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'invoices'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
