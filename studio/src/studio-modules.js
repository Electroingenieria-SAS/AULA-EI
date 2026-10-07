import { lazy } from 'react'

export const loadAssignmentsCenter = () => import('./AssignmentsCenter.jsx')
export const loadCoursesManager = () => import('./CoursesManager.jsx')
export const loadUsersManager = () => import('./UsersManager.jsx')
export const loadCertificatesManager = () => import('./CertificatesManager.jsx')
export const loadComplianceCenter = () => import('./ComplianceCenter.jsx')
export const loadLegalComplianceManager = () => import('./LegalComplianceManager.jsx')

export const AssignmentsCenter = lazy(loadAssignmentsCenter)
export const CoursesManager = lazy(loadCoursesManager)
export const UsersManager = lazy(loadUsersManager)
export const CertificatesManager = lazy(loadCertificatesManager)
export const ComplianceCenter = lazy(loadComplianceCenter)
export const LegalComplianceManager = lazy(loadLegalComplianceManager)

export function preloadStudioTools(canAdmin) {
  void loadCoursesManager()
  if (!canAdmin) return
  void loadAssignmentsCenter()
  void loadUsersManager()
  void loadCertificatesManager()
  void loadComplianceCenter()
  void loadLegalComplianceManager()
}
