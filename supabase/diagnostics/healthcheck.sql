-- AULA EI · DIAGNÓSTICO DE SOLO LECTURA
-- Ejecutar únicamente en el proyecto cuyo ref sea ipoidimevokogptydbvt.
-- Este archivo no crea, altera, actualiza ni elimina datos.

-- 1. Entorno de base de datos.
select
  current_database() as database_name,
  current_user as executed_by,
  current_setting('server_version') as postgres_version,
  now() as checked_at;

-- 2. Objetos que el frontend espera encontrar.
with expected(schema_name, object_name, object_type) as (
  values
    ('public', 'profiles', 'table'),
    ('public', 'courses', 'table'),
    ('public', 'course_phases', 'table'),
    ('public', 'content_blocks', 'table'),
    ('public', 'enrollments', 'table'),
    ('public', 'block_progress', 'table'),
    ('public', 'questions', 'table'),
    ('public', 'question_options', 'table'),
    ('public', 'exam_attempts', 'table'),
    ('public', 'certificates', 'table'),
    ('public', 'certificate_signatures', 'table'),
    ('public', 'audit_logs', 'table')
)
select
  e.*,
  to_regclass(format('%I.%I', e.schema_name, e.object_name)) is not null as exists
from expected e
order by e.object_name;

-- 3. Estado RLS de las tablas públicas usadas por Aula EI.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
  and c.relname in (
    'profiles', 'courses', 'course_phases', 'content_blocks',
    'enrollments', 'block_progress', 'questions', 'question_options',
    'exam_attempts', 'certificates', 'certificate_signatures', 'audit_logs'
  )
order by c.relname;

-- 4. Políticas RLS actuales.
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where (schemaname = 'public' and tablename in (
  'profiles', 'courses', 'course_phases', 'content_blocks',
  'enrollments', 'block_progress', 'questions', 'question_options',
  'exam_attempts', 'certificates', 'certificate_signatures', 'audit_logs'
)) or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;

-- 5. Funciones esperadas, seguridad y exposición de ejecución.
select
  n.nspname as schema_name,
  p.oid::regprocedure::text as function_signature,
  p.prosecdef as security_definer,
  p.proconfig as function_settings,
  has_function_privilege('public', p.oid, 'EXECUTE') as executable_by_public,
  has_function_privilege('anon', p.oid, 'EXECUTE') as executable_by_anon,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as executable_by_authenticated
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'get_my_profile', 'set_user_role', 'get_exam_questions', 'submit_exam',
    'get_my_certificates', 'get_certificate_by_code',
    'admin_certificate_ranking', 'admin_completed_without_certificate',
    'admin_generate_certificate', 'get_certificate_signatures',
    'save_certificate_signature', 'clear_certificate_signature',
    'is_admin', 'is_super_admin', 'is_enrolled', 'can_take_exam',
    'write_audit_log', 'can_access_certificate', 'handle_new_user'
  )
order by p.proname, p.oid::regprocedure::text;

-- 6. Restricciones relacionadas con roles.
select
  conrelid::regclass::text as table_name,
  conname,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = to_regclass('public.profiles')
order by conname;

-- 7. Permisos de tablas otorgados a clientes públicos.
select
  table_schema,
  table_name,
  grantee,
  privilege_type
from information_schema.table_privileges
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
  and table_name in (
    'profiles', 'courses', 'course_phases', 'content_blocks',
    'enrollments', 'block_progress', 'questions', 'question_options',
    'exam_attempts', 'certificates', 'certificate_signatures', 'audit_logs'
  )
order by table_name, grantee, privilege_type;

-- 8. Bucket de archivos de cursos.
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'course-assets';

-- 9. Índices disponibles para columnas usadas frecuentemente por RLS.
select schemaname, tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'profiles', 'courses', 'course_phases', 'content_blocks',
    'enrollments', 'block_progress', 'questions', 'question_options',
    'exam_attempts', 'certificates', 'certificate_signatures', 'audit_logs'
  )
order by tablename, indexname;

-- 10. Valores de rol existentes; ayuda a detectar mezcla inglés/español.
select role, count(*) as users
from public.profiles
group by role
order by role;

-- 11. Tamaño aproximado, sin leer los datos de cada tabla.
select relname as table_name, n_live_tup as estimated_rows, last_analyze, last_autoanalyze
from pg_stat_user_tables
where schemaname = 'public'
  and relname in (
    'profiles', 'courses', 'course_phases', 'content_blocks',
    'enrollments', 'block_progress', 'questions', 'question_options',
    'exam_attempts', 'certificates', 'certificate_signatures', 'audit_logs'
  )
order by relname;

