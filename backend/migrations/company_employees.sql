-- scripts taken from pgAdmin create script
CREATE TABLE IF NOT EXISTS public.company_employees
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid,
    name character varying(255) COLLATE pg_catalog."default" NOT NULL,
    role character varying(255) COLLATE pg_catalog."default",
    work_type character varying(255) COLLATE pg_catalog."default",
    location character varying(255) COLLATE pg_catalog."default",
    photo_key character varying(500) COLLATE pg_catalog."default",
    slot integer,
    created_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone,
    is_deleted boolean NOT NULL DEFAULT false,
    CONSTRAINT company_employees_pkey PRIMARY KEY (id),
    CONSTRAINT unique_employee_slot UNIQUE (company_id, slot),
    CONSTRAINT company_employees_company_id_fkey FOREIGN KEY (company_id)
        REFERENCES public.company_profiles (user_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);