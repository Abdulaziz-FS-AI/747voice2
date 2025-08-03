'use client'

import { ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useUsage } from '@/contexts/subscription-context'
import { 
  LayoutDashboard, 
  Users, 
  Phone, 
  BarChart3, 
  Settings,
  LogOut,
  Menu,
  X,
  Mic,
  Zap,
  Activity,
  CreditCard
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { UsageWarningBanner } from '@/components/usage/usage-alerts'

interface DashboardLayoutProps {
  children: ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, description: 'Overview & Analytics' },
  { name: 'AI Assistants', href: '/dashboard/assistants', icon: Mic, description: 'Voice AI Management' },
  { name: 'Phone Numbers', href: '/dashboard/phone-numbers', icon: Phone, description: 'Twilio Integration' },
  { name: 'Analytics', href: '/dashboard/analytics', icon: Activity, description: 'Performance Insights' },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings, description: 'Configuration' },
]

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const { profile, usage } = useUsage()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    router.push('/signin')
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--vm-primary-dark)' }}>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0, 0, 0, 0.8)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Revolutionary Sidebar */}
      <div className={cn(
        "fixed inset-y-0 z-50 flex w-80 flex-col transition-transform lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )} style={{ 
        background: 'var(--vm-primary-surface)',
        borderRight: '1px solid var(--vm-border-default)'
      }}>
        
        {/* Premium Logo Section */}
        <div className="flex h-20 items-center justify-between px-6" style={{ borderBottom: '1px solid var(--vm-border-default)' }}>
          <div className="flex items-center gap-3">
            {/* Voice Matrix Logo */}
            <div className="relative">
              <div 
                className="h-12 w-12 rounded-full flex items-center justify-center"
                style={{ background: 'var(--vm-gradient-primary)' }}
              >
                <Mic className="h-7 w-7" style={{ color: '#FFFFFF' }} />
              </div>
              <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center"
                   style={{ background: 'var(--vm-accent-blue)' }}>
                <Zap className="h-2.5 w-2.5" style={{ color: '#FFFFFF' }} />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-wide" style={{ color: 'var(--vm-primary-light)' }}>Voice Matrix</h1>
              <p className="text-xs font-medium" style={{ color: 'var(--vm-neutral-400)' }}>AI Intelligence Platform</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden hover:bg-white/10"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" style={{ color: 'var(--vm-primary-light)' }} />
          </Button>
        </div>

        {/* Enhanced Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            
            return (
              <div key={item.name} className="relative">
                <button
                  className={cn(
                    "w-full flex items-center gap-4 px-4 py-3 rounded-xl text-left transition-all duration-300 group",
                    isActive 
                      ? "text-white" 
                      : "hover:bg-white/5 hover:transform hover:scale-[1.02]"
                  )}
                  style={{
                    background: isActive ? 'var(--vm-gradient-primary)' : 'transparent',
                    border: isActive ? 'none' : '1px solid transparent',
                  }}
                  onClick={() => {
                    router.push(item.href)
                    setSidebarOpen(false)
                  }}
                >
                  <div className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-lg transition-all",
                    isActive ? "bg-white/20" : "bg-white/10 group-hover:bg-white/15"
                  )}>
                    <item.icon className={cn(
                      "h-5 w-5 transition-all",
                      isActive ? "text-white" : "text-[var(--vm-secondary-purple)] group-hover:scale-110"
                    )} />
                  </div>
                  <div className="flex-1">
                    <div className={cn(
                      "font-semibold text-sm",
                      isActive ? "text-white" : "text-[var(--vm-primary-light)]"
                    )}>
                      {item.name}
                    </div>
                    <div className={cn(
                      "text-xs",
                      isActive ? "text-white/80" : "text-[var(--vm-neutral-400)]"
                    )}>
                      {item.description}
                    </div>
                  </div>
                  {isActive && (
                    <div className="w-2 h-2 rounded-full bg-white/60 animate-pulse" />
                  )}
                </button>
              </div>
            )
          })}
        </nav>

        {/* Premium User Section */}
        <div className="p-4" style={{ borderTop: '1px solid var(--vm-border-default)' }}>
          <div className="vm-card p-4 mb-3">
            <div className="flex items-center gap-3 mb-3">
              <div 
                className="h-12 w-12 rounded-full flex items-center justify-center vm-glow relative"
                style={{ background: 'var(--vm-gradient-primary)' }}
              >
                <span className="text-lg font-bold" style={{ color: '#FFFFFF' }}>
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </span>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full"
                     style={{ background: 'var(--vm-success-green)' }}>
                  <div className="w-2 h-2 rounded-full bg-white m-1" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate" style={{ color: 'var(--vm-primary-light)' }}>
                  {user?.email}
                </p>
                <div className="flex items-center gap-2">
                  <div className="px-2 py-0.5 rounded-full text-xs font-medium"
                       style={{ 
                         background: 'rgba(139, 92, 246, 0.1)',
                         color: 'var(--vm-secondary-purple)'
                       }}>
                    Voice Matrix User
                  </div>
                  <Activity className="h-3 w-3" style={{ color: 'var(--vm-success-green)' }} />
                </div>
              </div>
            </div>
            
            {/* Quick usage indicator */}
            {usage && (
              <div className="space-y-2 mt-3">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span style={{ color: 'var(--vm-text-muted)' }}>Minutes</span>
                    <span style={{ color: 'var(--vm-text-primary)' }}>
                      {usage.minutes.used}/{usage.minutes.limit}
                    </span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--vm-neutral-700)' }}>
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ 
                        width: `${usage.minutes.percentage}%`,
                        backgroundColor: usage.minutes.percentage >= 80 
                          ? 'var(--vm-warning-amber)' 
                          : 'var(--vm-success-green)'
                      }}
                    />
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start hover:bg-white/5"
                  onClick={() => router.push('/dashboard/settings')}
                >
                  <Settings className="mr-2 h-3 w-3" />
                  <span className="text-xs">Account Settings</span>
                </Button>
              </div>
            )}
          </div>
          
          <button 
            className="vm-button-primary w-full flex items-center justify-center gap-2 hover:transform hover:scale-105"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            <span className="font-semibold">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Revolutionary Main Content */}
      <div className="lg:pl-80">
        {/* Futuristic Top Bar */}
        <header 
          className="sticky top-0 z-30 flex h-16 items-center gap-4 px-6 backdrop-blur-xl"
          style={{ 
            background: 'rgba(26, 21, 38, 0.95)',
            borderBottom: '1px solid var(--vm-border-default)'
          }}
        >
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden hover:bg-white/10"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" style={{ color: 'var(--vm-primary-light)' }} />
          </Button>
          
          {/* System Status */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="h-2 w-2 rounded-full" style={{ background: 'var(--vm-success-green)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--vm-neutral-400)' }}>System Online</span>
          </div>
        </header>

        {/* Usage Warning Banner */}
        <UsageWarningBanner />

        {/* Enhanced Page Content */}
        <main className="p-6" style={{ background: 'var(--vm-primary-dark)' }}>
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}