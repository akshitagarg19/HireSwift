import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAppStore } from '@/store'
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Kanban,
  UploadCloud,
  Scale,
  BarChart3,
  Mail,
  Copy,
  ShieldCheck,
  Settings,
  Search,
  Bell,
  LogOut,
  ChevronDown,
  ExternalLink,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Menu,
  X,
  Sparkles,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { CommandPalette } from '@/components/CommandPalette'
import { cn } from '@/lib/utils'
import { Role } from '@/types'
import { isFeatureEnabled } from '@/config/features'
import { USE_MOCK, getIsSyntheticData } from '@/api/client'

export const AppShell: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    currentCompanyId,
    currentUser,
    companies,
    switchCompany,
    switchRole,
    logout,
    duplicateGroups,
    candidates,
    notifications,
    markNotificationRead,
    isBlindMode,
    toggleBlindMode,
  } = useAppStore()

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showCompanyMenu, setShowCompanyMenu] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isSynthetic, setIsSynthetic] = useState(getIsSyntheticData())

  useEffect(() => {
    const handler = (e: any) => {
      setIsSynthetic(Boolean(e.detail ?? true))
    }
    window.addEventListener('hireswift-synthetic', handler)
    return () => window.removeEventListener('hireswift-synthetic', handler)
  }, [])

  const currentCompany = companies.find((c) => c.id === currentCompanyId) || companies[0]

  // Counts for sidebar badges
  const pendingDuplicates = duplicateGroups.filter(
    (g) => g.companyId === currentCompanyId && g.status === 'Pending'
  ).length

  const lowConfidenceCount = candidates.filter(
    (c) => c.companyId === currentCompanyId && c.parseConfidence < 65
  ).length

  const unreadNotifications = notifications.filter(
    (n) => n.companyId === currentCompanyId && !n.read
  )

  const navItems = [
    ...(isFeatureEnabled('enableDashboard') ? [{ label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard }] : []),
    {
      label: 'Upload',
      path: '/app/upload',
      icon: UploadCloud,
      badge: lowConfidenceCount > 0 ? `${lowConfidenceCount}` : undefined,
      badgeColor: 'warning' as const,
    },
    { label: 'Candidates', path: '/app/candidates', icon: Users },
    { label: 'Jobs', path: '/app/jobs', icon: Briefcase },
    { label: 'Pipeline', path: '/app/pipeline', icon: Kanban },
    { label: 'Compare', path: '/app/compare', icon: Scale },
    { label: 'Insights', path: '/app/insights', icon: BarChart3 },
    ...(isFeatureEnabled('enableDuplicates')
      ? [
          {
            label: 'Duplicates',
            path: '/app/duplicates',
            icon: Copy,
            badge: pendingDuplicates > 0 ? `${pendingDuplicates}` : undefined,
            badgeColor: 'danger' as const,
          },
        ]
      : []),
    ...(isFeatureEnabled('enableEmails') ? [{ label: 'Emails', path: '/app/emails', icon: Mail }] : []),
    ...(isFeatureEnabled('enableFairness') ? [{ label: 'Fairness', path: '/app/fairness', icon: ShieldCheck }] : []),
    ...(isFeatureEnabled('enableSettings') ? [{ label: 'Settings', path: '/app/settings', icon: Settings }] : []),
  ]

  // Breadcrumbs calculation
  const pathSegments = location.pathname.split('/').filter(Boolean)
  const breadcrumbs = pathSegments.map((segment, index) => {
    const url = `/${pathSegments.slice(0, index + 1).join('/')}`
    const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' ')
    return { label, url, isLast: index === pathSegments.length - 1 }
  })

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />

      {/* LEFT SIDEBAR (DESKTOP) */}
      <aside className="hidden md:flex w-64 bg-card border-r border-border flex-col shrink-0 select-none">
        {/* Brand Logo & Company Header */}
        <div className="h-16 flex items-center px-5 border-b border-border gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-lg shadow-sm">
            ⚡
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-base font-bold text-text tracking-tight flex items-center gap-1.5">
              HireSwift
              <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                ATS
              </span>
            </span>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors group',
                  isActive
                    ? 'bg-primary-light text-primary font-semibold'
                    : 'text-muted hover:text-text hover:bg-gray-100/70'
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={cn(
                      'w-4 h-4 shrink-0 transition-colors',
                      isActive ? 'text-primary' : 'text-muted group-hover:text-text'
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <Badge
                    variant={item.badgeColor || 'default'}
                    size="sm"
                    className="ml-auto"
                  >
                    {item.badge}
                  </Badge>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Public Careers Link & Active Role */}
        <div className="p-3 border-t border-border space-y-2">
          {isFeatureEnabled('enableCareers') && (
            <a
              href={`/careers/${currentCompany.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3 py-2 text-xs font-medium text-muted hover:text-primary rounded-lg border border-border bg-gray-50/50 hover:bg-indigo-50/40 hover:border-indigo-200 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" />
                Public Careers Page
              </span>
              <span className="text-[10px] text-primary underline">Open</span>
            </a>
          )}

          <div className="px-3 py-2 rounded-lg bg-gray-50 border border-border flex items-center justify-between text-xs text-muted">
            <span className="font-medium">Active Role</span>
            <select
              aria-label="Switch User Role"
              value={currentUser?.role || 'Viewer'}
              onChange={(e) => switchRole(e.target.value as Role)}
              className="bg-white border border-border rounded px-1.5 py-0.5 text-[11px] font-semibold text-text focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer uppercase"
            >
              <option value="Admin">Admin</option>
              <option value="Recruiter">Recruiter</option>
              <option value="Viewer">Viewer</option>
            </select>
          </div>
        </div>
      </aside>

      {/* MOBILE SIDEBAR DRAWER OVERLAY */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-64 max-w-[80vw] bg-card border-r border-border flex flex-col z-10 shadow-xl select-none">
            <div className="h-16 flex items-center justify-between px-5 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-lg shadow-sm">
                  ⚡
                </div>
                <span className="text-base font-bold text-text tracking-tight">HireSwift</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-gray-100"
                aria-label="Close navigation sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors group',
                      isActive
                        ? 'bg-primary-light text-primary font-semibold'
                        : 'text-muted hover:text-text hover:bg-gray-100/70'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={cn('w-4 h-4 shrink-0 transition-colors', isActive ? 'text-primary' : 'text-muted')} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <Badge variant={item.badgeColor || 'default'} size="sm" className="ml-auto">
                        {item.badge}
                      </Badge>
                    )}
                  </NavLink>
                )
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOP BAR */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 sm:px-6 shrink-0 z-10">
          {/* Left: Mobile Menu Toggle & Global Search Palette Trigger */}
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg text-muted hover:text-text hover:bg-gray-100 transition-colors shrink-0"
              aria-label="Open navigation sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center justify-between w-full h-9 px-3 text-sm text-muted bg-gray-100/80 hover:bg-gray-100 rounded-lg border border-border transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted" />
                <span className="text-xs">Search candidates, jobs, skills...</span>
              </div>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-muted bg-white border border-border rounded">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Synthetic Data Scale Indicator */}
            {isSynthetic && (
              <span
                data-testid="synthetic-data-badge"
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                Synthetic data (Scale: 1,000)
              </span>
            )}

            {/* Blind Mode Top-bar Toggle */}
            <button
              type="button"
              onClick={toggleBlindMode}
              data-testid="blind-mode-toggle"
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer',
                isBlindMode
                  ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-xs'
                  : 'bg-white text-muted hover:text-text border-border hover:bg-gray-50'
              )}
              title={isBlindMode ? 'Disable Blind Hiring Mode' : 'Enable Blind Hiring Mode'}
            >
              <Eye className={cn('w-3.5 h-3.5', isBlindMode ? 'text-amber-700' : 'text-muted')} />
              <span>Blind Mode: {isBlindMode ? 'ON' : 'OFF'}</span>
            </button>

            {/* Company Display / Switcher */}
            {isFeatureEnabled('enableCompanySwitcher') ? (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowCompanyMenu(!showCompanyMenu)
                    setShowNotifications(false)
                    setShowUserMenu(false)
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-text bg-white border border-border rounded-lg hover:bg-gray-50 transition-colors shadow-xs"
                >
                  <div className="w-4 h-4 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                    {currentCompany.name.charAt(0)}
                  </div>
                  <span className="truncate max-w-[130px]">{currentCompany.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted" />
                </button>

                {showCompanyMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-card rounded-xl border border-border shadow-modal py-1.5 z-50 animate-in fade-in-0 zoom-in-95">
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-muted uppercase tracking-wider">
                      Switch Workspace Tenant
                    </div>
                    {companies.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          switchCompany(c.id)
                          setShowCompanyMenu(false)
                        }}
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors',
                          c.id === currentCompanyId
                            ? 'bg-indigo-50/70 text-primary font-semibold'
                            : 'text-text hover:bg-gray-50'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center font-bold text-xs text-text">
                            {c.name.charAt(0)}
                          </div>
                          <div>
                            <div>{c.name}</div>
                            <div className="text-[10px] text-muted">{c.industry || 'ATS Tenant'}</div>
                          </div>
                        </div>
                        {c.id === currentCompanyId && (
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-text bg-white border border-border rounded-lg shadow-xs">
                <div className="w-4 h-4 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                  {currentCompany.name.charAt(0)}
                </div>
                <span className="truncate max-w-[130px]">{currentCompany.name}</span>
              </div>
            )}

            {/* Backend Connectivity Status Pill */}
            <div
              className={cn(
                'hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border',
                USE_MOCK
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-indigo-50 text-indigo-800 border-indigo-200'
              )}
              title={
                USE_MOCK
                  ? 'Mock API Mode: Fast simulated responses & local state'
                  : 'FastAPI Backend Mode: Connected to backend endpoints'
              }
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full animate-pulse',
                  USE_MOCK ? 'bg-emerald-500' : 'bg-indigo-600'
                )}
              />
              <span>{USE_MOCK ? 'Mock API Engine' : 'FastAPI Connected'}</span>
            </div>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications)
                  setShowCompanyMenu(false)
                  setShowUserMenu(false)
                }}
                className="relative p-2 text-muted hover:text-text rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-card rounded-xl border border-border shadow-modal p-2 z-50 animate-in fade-in-0 zoom-in-95">
                  <div className="flex items-center justify-between px-2 py-1.5 border-b border-border mb-1">
                    <span className="text-xs font-semibold text-text">Notifications</span>
                    <span className="text-[11px] text-muted">{unreadNotifications.length} unread</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {notifications.filter((n) => n.companyId === currentCompanyId).length === 0 ? (
                      <p className="p-3 text-center text-xs text-muted">No notifications</p>
                    ) : (
                      notifications
                        .filter((n) => n.companyId === currentCompanyId)
                        .map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => {
                              markNotificationRead(notif.id)
                              if (notif.link) {
                                setShowNotifications(false)
                                navigate(notif.link)
                              }
                            }}
                            className={cn(
                              'p-2.5 rounded-lg text-xs cursor-pointer transition-colors border',
                              notif.read ? 'bg-white border-transparent text-muted' : 'bg-indigo-50/50 border-indigo-100 text-text'
                            )}
                          >
                            <div className="flex items-start gap-2">
                              {notif.type === 'warning' ? (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                              )}
                              <div>
                                <p className="font-semibold">{notif.title}</p>
                                <p className="text-muted text-[11px] mt-0.5">{notif.message}</p>
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            {isFeatureEnabled('enableAuth') ? (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowUserMenu(!showUserMenu)
                    setShowCompanyMenu(false)
                    setShowNotifications(false)
                  }}
                  className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Avatar name={currentUser?.name || 'User'} size="sm" />
                  <div className="hidden sm:block text-left text-xs">
                    <div className="font-semibold text-text">{currentUser?.name || 'User'}</div>
                    <div className="text-[10px] text-muted">{currentUser?.role}</div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-muted" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-52 bg-card rounded-xl border border-border shadow-modal py-1.5 z-50 animate-in fade-in-0 zoom-in-95">
                    <div className="px-3 py-2 border-b border-border">
                      <p className="text-xs font-semibold text-text">{currentUser?.name}</p>
                      <p className="text-[11px] text-muted truncate">{currentUser?.email}</p>
                    </div>
                    {isFeatureEnabled('enableSettings') && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          navigate('/app/settings')
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-text hover:bg-gray-50"
                      >
                        <Settings className="w-3.5 h-3.5 text-muted" />
                        Settings & Profile
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        logout()
                        navigate('/login')
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-rose-600 hover:bg-rose-50"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-1">
                <Avatar name={currentUser?.name || 'User'} size="sm" />
              </div>
            )}
          </div>
        </header>

        {/* BREADCRUMBS BAR */}
        {breadcrumbs.length > 1 && (
          <div className="px-6 py-2 border-b border-border bg-white/60 flex items-center gap-2 text-xs text-muted shrink-0">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.url}>
                {idx > 0 && <span className="text-gray-300">/</span>}
                {crumb.isLast ? (
                  <span className="font-semibold text-text">{crumb.label}</span>
                ) : (
                  <NavLink to={crumb.url} className="hover:text-primary transition-colors">
                    {crumb.label}
                  </NavLink>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* BLIND MODE BANNER */}
        {isBlindMode && (
          <div
            data-testid="blind-mode-banner"
            className="bg-amber-500 text-white px-6 py-2 text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in-0 shrink-0"
          >
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-white shrink-0" />
              <span>Blind mode on — Candidate names, colleges, and locations are masked to prevent unconscious bias.</span>
            </div>
            <button
              onClick={toggleBlindMode}
              className="text-[11px] underline hover:text-amber-100 font-bold ml-4 cursor-pointer"
            >
              Turn off
            </button>
          </div>
        )}

        {/* SCROLLABLE VIEWPORT */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
