
CREATE TYPE public.app_role AS ENUM ('admin', 'socio');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT, INSERT, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
CREATE OR REPLACE FUNCTION public.is_member(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','socio'))
$$;

CREATE POLICY "own profile or admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "read own roles or admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin grants roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin revokes roles" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- New user: profile; the very first user becomes admin. Others wait for authorization.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'));
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- Clients
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ragione_sociale text NOT NULL,
  partita_iva text,
  comune text,
  referente text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients select" ON public.clients FOR SELECT TO authenticated
  USING (public.is_member(auth.uid()) AND (created_by = auth.uid() OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "clients insert" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (public.is_member(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "clients update" ON public.clients FOR UPDATE TO authenticated
  USING (public.is_member(auth.uid()) AND (created_by = auth.uid() OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "clients delete" ON public.clients FOR DELETE TO authenticated
  USING (public.is_member(auth.uid()) AND (created_by = auth.uid() OR public.has_role(auth.uid(),'admin')));
CREATE TRIGGER clients_touch BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Assessments
CREATE TABLE public.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Pre-istruttoria Voucher Digitalizzazione 2026',
  status text NOT NULL DEFAULT 'bozza',
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessments TO authenticated;
GRANT ALL ON public.assessments TO service_role;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.can_access_client(_client_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_member(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.clients c WHERE c.id = _client_id
      AND (c.created_by = auth.uid() OR public.has_role(auth.uid(),'admin')))
$$;
CREATE OR REPLACE FUNCTION public.can_access_assessment(_assessment_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = _assessment_id AND public.can_access_client(a.client_id))
$$;
CREATE POLICY "assess select" ON public.assessments FOR SELECT TO authenticated USING (public.can_access_client(client_id));
CREATE POLICY "assess insert" ON public.assessments FOR INSERT TO authenticated WITH CHECK (public.can_access_client(client_id) AND created_by = auth.uid());
CREATE POLICY "assess update" ON public.assessments FOR UPDATE TO authenticated USING (public.can_access_client(client_id)) WITH CHECK (public.can_access_client(client_id));
CREATE POLICY "assess delete" ON public.assessments FOR DELETE TO authenticated USING (public.can_access_client(client_id));
CREATE TRIGGER assess_touch BEFORE UPDATE ON public.assessments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Notes, evidences, snapshots
CREATE TABLE public.assessment_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  section text,
  body text NOT NULL,
  author_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.evidences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  intervention text,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'documento',
  reference text,
  amount numeric,
  description text,
  author_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.assessment_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  label text,
  answers jsonb NOT NULL,
  result jsonb NOT NULL,
  rules_version jsonb,
  author_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.assessment_notes, public.evidences, public.assessment_snapshots TO authenticated;
GRANT ALL ON public.assessment_notes, public.evidences, public.assessment_snapshots TO service_role;
ALTER TABLE public.assessment_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notes select" ON public.assessment_notes FOR SELECT TO authenticated USING (public.can_access_assessment(assessment_id));
CREATE POLICY "notes insert" ON public.assessment_notes FOR INSERT TO authenticated WITH CHECK (public.can_access_assessment(assessment_id) AND author_id = auth.uid());
CREATE POLICY "notes delete" ON public.assessment_notes FOR DELETE TO authenticated USING (public.can_access_assessment(assessment_id));
CREATE POLICY "ev select" ON public.evidences FOR SELECT TO authenticated USING (public.can_access_assessment(assessment_id));
CREATE POLICY "ev insert" ON public.evidences FOR INSERT TO authenticated WITH CHECK (public.can_access_assessment(assessment_id) AND author_id = auth.uid());
CREATE POLICY "ev delete" ON public.evidences FOR DELETE TO authenticated USING (public.can_access_assessment(assessment_id));
CREATE POLICY "snap select" ON public.assessment_snapshots FOR SELECT TO authenticated USING (public.can_access_assessment(assessment_id));
CREATE POLICY "snap insert" ON public.assessment_snapshots FOR INSERT TO authenticated WITH CHECK (public.can_access_assessment(assessment_id) AND author_id = auth.uid());
CREATE POLICY "snap delete" ON public.assessment_snapshots FOR DELETE TO authenticated USING (public.can_access_assessment(assessment_id));

-- Rules (configurable, reviewable)
CREATE TABLE public.rules (
  key text PRIMARY KEY,
  category text NOT NULL,
  label text NOT NULL,
  value numeric,
  value_text text,
  unit text,
  source text NOT NULL DEFAULT 'Avviso Voucher Digitalizzazione PMI Lazio 2026 — testo ufficiale non ancora acquisito',
  reference text NOT NULL DEFAULT 'Articolo/Appendice da individuare',
  status text NOT NULL DEFAULT 'da_validare',
  requires_official_check boolean NOT NULL DEFAULT true,
  review_notes text,
  sort integer NOT NULL DEFAULT 0,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.rules TO authenticated;
GRANT ALL ON public.rules TO service_role;
ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read rules" ON public.rules FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
CREATE POLICY "admin edits rules" ON public.rules FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER rules_touch BEFORE UPDATE ON public.rules FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.rules (key, category, label, value, value_text, unit, sort, review_notes) VALUES
('diag_small','importi','Diagnosi digitale — piccola impresa',8162.40,NULL,'EUR',10,'Importo fornito come dato preliminare. Confrontare con Avviso/Appendici.'),
('diag_medium','importi','Diagnosi digitale — media impresa',21427.20,NULL,'EUR',11,'Importo preliminare.'),
('workplace_per_employee','importi','Digital Workplace — per addetto INPS (luglio 2026)',2270.40,NULL,'EUR/addetto',20,'Base addetti: dato INPS luglio 2026 — verificare definizione ufficiale.'),
('commerce_micro','importi','Digital Commerce — micro impresa',4954.80,NULL,'EUR',30,'Importo preliminare.'),
('commerce_small','importi','Digital Commerce — piccola impresa',8125.20,NULL,'EUR',31,'Importo preliminare.'),
('commerce_medium','importi','Digital Commerce — media impresa',15873.60,NULL,'EUR',32,'Importo preliminare.'),
('cyber_small','importi','Cybersecurity — piccola impresa',14656.80,NULL,'EUR',40,'Importo preliminare.'),
('cyber_medium','importi','Cybersecurity — media impresa',44917.20,NULL,'EUR',41,'Importo preliminare.'),
('cloud_application','importi','Cloud — migrazione application server',17683.20,NULL,'EUR',50,'Importo preliminare.'),
('cloud_database','importi','Cloud — migrazione database',27656.40,NULL,'EUR',51,'Importo preliminare.'),
('cloud_web','importi','Cloud — migrazione web server',14076.00,NULL,'EUR',52,'Importo preliminare.'),
('cloud_backup','importi','Cloud — migrazione backup',5593.20,NULL,'EUR',53,'Importo preliminare.'),
('min_project','soglie','Importo minimo progetto',14000,NULL,'EUR',60,'Verificare se riferito a spesa o contributo.'),
('max_micro','soglie','Massimale micro impresa',50000,NULL,'EUR',61,'Importo preliminare.'),
('max_small','soglie','Massimale piccola impresa',100000,NULL,'EUR',62,'Importo preliminare.'),
('max_medium','soglie','Massimale media impresa',150000,NULL,'EUR',63,'Importo preliminare.'),
('workplace_min_months','requisiti','Digital Workplace — durata minima licenze/servizi',NULL,NULL,'mesi',70,'Durata NON nota: inserire valore dal testo ufficiale. Finché vuoto la verifica resta "da verificare".'),
('workplace_categories','requisiti','Digital Workplace — 5 categorie obbligatorie (etichette)',5,'Categoria 1 (da Avviso)|Categoria 2 (da Avviso)|Categoria 3 (da Avviso)|Categoria 4 (da Avviso)|Categoria 5 (da Avviso)',NULL,71,'Le denominazioni ufficiali delle 5 categorie vanno trascritte dal testo/Appendice. Separare con |.'),
('commerce_tech','requisiti','Digital Commerce — requisiti tecnici IaaS/PaaS (no semplice SaaS)',NULL,'Soluzione su infrastruttura IaaS/PaaS; esclusa la sola sottoscrizione SaaS',NULL,72,'Confrontare la definizione tecnica con l''Appendice.'),
('cyber_sizes','requisiti','Cybersecurity — ammessa solo per piccole e medie',NULL,'piccola|media',NULL,73,NULL),
('diag_rule','requisiti','Diagnosi digitale — obbligatoria piccole/medie, non ammissibile micro',NULL,'obbligatoria: piccola|media; esclusa: micro',NULL,74,NULL),
('cloud_rule','requisiti','Cloud — solo migrazioni reali di sistemi esistenti',NULL,'server applicativi, database, web, backup esistenti on-premise',NULL,75,'Se l''impresa è già in cloud, ammissibili solo sistemi locali residui (da verificare).'),
('sme_thresholds','requisiti','Definizione PMI (ULA, fatturato, totale attivo)',NULL,'micro <10 ULA e (fatt. ≤2M o attivo ≤2M); piccola <50 e ≤10M; media <250 e (fatt. ≤50M o attivo ≤43M)',NULL,76,'Soglie da Raccomandazione 2003/361/CE come richiamata dall''Avviso: confermare il rinvio e il trattamento delle imprese associate/collegate.'),
('sede_lazio','requisiti','Sede legale/operativa nel Lazio',NULL,'Sede nel Lazio (o entro termine previsto dall''Avviso)',NULL,77,'Verificare tempistica (domanda vs erogazione).'),
('ateco_exclusions','requisiti','Settori ATECO esclusi',NULL,NULL,NULL,78,'Elenco esclusioni da trascrivere dal testo ufficiale.'),
('de_minimis_cap','requisiti','Massimale de minimis (triennio)',NULL,NULL,'EUR',79,'Inserire massimale vigente secondo regolamento richiamato dall''Avviso.'),
('score_formula','punteggio','Formula punteggio (IVA/INPS 2025 e premialità)',NULL,NULL,NULL,90,'Formula NON verificata: l''app mostra "da verificare" e non calcola alcun punteggio finché non validata.');
