-- Read-only certificate results for active/synchronized course creators.
-- Keep admin certificate generation and signature mutations unchanged.
CREATE OR REPLACE FUNCTION public.creator_certificate_ranking()
RETURNS TABLE(certificate_code text,course_id uuid,course_title text,user_id uuid,user_full_name text,user_email text,score integer,issued_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=public,auth,pg_temp
AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_aula_active() OR
    public.normalize_aula_ei_role(auth.jwt()->'app_metadata'->>'aula_ei_role') <> 'creador_contenido' THEN
   RAISE EXCEPTION 'Acceso denegado al ranking de certificados.' USING ERRCODE='42501';
 END IF;
 RETURN QUERY
 SELECT cert.certificate_code,cert.course_id,c.title,cert.user_id,p.full_name,p.email,cert.score,cert.issued_at
 FROM public.certificates cert JOIN public.courses c ON c.id=cert.course_id
 JOIN public.profiles p ON p.id=cert.user_id
 ORDER BY cert.score DESC,cert.issued_at DESC,cert.certificate_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.creator_get_certificate_by_code(p_certificate_code text)
RETURNS TABLE(certificate_code text,course_id uuid,course_title text,user_id uuid,user_full_name text,user_email text,score integer,issued_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=public,auth,pg_temp
AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_aula_active() OR
    public.normalize_aula_ei_role(auth.jwt()->'app_metadata'->>'aula_ei_role') <> 'creador_contenido' THEN
   RAISE EXCEPTION 'Acceso denegado al certificado.' USING ERRCODE='42501';
 END IF;
 RETURN QUERY
 SELECT cert.certificate_code,cert.course_id,c.title,cert.user_id,p.full_name,p.email,cert.score,cert.issued_at
 FROM public.certificates cert JOIN public.courses c ON c.id=cert.course_id
 JOIN public.profiles p ON p.id=cert.user_id
 WHERE cert.certificate_code=p_certificate_code
 LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.creator_get_certificate_signatures(p_certificate_code text)
RETURNS TABLE(participant_signature_data text,admin_signature_data text,participant_signed_at timestamptz,admin_signed_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=public,auth,pg_temp
AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_aula_active() OR
    public.normalize_aula_ei_role(auth.jwt()->'app_metadata'->>'aula_ei_role') <> 'creador_contenido' THEN
   RAISE EXCEPTION 'Acceso denegado a las firmas del certificado.' USING ERRCODE='42501';
 END IF;
 RETURN QUERY
 SELECT cs.participant_signature_data,cs.admin_signature_data,cs.participant_signed_at,cs.admin_signed_at
 FROM public.certificates cert LEFT JOIN public.certificate_signatures cs ON cs.certificate_code=cert.certificate_code
 WHERE cert.certificate_code=p_certificate_code
 LIMIT 1;
END;
$$;

-- Do not expose definer RPCs to anonymous visitors or PUBLIC. This project
-- grants function EXECUTE to anon by default, requiring explicit revocation.
REVOKE ALL ON FUNCTION public.creator_certificate_ranking() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.creator_get_certificate_by_code(text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.creator_get_certificate_signatures(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.creator_certificate_ranking() TO authenticated;
GRANT EXECUTE ON FUNCTION public.creator_get_certificate_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.creator_get_certificate_signatures(text) TO authenticated;
