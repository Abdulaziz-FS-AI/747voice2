import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Bot, 
  Home, 
  Phone, 
  Users, 
  BarChart3, 
  Settings, 
  Menu
} from 'lucide-react'

const sidebarNavItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home
  },
  {
    title: 'Assistants',
    href: '/assistants',
    icon: Bot
  },
  {
    title: 'Calls',
    href: '/calls',
    icon: Phone
  },
  {
    title: 'Leads',
    href: '/leads',
    icon: Users
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: BarChart3
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings
  }
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden w-64 overflow-y-auto border-r bg-background md:block">
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center border-b px-4">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <Bot className="h-6 w-6" />
              <span>Voice Matrix</span>
            </Link>
          </div>
          <ScrollArea className="flex-1 px-3">
            <div className="space-y-1 py-4">
              {sidebarNavItems.map((item) => (
                <Button
                  key={item.href}
                  asChild
                  variant="ghost"
                  className="w-full justify-start"
                >
                  <Link href={item.href}>
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.title}
                  </Link>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 md:hidden">
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
          <div className="flex-1">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <Bot className="h-5 w-5" />
              <span>Voice Matrix</span>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-muted/10">
          {children}
        </main>
      </div>
    </div>
  )
}