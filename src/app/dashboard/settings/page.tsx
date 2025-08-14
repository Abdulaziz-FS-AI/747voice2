'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Mail, User, Calendar, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { motion } from 'framer-motion'
import { usePinAuth } from '@/lib/contexts/pin-auth-context'
import { authenticatedFetch, handleAuthenticatedResponse } from '@/lib/utils/client-session'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
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
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-600">Manage your account preferences and security</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Account Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Account Information</h2>
                <p className="text-sm text-gray-600">Your account details</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Company Name</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md border">
                  <p className="text-gray-900">{settings?.company_name || client?.company_name}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Contact Email</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md border">
                  <p className="text-gray-900">{settings?.contact_email}</p>
                </div>
              </div>

              {settings?.pin_changed_at && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">Last PIN Change</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md border flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900">
                      {new Date(settings.pin_changed_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* PIN Change */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-red-100 rounded-lg">
                <Lock className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Change PIN</h2>
                <p className="text-sm text-gray-600">Update your security PIN</p>
              </div>
            </div>

            {pinChangeSuccess ? (
              <div className="text-center py-8">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">PIN Changed Successfully</h3>
                <p className="text-sm text-gray-600">You will be logged out shortly to use your new PIN.</p>
              </div>
            ) : (
              <form onSubmit={handlePinChange} className="space-y-4">
                <div>
                  <Label htmlFor="currentPin" className="text-sm font-medium text-gray-700">
                    Current PIN
                  </Label>
                  <Input
                    id="currentPin"
                    type="password"
                    placeholder="Enter current PIN"
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
                    maxLength={8}
                    className="mt-1"
                    disabled={changingPin}
                  />
                </div>

                <div>
                  <Label htmlFor="newPin" className="text-sm font-medium text-gray-700">
                    New PIN (6-8 digits)
                  </Label>
                  <Input
                    id="newPin"
                    type="password"
                    placeholder="Enter new PIN"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
                    maxLength={8}
                    className="mt-1"
                    disabled={changingPin}
                  />
                </div>

                <div>
                  <Label htmlFor="confirmNewPin" className="text-sm font-medium text-gray-700">
                    Confirm New PIN
                  </Label>
                  <Input
                    id="confirmNewPin"
                    type="password"
                    placeholder="Confirm new PIN"
                    value={confirmNewPin}
                    onChange={(e) => setConfirmNewPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
                    maxLength={8}
                    className="mt-1"
                    disabled={changingPin}
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email Verification
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email for verification"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1"
                    disabled={changingPin}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Must match your account email: {settings?.masked_email}
                  </p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">Important:</p>
                      <ul className="mt-1 list-disc list-inside space-y-1">
                        <li>You will be logged out after changing your PIN</li>
                        <li>Use your new PIN to log back in</li>
                        <li>Make sure to remember your new PIN</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={changingPin}
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
          </motion.div>
        </div>

        {/* Contact Support */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-50 rounded-lg p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Mail className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Need Help?</h3>
          </div>
          <p className="text-gray-600 mb-4">
            If you're having trouble with your account or need assistance with your assistants,
            please contact your administrator.
          </p>
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
            >
              Back to Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={logout}
            >
              Logout
            </Button>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}