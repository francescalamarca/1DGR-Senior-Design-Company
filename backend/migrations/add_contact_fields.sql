ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS email character varying(255),
  ADD COLUMN IF NOT EXISTS phone_number character varying(50),
  ADD COLUMN IF NOT EXISTS contact_url_1 character varying(500),
  ADD COLUMN IF NOT EXISTS contact_url_2 character varying(500),
  ADD COLUMN IF NOT EXISTS contact_url_1_label character varying(100),
  ADD COLUMN IF NOT EXISTS contact_url_2_label character varying(100),
  ADD COLUMN IF NOT EXISTS contact_display_settings jsonb DEFAULT '{"showEmail":false,"showPhoneNumber":false,"showUrl1":false,"showUrl2":false}';
