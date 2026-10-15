-- ==============================================================================
-- NFC SMART STAND (GOOGLE REVIEW & TABLE HUB) DATABASE SCHEMA
-- Versi Lengkap: Master Tags, RLS, Storage Bucket 'nfc', dan RPC Stored Procedures
-- ==============================================================================

-- 1. Ekstensi Kriptografi & UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tipe Enum Produk
DO $$ BEGIN
    CREATE TYPE product_type AS ENUM ('DIRECT_REVIEW', 'TABLE_HUB');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Tabel Master NFC Tags
CREATE TABLE IF NOT EXISTS public.nfc_tags (
    id VARCHAR(32) PRIMARY KEY, -- Format: TAG-XXXXX atau kode custom
    type product_type NOT NULL DEFAULT 'TABLE_HUB',
    business_name VARCHAR(255),
    google_place_id VARCHAR(255),
    pin_hash VARCHAR(255), -- Bcrypt hash via crypt()
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    total_taps BIGINT NOT NULL DEFAULT 0,
    hub_config JSONB DEFAULT '{
        "tagline": "Great choice, awkward chat",
        "bio": "",
        "avatar_url": "",
        "cover_url": "",
        "menu_url": "",
        "wifi_ssid": "",
        "wifi_pass": "",
        "instagram": "",
        "youtube": "",
        "tiktok": "",
        "whatsapp": "",
        "custom_links": [],
        "feedbacks": []
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index Pencarian Cepat
CREATE INDEX IF NOT EXISTS idx_nfc_tags_active ON public.nfc_tags(id) WHERE is_active = TRUE;

-- 4. Setup Row Level Security (RLS) pada nfc_tags
ALTER TABLE public.nfc_tags ENABLE ROW LEVEL SECURITY;

-- Izinkan publik membaca data tag (untuk portal tamu dan admin)
DROP POLICY IF EXISTS "Public read tags" ON public.nfc_tags;
CREATE POLICY "Public read tags" ON public.nfc_tags
    FOR SELECT
    USING (true);

-- Izinkan pembuatan tag baru dari dashboard admin
DROP POLICY IF EXISTS "Allow anon insert new tag" ON public.nfc_tags;
CREATE POLICY "Allow anon insert new tag" ON public.nfc_tags
    FOR INSERT
    WITH CHECK (true);

-- Izinkan pembaruan tag (masukan feedback tamu & tap counter)
DROP POLICY IF EXISTS "Allow anon update tags" ON public.nfc_tags;
CREATE POLICY "Allow anon update tags" ON public.nfc_tags
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Izinkan penghapusan tag dari dashboard admin jika diperlukan
DROP POLICY IF EXISTS "Allow anon delete tags" ON public.nfc_tags;
CREATE POLICY "Allow anon delete tags" ON public.nfc_tags
    FOR DELETE
    USING (true);

-- 5. Setup Storage Bucket 'nfc' & Storage RLS Policies
-- Membuat bucket 'nfc' otomatis berstatus PUBLIC untuk gambar (WebP) dan berkas PDF Menu
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'nfc', 
    'nfc', 
    true, 
    26214400, -- 25 MB limit
    ARRAY['image/webp', 'image/png', 'image/jpeg', 'image/svg+xml', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 26214400,
    allowed_mime_types = ARRAY['image/webp', 'image/png', 'image/jpeg', 'image/svg+xml', 'application/pdf'];

-- Policy Baca Public Storage
DROP POLICY IF EXISTS "Public Read NFC Storage" ON storage.objects;
CREATE POLICY "Public Read NFC Storage" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'nfc');

-- Policy Upload Public Storage (Foto Profil, Banner WebP, Berkas PDF Menu)
DROP POLICY IF EXISTS "Public Upload NFC Storage" ON storage.objects;
CREATE POLICY "Public Upload NFC Storage" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'nfc');

-- Policy Update Public Storage
DROP POLICY IF EXISTS "Public Update NFC Storage" ON storage.objects;
CREATE POLICY "Public Update NFC Storage" ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'nfc')
    WITH CHECK (bucket_id = 'nfc');

-- Policy Delete Public Storage (Hapus file usang)
DROP POLICY IF EXISTS "Public Delete NFC Storage" ON storage.objects;
CREATE POLICY "Public Delete NFC Storage" ON storage.objects
    FOR DELETE
    USING (bucket_id = 'nfc');

-- 6. Stored Procedures (RPC)

-- A. Counter Tap Instan Pengunjung
CREATE OR REPLACE FUNCTION record_tag_tap(p_tag_id VARCHAR(32))
RETURNS VOID AS $$
BEGIN
    UPDATE public.nfc_tags
    SET total_taps = total_taps + 1
    WHERE id = p_tag_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- B. Aktivasi Mandiri Tag Baru (Bcrypt Salt 8)
CREATE OR REPLACE FUNCTION activate_nfc_tag(
    p_tag_id VARCHAR(32),
    p_type product_type,
    p_business_name VARCHAR(255),
    p_place_id VARCHAR(255),
    p_pin VARCHAR(32)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_active BOOLEAN;
BEGIN
    SELECT is_active INTO v_is_active FROM public.nfc_tags WHERE id = p_tag_id;
    
    IF v_is_active IS NULL OR v_is_active = TRUE THEN
        RETURN FALSE;
    END IF;

    UPDATE public.nfc_tags
    SET type = p_type,
        business_name = p_business_name,
        google_place_id = p_place_id,
        pin_hash = crypt(p_pin, gen_salt('bf', 8)),
        is_active = TRUE,
        updated_at = NOW()
    WHERE id = p_tag_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- C. Verifikasi PIN Login CMS Meja
CREATE OR REPLACE FUNCTION verify_tag_pin(
    p_tag_id VARCHAR(32),
    p_pin VARCHAR(32)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_pin_hash VARCHAR(255);
BEGIN
    SELECT pin_hash INTO v_pin_hash FROM public.nfc_tags WHERE id = p_tag_id;
    
    IF v_pin_hash IS NOT NULL AND v_pin_hash = crypt(p_pin, v_pin_hash) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- D. Update Konfigurasi CMS Merchant (Aman dengan Verifikasi PIN)
CREATE OR REPLACE FUNCTION update_tag_config(
    p_tag_id VARCHAR(32),
    p_pin VARCHAR(32),
    p_hub_config JSONB,
    p_type product_type DEFAULT NULL,
    p_business_name VARCHAR(255) DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_pin_hash VARCHAR(255);
BEGIN
    SELECT pin_hash INTO v_pin_hash FROM public.nfc_tags WHERE id = p_tag_id;
    
    IF v_pin_hash IS NULL OR v_pin_hash != crypt(p_pin, v_pin_hash) THEN
        RETURN FALSE;
    END IF;

    UPDATE public.nfc_tags
    SET hub_config = p_hub_config,
        type = COALESCE(p_type, type),
        business_name = COALESCE(p_business_name, business_name),
        updated_at = NOW()
    WHERE id = p_tag_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 6. REALTIME REPLICATION (Untuk Live Chat Meja & Admin)
-- =========================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.nfc_tags;
ALTER TABLE public.nfc_tags REPLICA IDENTITY FULL;
