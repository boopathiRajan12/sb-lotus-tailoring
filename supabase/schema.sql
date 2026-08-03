-- ============================================================================
-- SB LOTUS TAILORING SHOP - Supabase (PostgreSQL) schema
--
-- Run this once in the Supabase SQL Editor:
--   Dashboard -> SQL Editor -> New query -> paste -> Run
--
-- It is optional: the Flask app calls db.create_all() at startup and will
-- build the same tables. Running it by hand is the better option when you want
-- the schema (and especially the RLS lockdown at the bottom) in place before
-- the app ever connects. Every statement is idempotent - re-running is safe.
--
-- This file mirrors models/*.py exactly. If you change a model, change it here.
-- ============================================================================

-- ── Users (customers and admins) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
    id                SERIAL PRIMARY KEY,
    username          VARCHAR(80)  NOT NULL UNIQUE,
    email             VARCHAR(120) NOT NULL UNIQUE,
    password_hash     VARCHAR(256) NOT NULL,
    phone             VARCHAR(15),
    address           TEXT,
    is_admin          BOOLEAN NOT NULL DEFAULT FALSE,
    -- Admins can suspend an account without deleting its order history.
    is_active_account BOOLEAN NOT NULL DEFAULT TRUE,
    -- Saved default body measurements, stored as a JSON object.
    measurements      TEXT,
    created_at        TIMESTAMP
);

-- ── Categories ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL UNIQUE,
    description   TEXT,
    -- 'stitching' for services, 'readymade' for stocked goods
    category_type VARCHAR(20) NOT NULL DEFAULT 'stitching',
    created_at    TIMESTAMP
);

-- ── Products ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
    id                SERIAL PRIMARY KEY,
    name              VARCHAR(200) NOT NULL,
    description       TEXT,
    price             DOUBLE PRECISION NOT NULL,
    category_id       INTEGER NOT NULL REFERENCES public.categories (id),
    is_custom_blouse  BOOLEAN DEFAULT FALSE,
    -- 0 = made to order (a stitching service), always orderable
    stock             INTEGER DEFAULT 0,
    -- Optional strike-through "was" price used to show a discount
    compare_at_price  DOUBLE PRECISION,
    is_featured       BOOLEAN NOT NULL DEFAULT FALSE,
    is_active         BOOLEAN DEFAULT TRUE,
    -- Denormalised review aggregates, refreshed by Product.refresh_rating()
    rating_count      INTEGER NOT NULL DEFAULT 0,
    rating_avg        DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at        TIMESTAMP,
    updated_at        TIMESTAMP
);

-- ── Product images ──────────────────────────────────────────────────────────
-- image_data holds the bytes so images survive on hosts with an ephemeral
-- filesystem; image_path is the on-disk mirror used in local development.
CREATE TABLE IF NOT EXISTS public.product_images (
    id             SERIAL PRIMARY KEY,
    product_id     INTEGER NOT NULL REFERENCES public.products (id),
    image_path     VARCHAR(300) NOT NULL,
    is_primary     BOOLEAN DEFAULT FALSE,
    uploaded_at    TIMESTAMP,
    image_data     BYTEA,
    image_mimetype VARCHAR(50)
);

-- ── Cart ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cart_items (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER NOT NULL REFERENCES public.users (id),
    product_id   INTEGER NOT NULL REFERENCES public.products (id),
    quantity     INTEGER NOT NULL DEFAULT 1,
    -- Per-line measurements for custom blouse orders (JSON object)
    measurements TEXT,
    added_at     TIMESTAMP
);

-- ── Orders ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER NOT NULL REFERENCES public.users (id),
    total_amount     DOUBLE PRECISION NOT NULL,
    status           VARCHAR(30) NOT NULL DEFAULT 'pending',
    shipping_address TEXT,
    phone            VARCHAR(15),
    notes            TEXT,
    cancel_reason    TEXT,
    created_at       TIMESTAMP,
    updated_at       TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.order_items (
    id           SERIAL PRIMARY KEY,
    order_id     INTEGER NOT NULL REFERENCES public.orders (id),
    product_id   INTEGER NOT NULL REFERENCES public.products (id),
    quantity     INTEGER NOT NULL,
    price        DOUBLE PRECISION NOT NULL,  -- price at the time of order
    measurements TEXT
);

-- Append-only audit trail, shown to the customer as a delivery timeline.
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id         SERIAL PRIMARY KEY,
    order_id   INTEGER NOT NULL REFERENCES public.orders (id),
    status     VARCHAR(30) NOT NULL,
    note       TEXT,
    created_at TIMESTAMP
);

-- ── Wishlist ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wishlist_items (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES public.users (id),
    product_id INTEGER NOT NULL REFERENCES public.products (id),
    added_at   TIMESTAMP,
    CONSTRAINT uq_wishlist_user_product UNIQUE (user_id, product_id)
);

-- ── Reviews ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES public.users (id),
    product_id  INTEGER NOT NULL REFERENCES public.products (id),
    rating      INTEGER NOT NULL,  -- 1-5, validated in routes/review.py
    title       VARCHAR(150),
    comment     TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP,
    updated_at  TIMESTAMP,
    CONSTRAINT uq_review_user_product UNIQUE (user_id, product_id)
);

-- ── Indexes ─────────────────────────────────────────────────────────────────
-- Postgres does not index foreign keys automatically, and every listing page
-- filters on one of these.
CREATE INDEX IF NOT EXISTS idx_products_category      ON public.products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_active        ON public.products (is_active);
CREATE INDEX IF NOT EXISTS idx_products_custom_blouse ON public.products (is_custom_blouse);
CREATE INDEX IF NOT EXISTS idx_products_featured      ON public.products (is_featured);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images (product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_user        ON public.cart_items (user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product     ON public.cart_items (product_id);
CREATE INDEX IF NOT EXISTS idx_orders_user            ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status          ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created         ON public.orders (created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order      ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product    ON public.order_items (product_id);
CREATE INDEX IF NOT EXISTS idx_order_history_order    ON public.order_status_history (order_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user          ON public.wishlist_items (user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_product       ON public.wishlist_items (product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product        ON public.reviews (product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user           ON public.reviews (user_id);

-- ============================================================================
-- SECURITY - read this before deciding to skip it
--
-- Supabase exposes every table in `public` over PostgREST at
-- https://<ref>.supabase.co/rest/v1/, and the anon API key is public by
-- definition (it ships in browser bundles). Without the lockdown below,
-- anyone who learns the project ref can read `users`, `orders` and every
-- customer's address and phone number, and write to them too.
--
-- This app does NOT use PostgREST or Supabase Auth. It connects straight to
-- Postgres as the owner role, which bypasses RLS, so locking the anon and
-- authenticated roles out costs the application nothing.
-- ============================================================================

ALTER TABLE public.users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews              ENABLE ROW LEVEL SECURITY;

-- No policies are defined, so RLS denies everything to the API roles. Belt and
-- braces: drop their table grants too, including on tables the app creates
-- later via db.create_all().
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
        REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
        REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public
            REVOKE ALL ON TABLES FROM anon, authenticated;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public
            REVOKE ALL ON SEQUENCES FROM anon, authenticated;
    END IF;
END
$$;
