-- scripts taken from pgAdmin create script 
CREATE TABLE IF NOT EXISTS public.company_profiles
(
    user_id uuid NOT NULL,
    legal_first_name character varying(255) COLLATE pg_catalog."default",
    legal_last_name character varying(255) COLLATE pg_catalog."default",
    preferred_name character varying(255) COLLATE pg_catalog."default",
    bio text COLLATE pg_catalog."default",
    residency character varying(255) COLLATE pg_catalog."default",
    experience text COLLATE pg_catalog."default",
    location character varying(255) COLLATE pg_catalog."default",
    industry_interests text COLLATE pg_catalog."default",
    highest_education character varying(255) COLLATE pg_catalog."default",
    created_at timestamp without time zone DEFAULT now(),
    company_pin character varying(50) COLLATE pg_catalog."default",
    CONSTRAINT company_profiles_pkey PRIMARY KEY (user_id),
    CONSTRAINT company_profiles_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)