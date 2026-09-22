-- Aula EI · Motor de Formación y Cumplimiento v2.1
-- Índices y optimización de políticas RLS detectadas por Database Advisor.
-- 2026-09-22

begin;

-- Índices de claves foráneas usadas por el motor.
create index if not exists compliance_evidence_course_idx
  on public.compliance_evidence(course_id)
  where course_id is not null;

create index if not exists course_competencies_competency_idx
  on public.course_competencies(competency_id);

create index if not exists job_position_competencies_competency_idx
  on public.job_position_competencies(competency_id);

create index if not exists job_position_paths_path_idx
  on public.job_position_paths(path_id);

create index if not exists learning_paths_created_by_idx
  on public.learning_paths(created_by)
  where created_by is not null;

create index if not exists profile_position_history_assigned_by_idx
  on public.profile_position_history(assigned_by)
  where assigned_by is not null;

create index if not exists profile_position_history_position_idx
  on public.profile_position_history(position_id)
  where position_id is not null;

create index if not exists training_automation_rules_created_by_idx
  on public.training_automation_rules(created_by)
  where created_by is not null;

create index if not exists training_notifications_course_idx
  on public.training_notifications(course_id)
  where course_id is not null;

create index if not exists training_notifications_path_idx
  on public.training_notifications(path_id)
  where path_id is not null;

-- Evita reevaluar auth.uid() por fila dentro de las políticas de lectura.
drop policy if exists job_positions_read on public.job_positions;
create policy job_positions_read on public.job_positions
for select to authenticated
using ((select public.is_aula_active((select auth.uid()))));

drop policy if exists training_competencies_read on public.training_competencies;
create policy training_competencies_read on public.training_competencies
for select to authenticated
using ((select public.is_aula_active((select auth.uid()))));

drop policy if exists job_position_competencies_read on public.job_position_competencies;
create policy job_position_competencies_read on public.job_position_competencies
for select to authenticated
using ((select public.is_aula_active((select auth.uid()))));

drop policy if exists learning_paths_read on public.learning_paths;
create policy learning_paths_read on public.learning_paths
for select to authenticated
using ((select public.is_aula_active((select auth.uid()))));

drop policy if exists learning_path_courses_read on public.learning_path_courses;
create policy learning_path_courses_read on public.learning_path_courses
for select to authenticated
using ((select public.is_aula_active((select auth.uid()))));

drop policy if exists job_position_paths_read on public.job_position_paths;
create policy job_position_paths_read on public.job_position_paths
for select to authenticated
using ((select public.is_aula_active((select auth.uid()))));

drop policy if exists course_competencies_read on public.course_competencies;
create policy course_competencies_read on public.course_competencies
for select to authenticated
using ((select public.is_aula_active((select auth.uid()))));

-- Evita dos políticas SELECT permisivas al separar escritura administrativa.
drop policy if exists job_positions_admin_write on public.job_positions;
drop policy if exists job_positions_admin_insert on public.job_positions;
drop policy if exists job_positions_admin_update on public.job_positions;
drop policy if exists job_positions_admin_delete on public.job_positions;
create policy job_positions_admin_insert on public.job_positions
for insert to authenticated with check ((select public.is_admin()));
create policy job_positions_admin_update on public.job_positions
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy job_positions_admin_delete on public.job_positions
for delete to authenticated using ((select public.is_admin()));

drop policy if exists training_competencies_admin_write on public.training_competencies;
drop policy if exists training_competencies_admin_insert on public.training_competencies;
drop policy if exists training_competencies_admin_update on public.training_competencies;
drop policy if exists training_competencies_admin_delete on public.training_competencies;
create policy training_competencies_admin_insert on public.training_competencies
for insert to authenticated with check ((select public.is_admin()));
create policy training_competencies_admin_update on public.training_competencies
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy training_competencies_admin_delete on public.training_competencies
for delete to authenticated using ((select public.is_admin()));

drop policy if exists job_position_competencies_admin_write on public.job_position_competencies;
drop policy if exists job_position_competencies_admin_insert on public.job_position_competencies;
drop policy if exists job_position_competencies_admin_update on public.job_position_competencies;
drop policy if exists job_position_competencies_admin_delete on public.job_position_competencies;
create policy job_position_competencies_admin_insert on public.job_position_competencies
for insert to authenticated with check ((select public.is_admin()));
create policy job_position_competencies_admin_update on public.job_position_competencies
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy job_position_competencies_admin_delete on public.job_position_competencies
for delete to authenticated using ((select public.is_admin()));

drop policy if exists learning_paths_admin_write on public.learning_paths;
drop policy if exists learning_paths_admin_insert on public.learning_paths;
drop policy if exists learning_paths_admin_update on public.learning_paths;
drop policy if exists learning_paths_admin_delete on public.learning_paths;
create policy learning_paths_admin_insert on public.learning_paths
for insert to authenticated with check ((select public.is_admin()));
create policy learning_paths_admin_update on public.learning_paths
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy learning_paths_admin_delete on public.learning_paths
for delete to authenticated using ((select public.is_admin()));

drop policy if exists learning_path_courses_admin_write on public.learning_path_courses;
drop policy if exists learning_path_courses_admin_insert on public.learning_path_courses;
drop policy if exists learning_path_courses_admin_update on public.learning_path_courses;
drop policy if exists learning_path_courses_admin_delete on public.learning_path_courses;
create policy learning_path_courses_admin_insert on public.learning_path_courses
for insert to authenticated with check ((select public.is_admin()));
create policy learning_path_courses_admin_update on public.learning_path_courses
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy learning_path_courses_admin_delete on public.learning_path_courses
for delete to authenticated using ((select public.is_admin()));

drop policy if exists job_position_paths_admin_write on public.job_position_paths;
drop policy if exists job_position_paths_admin_insert on public.job_position_paths;
drop policy if exists job_position_paths_admin_update on public.job_position_paths;
drop policy if exists job_position_paths_admin_delete on public.job_position_paths;
create policy job_position_paths_admin_insert on public.job_position_paths
for insert to authenticated with check ((select public.is_admin()));
create policy job_position_paths_admin_update on public.job_position_paths
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy job_position_paths_admin_delete on public.job_position_paths
for delete to authenticated using ((select public.is_admin()));

drop policy if exists course_competencies_admin_write on public.course_competencies;
drop policy if exists course_competencies_admin_insert on public.course_competencies;
drop policy if exists course_competencies_admin_update on public.course_competencies;
drop policy if exists course_competencies_admin_delete on public.course_competencies;
create policy course_competencies_admin_insert on public.course_competencies
for insert to authenticated with check ((select public.is_admin()));
create policy course_competencies_admin_update on public.course_competencies
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy course_competencies_admin_delete on public.course_competencies
for delete to authenticated using ((select public.is_admin()));

commit;
