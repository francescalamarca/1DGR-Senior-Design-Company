CREATE TABLE IF NOT EXISTS public.company_profiles
(
    user_id uuid NOT NULL,
    company_name character varying(255),
    industry character varying(255),
    business_age character varying(255),
    work_type character varying(255),
    locations jsonb DEFAULT '[]',
    mission_statement text,
    core_values jsonb DEFAULT '[]',
    benefits_summary text,
    company_culture text,
    custom_background_color character varying(50),
    logo_image_key character varying(500),
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT company_profiles_pkey PRIMARY KEY (user_id),
    CONSTRAINT company_profiles_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);