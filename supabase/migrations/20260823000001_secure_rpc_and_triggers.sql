-- 1. Sync Profile changes to Auth Metadata Trigger (Prevents JWT Stale State)
CREATE OR REPLACE FUNCTION public.sync_profile_to_auth_metadata()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('school_id', NEW.school_id, 'role', NEW.role)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_change ON public.profiles;
CREATE TRIGGER on_profile_change
AFTER INSERT OR UPDATE OF school_id, role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_to_auth_metadata();

-- 2. Auth Trigger for New User SignUp (Secure default role = 'teacher')
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_first_name TEXT := COALESCE(new.raw_user_meta_data->>'first_name', 'ครู');
  v_last_name TEXT := COALESCE(new.raw_user_meta_data->>'last_name', 'ผู้สอน');
  v_school_id UUID := NULL;
BEGIN
  IF (new.raw_user_meta_data->>'school_id') IS NOT NULL AND (new.raw_user_meta_data->>'school_id') != '' THEN
    BEGIN
      v_school_id := (new.raw_user_meta_data->>'school_id')::uuid;
    EXCEPTION WHEN others THEN
      v_school_id := NULL;
    END;
  END IF;

  INSERT INTO public.profiles (id, email, first_name, last_name, school_id, role)
  VALUES (
    new.id,
    new.email,
    v_first_name,
    v_last_name,
    v_school_id,
    'teacher' -- Force default teacher role to prevent client privilege escalation
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    school_id = COALESCE(EXCLUDED.school_id, public.profiles.school_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Batch Attendance RPC with Auth Guard
CREATE OR REPLACE FUNCTION public.save_attendance_batch(
  p_session_id UUID,
  p_records JSONB -- [{student_id: "...", status: "...", remarks: "..."}]
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_school_id UUID;
  v_session_school_id UUID;
  rec RECORD;
  v_count INTEGER := 0;
BEGIN
  -- 1. Check user authentication
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User is not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT school_id INTO v_user_school_id FROM public.profiles WHERE id = v_user_id;
  SELECT school_id INTO v_session_school_id FROM public.attendance_sessions WHERE id = p_session_id;

  -- 2. Check school authorization (Security Definer Guard)
  IF v_session_school_id IS NULL OR v_user_school_id IS NULL OR v_session_school_id != v_user_school_id THEN
    RAISE EXCEPTION 'Unauthorized: Forbidden access to attendance session across schools' USING ERRCODE = '42501';
  END IF;

  -- 3. Perform atomic UPSERT
  FOR rec IN SELECT * FROM jsonb_to_recordset(p_records) AS x(student_id UUID, status TEXT, remarks TEXT) LOOP
    INSERT INTO public.attendance_records (session_id, student_id, status, remarks, updated_at, updated_by)
    VALUES (p_session_id, rec.student_id, rec.status, rec.remarks, NOW(), v_user_id)
    ON CONFLICT (session_id, student_id)
    DO UPDATE SET 
      status = EXCLUDED.status, 
      remarks = EXCLUDED.remarks,
      updated_at = NOW(), 
      updated_by = v_user_id;
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'saved_count', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Batch Score RPC with Auth Guard & Row-Level OCC
CREATE OR REPLACE FUNCTION public.save_scores_batch(
  p_subject_id UUID,
  p_classroom_id UUID,
  p_scores JSONB -- [{student_id: "...", score_component_id: "...", score: 10.0, client_updated_at: "..."}]
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_school_id UUID;
  v_subject_school_id UUID;
  rec RECORD;
  v_saved_count INTEGER := 0;
  v_conflicts JSONB := '[]'::jsonb;
  v_existing_updated_at TIMESTAMPTZ;
BEGIN
  -- 1. Check user authentication
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User is not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT school_id INTO v_user_school_id FROM public.profiles WHERE id = v_user_id;
  SELECT school_id INTO v_subject_school_id FROM public.subjects WHERE id = p_subject_id;

  -- 2. Authorization guard
  IF v_subject_school_id IS NULL OR v_user_school_id IS NULL OR v_subject_school_id != v_user_school_id THEN
    RAISE EXCEPTION 'Unauthorized: Forbidden access to subject across schools' USING ERRCODE = '42501';
  END IF;

  -- 3. Row-Level OCC iteration
  FOR rec IN SELECT * FROM jsonb_to_recordset(p_scores) AS x(
    student_id UUID, 
    score_component_id UUID, 
    score NUMERIC, 
    remarks TEXT,
    client_updated_at TIMESTAMPTZ
  ) LOOP
    -- Check if existing record was modified after client read
    SELECT updated_at INTO v_existing_updated_at 
    FROM public.scores 
    WHERE student_id = rec.student_id AND score_component_id = rec.score_component_id;

    IF v_existing_updated_at IS NOT NULL AND rec.client_updated_at IS NOT NULL AND v_existing_updated_at > rec.client_updated_at THEN
      -- Conflict detected for this specific student row
      v_conflicts := v_conflicts || jsonb_build_object(
        'student_id', rec.student_id,
        'score_component_id', rec.score_component_id,
        'server_updated_at', v_existing_updated_at
      );
    ELSE
      -- Upsert score safely
      INSERT INTO public.scores (student_id, score_component_id, score, remarks, is_graded, updated_at, updated_by)
      VALUES (rec.student_id, rec.score_component_id, rec.score, rec.remarks, true, NOW(), v_user_id)
      ON CONFLICT (student_id, score_component_id)
      DO UPDATE SET 
        score = EXCLUDED.score,
        remarks = EXCLUDED.remarks,
        is_graded = true,
        updated_at = NOW(),
        updated_by = v_user_id;
      v_saved_count := v_saved_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true, 
    'saved_count', v_saved_count, 
    'conflicts', v_conflicts
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Row-Level Security (RLS) Enablement and Policies
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonus_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_results ENABLE ROW LEVEL SECURITY;

-- Helper function to extract user's school_id from JWT app_metadata without JOIN overhead
CREATE OR REPLACE FUNCTION public.current_school_id()
RETURNS UUID AS $$
  SELECT NULLIF((auth.jwt() -> 'app_metadata'::text) ->> 'school_id', '')::uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- RLS Policies for Schools
CREATE POLICY schools_access_policy ON public.schools
FOR ALL USING (
  id = public.current_school_id() 
  OR (auth.jwt() -> 'app_metadata'::text) ->> 'role' = 'system_admin'
);

-- RLS Policies for Profiles
CREATE POLICY profiles_view_policy ON public.profiles
FOR SELECT USING (
  school_id = public.current_school_id() 
  OR id = auth.uid()
);

CREATE POLICY profiles_update_policy ON public.profiles
FOR UPDATE USING (
  id = auth.uid()
);

-- RLS Policies for Classrooms
CREATE POLICY classrooms_access_policy ON public.classrooms
FOR ALL USING (
  school_id = public.current_school_id()
);

-- RLS Policies for Subjects
CREATE POLICY subjects_access_policy ON public.subjects
FOR ALL USING (
  school_id = public.current_school_id()
);

-- RLS Policies for Students
CREATE POLICY students_access_policy ON public.students
FOR ALL USING (
  school_id = public.current_school_id()
);

-- RLS Policies for Enrollments
CREATE POLICY enrollments_access_policy ON public.enrollments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = enrollments.student_id AND s.school_id = public.current_school_id()
  )
);

-- RLS Policies for Attendance Sessions
CREATE POLICY attendance_sessions_access_policy ON public.attendance_sessions
FOR ALL USING (
  school_id = public.current_school_id()
);

-- RLS Policies for Attendance Records
CREATE POLICY attendance_records_access_policy ON public.attendance_records
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.attendance_sessions ses
    WHERE ses.id = attendance_records.session_id AND ses.school_id = public.current_school_id()
  )
);

-- RLS Policies for Scores
CREATE POLICY scores_access_policy ON public.scores
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = scores.student_id AND s.school_id = public.current_school_id()
  )
);
