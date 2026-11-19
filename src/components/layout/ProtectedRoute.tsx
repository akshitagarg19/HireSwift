import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAppStore } from '@/store'
import { Role } from '@/types'
import { isFeatureEnabled } from '@/config/features'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: Role[]
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { currentUser } = useAppStore()
  const location = useLocation()

  if (isFeatureEnabled('enableAuth')) {
    if (!currentUser) {
      return <Navigate to="/login" state={{ from: location }} replace />
    }

    if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
      return (
        <div className="p-8 text-center bg-white rounded-xl border border-border">
          <h2 className="text-lg font-bold text-rose-600">Access Restricted</h2>
          <p className="text-sm text-muted mt-2">
            Your role ({currentUser.role}) does not have permission to access this page. Please contact an Admin.
          </p>
        </div>
      )
    }
  }

  return <>{children}</>
}
