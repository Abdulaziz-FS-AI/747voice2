'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Mail, User, Calendar, AlertCircle, CheckCircle, Loader2, Settings, Shield } from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { motion } from 'framer-motion'
import { usePinAuth } from '@/lib/contexts/pin-auth-context'
import { authenticatedFetch, handleAuthenticatedResponse } from '@/lib/utils/client-session'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import type { ClientInfo } from '@/types/client'

interface ClientSettings {
  company_name: string
  contact_email: string
  pin_changed_at?: string
  masked_email: string
}

export default function SettingsPage() {
  const router = useRouter()
  const { client, logout, isAuthenticated, isLoading } = usePinAuth()
  const [settings, setSettings] = useState<ClientSettings | null>(null)
  const [loadingSettings, setLoadingSettings] = useState(true)

  // PIN Change Form
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmNewPin, setConfirmNewPin] = useState('')
  const [email, setEmail] = useState('')
  const [changingPin, setChangingPin] = useState(false)
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false)

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchSettings()
    }
  }, [isAuthenticated, isLoading])

  const fetchSettings = async () => {
    try {
      setLoadingSettings(true)
      const response = await authenticatedFetch('/api/auth/change-pin')
      const data = await handleAuthenticatedResponse<ClientSettings>(response)
      
      if (data) {
        setSettings(data)
        setEmail(data.contact_email) // Pre-fill email
      }
    } catch (error) {
      console.error('[Settings] Failed to fetch settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to load settings. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoadingSettings(false)
    }
  }

  const handlePinChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!currentPin || currentPin.length < 6) {
      toast({
        title: 'Validation Error',
        description: 'Please enter your current PIN (6-8 digits)',
        variant: 'destructive'
      })
      return
    }

    if (!newPin || newPin.length < 6 || newPin.length > 8) {
      toast({
        title: 'Validation Error',
        description: 'New PIN must be 6-8 digits',
        variant: 'destructive'
      })
      return
    }

    if (newPin !== confirmNewPin) {
      toast({
        title: 'Validation Error',
        description: 'New PIN and confirmation do not match',
        variant: 'destructive'
      })
      return
    }

    if (!email || !email.includes('@')) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid email address',
        variant: 'destructive'
      })
      return
    }

    try {
      setChangingPin(true)
      
      const response = await authenticatedFetch('/api/auth/change-pin', {
        method: 'POST',
        body: JSON.stringify({
          currentPin,
          newPin,
          email
        })
      })

      const result = await handleAuthenticatedResponse<any>(response)
      
      if (result) {
        setPinChangeSuccess(true)
        toast({
          title: 'PIN Changed Successfully',
          description: 'Your PIN has been updated. You will be logged out in 3 seconds.',
        })

        // Clear form
        setCurrentPin('')
        setNewPin('')
        setConfirmNewPin('')

        // Logout after 3 seconds
        setTimeout(() => {
          logout()
        }, 3000)
      }
    } catch (error: any) {
      console.error('[Settings] PIN change failed:', error)
      toast({
        title: 'PIN Change Failed',
        description: error.message || 'Failed to change PIN. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setChangingPin(false)
    }
  }

  if (isLoading || loadingSettings) {
    return (
      <DashboardLayout>
        <div className="app-main">
          <motion.div 
            className="flex items-center justify-center min-h-[60vh]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <motion.div 
                  className="w-16 h-16 rounded-full border-2 border-vm-glass-border bg-vm-gradient-glass backdrop-blur-lg"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
                <motion.div 
                  className="absolute top-1 left-1 w-14 h-14 rounded-full border-2 border-vm-primary border-t-transparent"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Settings className="w-6 h-6 text-vm-primary vm-animate-pulse-slow" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <motion.h3 
                  className="vm-text-lg font-semibold vm-text-bright"
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Loading Settings
                </motion.h3>
                <p className="vm-text-small vm-subheading-contrast">
                  Fetching your account information...
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="app-main">
        <div className="space-y-8">
          {/* Premium Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
          >
            <div className="space-y-2">
              <motion.h1 
                className="vm-display-large vm-text-gradient vm-heading-contrast"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                Account Settings
              </motion.h1>
              <motion.p 
                className="vm-text-lead vm-text-bright max-w-2xl"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                Manage your account preferences and security settings
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <Button
                variant="secondary"
                size="lg"
                onClick={() => router.push('/dashboard')}
                leftIcon={<Settings className="h-5 w-5" />}
                asMotion
                motionProps={{
                  whileHover: { scale: 1.02, y: -2 },
                  whileTap: { scale: 0.98 },
                }}
                className="vm-hover-glow"
              >
                Back to Dashboard
              </Button>
            </motion.div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Account Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <Card className="vm-card backdrop-blur-lg border border-vm-glass-border bg-vm-gradient-glass h-full">
                <CardHeader className="pb-6">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-vm-primary/10 border border-vm-primary/20 rounded-xl">
                      <User className="h-6 w-6 text-vm-primary" />
                    </div>
                    <div>
                      <CardTitle className="vm-heading-contrast">Account Information</CardTitle>
                      <p className="vm-text-small vm-subheading-contrast">Your account details</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="vm-text-muted text-sm font-medium">Company Name</Label>
                    <div className="mt-2 p-4 bg-vm-surface-elevated rounded-xl border border-vm-border">
                      <p className="vm-text-bright font-medium">{settings?.company_name || client?.company_name}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="vm-text-muted text-sm font-medium">Contact Email</Label>
                    <div className="mt-2 p-4 bg-vm-surface-elevated rounded-xl border border-vm-border">
                      <p className="vm-text-bright font-medium">{settings?.contact_email}</p>
                    </div>
                  </div>

                  {settings?.pin_changed_at && (
                    <div>
                      <Label className="vm-text-muted text-sm font-medium">Last PIN Change</Label>
                      <div className="mt-2 p-4 bg-vm-surface-elevated rounded-xl border border-vm-border flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-vm-accent" />
                        <p className="vm-text-bright font-medium">
                          {new Date(settings.pin_changed_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* PIN Change */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <Card className="vm-card backdrop-blur-lg border border-vm-glass-border bg-vm-gradient-glass h-full">
                <CardHeader className="pb-6">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-vm-destructive/10 border border-vm-destructive/20 rounded-xl">
                      <Lock className="h-6 w-6 text-vm-destructive" />
                    </div>
                    <div>
                      <CardTitle className="vm-heading-contrast">Change PIN</CardTitle>
                      <p className="vm-text-small vm-subheading-contrast">Update your security PIN</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {pinChangeSuccess ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-12"
                    >
                      <div className="relative mb-6">
                        <div className="absolute inset-0 bg-gradient-to-br from-vm-success/20 via-vm-accent/10 to-transparent rounded-full blur-2xl" />
                        <div className="relative w-20 h-20 mx-auto rounded-full bg-vm-gradient-glass border border-vm-success/30 backdrop-blur-lg flex items-center justify-center">
                          <CheckCircle className="h-10 w-10 text-vm-success" />
                        </div>
                      </div>
                      <h3 className="vm-text-lg font-semibold vm-text-bright mb-2">PIN Changed Successfully</h3>
                      <p className="vm-text-body vm-subheading-contrast">You will be logged out shortly to use your new PIN.</p>
                    </motion.div>
                  ) : (
                    <form onSubmit={handlePinChange} className="space-y-6">
                      <div>
                        <Label htmlFor="currentPin" className="vm-text-muted text-sm font-medium">
                          Current PIN
                        </Label>
                        <Input
                          id="currentPin"
                          type="password"
                          placeholder="Enter current PIN"
                          value={currentPin}
                          onChange={(e) => setCurrentPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
                          maxLength={8}
                          className="mt-2 bg-vm-surface-elevated border-vm-border vm-text-bright"
                          disabled={changingPin}
                        />
                      </div>

                      <div>
                        <Label htmlFor="newPin" className="vm-text-muted text-sm font-medium">
                          New PIN (6-8 digits)
                        </Label>
                        <Input
                          id="newPin"
                          type="password"
                          placeholder="Enter new PIN"
                          value={newPin}
                          onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
                          maxLength={8}
                          className="mt-2 bg-vm-surface-elevated border-vm-border vm-text-bright"
                          disabled={changingPin}
                        />
                      </div>

                      <div>
                        <Label htmlFor="confirmNewPin" className="vm-text-muted text-sm font-medium">
                          Confirm New PIN
                        </Label>
                        <Input
                          id="confirmNewPin"
                          type="password"
                          placeholder="Confirm new PIN"
                          value={confirmNewPin}
                          onChange={(e) => setConfirmNewPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
                          maxLength={8}
                          className="mt-2 bg-vm-surface-elevated border-vm-border vm-text-bright"
                          disabled={changingPin}
                        />
                      </div>

                      <div>
                        <Label htmlFor="email" className="vm-text-muted text-sm font-medium">
                          Email Verification
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter your email for verification"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="mt-2 bg-vm-surface-elevated border-vm-border vm-text-bright"
                          disabled={changingPin}
                        />
                        <p className="text-xs vm-text-muted mt-2">
                          Must match your account email: {settings?.masked_email}
                        </p>
                      </div>

                      <Card className="border border-vm-warning/30 bg-vm-warning/5 backdrop-blur-lg">
                        <CardContent className="p-4">
                          <div className="flex gap-3">
                            <AlertCircle className="h-5 w-5 text-vm-warning flex-shrink-0 mt-0.5" />
                            <div className="space-y-2">
                              <p className="vm-text-small font-medium text-vm-warning">Important:</p>
                              <ul className="vm-text-small vm-text-bright space-y-1 ml-4">
                                <li className="list-disc">You will be logged out after changing your PIN</li>
                                <li className="list-disc">Use your new PIN to log back in</li>
                                <li className="list-disc">Make sure to remember your new PIN</li>
                              </ul>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={changingPin}
                        variant="primary"
                        size="lg"
                        asMotion
                        motionProps={{
                          whileHover: { scale: 1.02 },
                          whileTap: { scale: 0.98 },
                        }}
                      >
                        {changingPin ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Changing PIN...
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4 mr-2" />
                            Change PIN
                          </>
                        )}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Contact Support */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            <Card className="vm-card border border-vm-accent/30 bg-vm-gradient-glass backdrop-blur-lg">
              <CardContent className="p-8">
                <div className="flex gap-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-vm-accent/10 border border-vm-accent/20 rounded-xl flex-shrink-0">
                    <Mail className="h-6 w-6 text-vm-accent" />
                  </div>
                  <div className="space-y-4 flex-1">
                    <div>
                      <h3 className="vm-text-lg font-semibold text-vm-accent">Need Help?</h3>
                      <p className="vm-text-body vm-text-bright leading-relaxed mt-2">
                        If you're having trouble with your account or need assistance with your assistants,
                        please contact your administrator for support.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="secondary"
                        onClick={() => router.push('/dashboard')}
                        asMotion
                        motionProps={{
                          whileHover: { scale: 1.02 },
                          whileTap: { scale: 0.98 },
                        }}
                      >
                        Back to Dashboard
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={logout}
                        leftIcon={<Shield className="h-4 w-4" />}
                        asMotion
                        motionProps={{
                          whileHover: { scale: 1.02 },
                          whileTap: { scale: 0.98 },
                        }}
                      >
                        Logout
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  )
}