-- scripts taken from pgAdmin create script 
CREATE TABLE IF NOT EXISTS public.company_videos
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid,
    title character varying(255) COLLATE pg_catalog."default" NOT NULL,
    description text COLLATE pg_catalog."default",
    s3_key character varying(500) COLLATE pg_catalog."default" NOT NULL,
    thumbnail_url text COLLATE pg_catalog."default",
    created_at timestamp without time zone DEFAULT now(),
    thumbnail_key text COLLATE pg_catalog."default",
    slot integer,
    deleted_at timestamp without time zone,
    expires_at timestamp without time zone,
    is_deleted boolean NOT NULL DEFAULT false,
    CONSTRAINT company_videos_pkey PRIMARY KEY (id),
    CONSTRAINT unique_user_slot UNIQUE (company_id, slot),
    CONSTRAINT company_videos_company_id_fkey FOREIGN KEY (company_id)
        REFERENCES public.company_profiles (user_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);