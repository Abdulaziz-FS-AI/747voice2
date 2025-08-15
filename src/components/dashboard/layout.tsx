'use client'

import { ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { usePinAuth } from '@/lib/contexts/pin-auth-context'
// Subscription context removed - demo system only
import { 
  LayoutDashboard, 
  Users, 
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
  { name: 'AI Assistants', href: '/dashboard/assistants', icon: Mic, description: 'Your Voice AI Assistants' },
  { name: 'Analytics', href: '/dashboard/analytics', icon: Activity, description: 'Performance Insights' },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings, description: 'Account Settings' },
]

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { client, logout } = usePinAuth()
  // Demo system: No usage tracking needed
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleSignOut = () => {
    try {
      logout()
      // Redirect to home page instead of signin to avoid 404
      window.location.href = '/'
    } catch (error) {
      console.error('Sign out error:', error)
      // Even if logout fails, redirect to home page
      window.location.href = '/'
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--vm-color-background)' }}>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'var(--vm-color-background) / 0.8' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Revolutionary Sidebar */}
      <div className={cn(
        "fixed inset-y-0 z-50 flex w-80 flex-col transition-transform lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )} style={{ 
        background: 'var(--vm-color-glass)',
        borderRight: '1px solid var(--vm-color-glass-border)',
        backdropFilter: 'blur(var(--vm-blur-xl))'
      }}>
        
        {/* Premium Logo Section */}
        <div className="flex h-20 items-center justify-between px-6" style={{ borderBottom: '1px solid var(--vm-color-glass-border)' }}>
          <div className="flex items-center gap-3">
            {/* Voice Matrix Logo */}
            <div className="relative">
              <div 
                className="h-12 w-12 rounded-full flex items-center justify-center shadow-xl"
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
              >
                <Mic className="h-7 w-7 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center animate-pulse"
                   style={{ background: '#10b981' }}>
                <Zap className="h-2.5 w-2.5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-wide bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Voice Matrix</h1>
              <p className="text-xs font-medium text-gray-400">AI Intelligence Platform</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden hover:bg-white/10"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" style={{ color: 'var(--vm-color-foreground)' }} />
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
                      ? "text-white shadow-lg" 
                      : "hover:bg-gray-800/50 hover:transform hover:scale-[1.02]"
                  )}
                  style={{
                    background: isActive ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                    border: isActive ? 'none' : '1px solid transparent',
                  }}
                  onClick={() => {
                    router.push(item.href)
                    setSidebarOpen(false)
                  }}
                >
                  <div className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-lg transition-all",
                    isActive ? "bg-white/20" : "bg-gray-800/50 group-hover:bg-gray-700/50"
                  )}>
                    <item.icon className={cn(
                      "h-5 w-5 transition-all",
                      isActive ? "text-white" : "text-purple-400 group-hover:scale-110 group-hover:text-purple-300"
                    )} />
                  </div>
                  <div className="flex-1">
                    <div className={cn(
                      "font-semibold text-sm",
                      isActive ? "text-white" : "text-gray-200"
                    )}>
                      {item.name}
                    </div>
                    <div className={cn(
                      "text-xs",
                      isActive ? "text-white/80" : "text-gray-500"
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
        <div className="p-4" style={{ borderTop: '1px solid var(--vm-color-glass-border)' }}>
          <div className="vm-card p-4 mb-3">
            <div className="flex items-center gap-3 mb-3">
              <div 
                className="h-12 w-12 rounded-full flex items-center justify-center vm-glow relative"
                style={{ background: 'var(--vm-gradient-primary)' }}
              >
                <span className="text-lg font-bold" style={{ color: '#FFFFFF' }}>
                  {client?.company_name?.[0]?.toUpperCase() || 'C'}
                </span>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full"
                     style={{ background: 'var(--vm-color-success)' }}>
                  <div className="w-2 h-2 rounded-full bg-white m-1" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate" style={{ color: 'var(--vm-color-foreground)' }}>
                  {client?.company_name}
                </p>
                <div className="flex items-center gap-2">
                  <div className="px-2 py-0.5 rounded-full text-xs font-medium"
                       style={{ 
                         background: 'var(--vm-color-accent) / 0.1',
                         color: 'var(--vm-color-accent)'
                       }}>
                    Voice Matrix User
                  </div>
                  <Activity className="h-3 w-3" style={{ color: 'var(--vm-color-success)' }} />
                </div>
              </div>
            </div>
            
            {/* Demo account info */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start hover:bg-white/5 mt-3"
              onClick={() => router.push('/dashboard/settings')}
            >
              <Settings className="mr-2 h-3 w-3" />
              <span className="text-xs">Account Settings</span>
            </Button>
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
            background: 'var(--vm-color-glass)',
            borderBottom: '1px solid var(--vm-color-glass-border)'
          }}
        >
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden hover:bg-white/10"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" style={{ color: 'var(--vm-color-foreground)' }} />
          </Button>
          
          {/* System Status */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="h-2 w-2 rounded-full" style={{ background: 'var(--vm-color-success)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--vm-color-muted)' }}>System Online</span>
          </div>
        </header>

        {/* Usage Warning Banner */}
        <UsageWarningBanner />

        {/* Enhanced Page Content */}
        <main className="p-6" style={{ background: 'var(--vm-color-background)' }}>
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}