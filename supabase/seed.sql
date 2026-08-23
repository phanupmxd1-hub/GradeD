-- Default Mock School Seed Data
INSERT INTO public.schools (id, name_th, name_en, status)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'โรงเรียนประชารักศึกษา',
  'Pracharuksa Academy',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Academic Years
INSERT INTO public.academic_years (id, school_id, year, status)
VALUES 
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 2568, 'closed'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 2569, 'active')
ON CONFLICT (id) DO NOTHING;

-- Semesters
INSERT INTO public.semesters (id, academic_year_id, semester_no, status)
VALUES 
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 1, 'active'),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 2, 'closed')
ON CONFLICT (id) DO NOTHING;

-- Classrooms
INSERT INTO public.classrooms (id, school_id, academic_year_id, name, student_count)
VALUES 
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'ม.1/1', 40),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'ม.1/2', 20)
ON CONFLICT (id) DO NOTHING;

-- Subjects
INSERT INTO public.subjects (id, school_id, code, name, credit_points, hours_per_week)
VALUES 
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'ว21101', 'วิทยาศาสตร์ 1', 1.5, 3),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'ค21101', 'คณิตศาสตร์พื้นฐาน 1', 1.5, 3),
  ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'อ21101', 'ภาษาอังกฤษ 1', 1.0, 2)
ON CONFLICT (id) DO NOTHING;
