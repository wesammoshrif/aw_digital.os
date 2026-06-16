-- Custom SQL migration file, put your code below! --

-- ── Helper: is_admin() liest den app_role-Claim, den der RLS-Wrapper setzt ──
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
  LANGUAGE sql STABLE
  SET search_path = ''
AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'app_role',
    ''
  ) = 'admin';
$$;
--> statement-breakpoint

-- ── Schutz gegen Rechte-Eskalation: Nicht-Admins können role/approved nicht ändern ──
CREATE OR REPLACE FUNCTION public.guard_profile_privesc() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    NEW.role := OLD.role;
    NEW.approved := OLD.approved;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS profiles_no_privesc ON public.profiles;
--> statement-breakpoint
CREATE TRIGGER profiles_no_privesc BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privesc();
--> statement-breakpoint

-- ── RLS auf allen owner_id-Tabellen: Agent nur eigene, Admin alle ──
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'leads','activities','calls','appointments','audits',
    'trigger_events','projects','tasks','invoices','scrape_runs','settings'
  ]
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_sel', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_ins', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_upd', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_del', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.is_admin())', t || '_sel', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() OR public.is_admin())', t || '_ins', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.is_admin()) WITH CHECK (owner_id = auth.uid() OR public.is_admin())', t || '_upd', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (owner_id = auth.uid() OR public.is_admin())', t || '_del', t);
  END LOOP;
END $$;
--> statement-breakpoint

-- ── profiles: eigenes Profil + Admin; Selbst-Registrierung nur als pending ──
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
--> statement-breakpoint
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS profiles_sel ON public.profiles;
--> statement-breakpoint
CREATE POLICY profiles_sel ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());
--> statement-breakpoint
DROP POLICY IF EXISTS profiles_ins ON public.profiles;
--> statement-breakpoint
CREATE POLICY profiles_ins ON public.profiles FOR INSERT TO authenticated
  WITH CHECK ((id = auth.uid() AND role = 'pending' AND approved = false) OR public.is_admin());
--> statement-breakpoint
DROP POLICY IF EXISTS profiles_upd ON public.profiles;
--> statement-breakpoint
CREATE POLICY profiles_upd ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());
--> statement-breakpoint
DROP POLICY IF EXISTS profiles_del ON public.profiles;
--> statement-breakpoint
CREATE POLICY profiles_del ON public.profiles FOR DELETE TO authenticated
  USING (public.is_admin());
--> statement-breakpoint

-- ── agent_reviews: NUR Admins (diskrete KI-Bewertung) ──
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_reviews TO authenticated;
--> statement-breakpoint
ALTER TABLE public.agent_reviews ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS agent_reviews_admin ON public.agent_reviews;
--> statement-breakpoint
CREATE POLICY agent_reviews_admin ON public.agent_reviews FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
