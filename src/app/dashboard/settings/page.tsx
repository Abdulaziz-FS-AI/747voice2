'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Settings, User, Bell, Database, Shield } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardLayout } from '@/components/dashboard/layout'
import { Badge } from '@/components/ui/badge'

export default function SettingsPage() {
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
  }, [user, router])

  if (!user) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account and application preferences
            </p>
          </div>
        </div>

        {/* Settings Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Account Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Settings
              </CardTitle>
              <CardDescription>
                Manage your profile and account preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{user.email}</span>
                  <Badge variant="secondary">Verified</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Plan</label>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pro Plan</span>
                  <Badge>Active</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                Configure how you want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Call Alerts</div>
                  <div className="text-sm text-muted-foreground">Get notified of incoming calls</div>
                </div>
                <Badge variant="outline">Enabled</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Weekly Reports</div>
                  <div className="text-sm text-muted-foreground">Analytics summary emails</div>
                </div>
                <Badge variant="outline">Enabled</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Data & Privacy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Data & Privacy
              </CardTitle>
              <CardDescription>
                Control your data and privacy settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Data Retention</div>
                  <div className="text-sm text-muted-foreground">How long we keep your call data</div>
                </div>
                <Badge variant="outline">90 days</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Analytics Tracking</div>
                  <div className="text-sm text-muted-foreground">Allow usage analytics collection</div>
                </div>
                <Badge variant="outline">Enabled</Badge>
              </div>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                System Status
              </CardTitle>
              <CardDescription>
                Current system health and connectivity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Database</div>
                  <div className="text-sm text-muted-foreground">Connection status</div>
                </div>
                <Badge className="bg-green-500 hover:bg-green-600">Online</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">VAPI Integration</div>
                  <div className="text-sm text-muted-foreground">Voice AI service status</div>
                </div>
                <Badge className="bg-green-500 hover:bg-green-600">Connected</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Webhooks</div>
                  <div className="text-sm text-muted-foreground">Event processing status</div>
                </div>
                <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coming Soon Features */}
        <Card>
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
            <CardDescription>
              Features we're working on to enhance your experience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 border rounded-lg">
                <div className="font-medium mb-2">Advanced Analytics</div>
                <div className="text-sm text-muted-foreground">
                  Detailed conversation insights and performance metrics
                </div>
                <Badge variant="secondary" className="mt-2">Coming Soon</Badge>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="font-medium mb-2">Team Management</div>
                <div className="text-sm text-muted-foreground">
                  Collaborate with team members and manage permissions
                </div>
                <Badge variant="secondary" className="mt-2">Coming Soon</Badge>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="font-medium mb-2">Custom Integrations</div>
                <div className="text-sm text-muted-foreground">
                  Connect with your favorite CRM and business tools
                </div>
                <Badge variant="secondary" className="mt-2">Coming Soon</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}