import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Home, ArrowLeft } from 'lucide-react'

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 text-primary flex items-center justify-center mb-6 shadow-soft">
        <span className="text-2xl font-bold">404</span>
      </div>

      <h1 className="text-3xl font-extrabold text-text tracking-tight sm:text-4xl">
        Page Not Found
      </h1>
      <p className="mt-3 text-sm text-muted max-w-md mx-auto leading-relaxed">
        The recruitment page or talent record you are trying to reach does not exist, has been archived, or moved.
      </p>

      <div className="mt-8 flex items-center justify-center gap-3">
        <Link to="/">
          <Button variant="primary" size="md" leftIcon={<Home className="w-4 h-4" />}>
            Back to Home
          </Button>
        </Link>
        <Link to="/app/dashboard">
          <Button variant="outline" size="md" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Go to App
          </Button>
        </Link>
      </div>
    </div>
  )
}
