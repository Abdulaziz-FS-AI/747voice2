'use client'

import { useState, useEffect } from 'react'
import { createClientSupabaseClient } from '@/lib/supabase'
import { debugUserProfile, ensureUserProfile } from '@/lib/profile-utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, RefreshCw, UserPlus } from 'lucide-react'

export default function ProfileDebugPage() {
  const [loading, setLoading] = useState(true)
  const [profileData, setProfileData] = useState<any>(null)
  const [creating, setCreating] = useState(false)
  const supabase = createClientSupabaseClient()

  const loadProfileData = async () => {
    setLoading(true)
    const data = await debugUserProfile()
    setProfileData(data)
    setLoading(false)
  }

  const createProfile = async () => {
    if (!profileData?.user?.id) return
    
    setCreating(true)
    const result = await ensureUserProfile(profileData.user.id)
    console.log('Profile creation result:', result)
    
    // Reload data
    await loadProfileData()
    setCreating(false)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/signin'
  }

  useEffect(() => {
    loadProfileData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading profile data...
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Profile Debug Information
              <div className="flex gap-2">
                <Button
                  onClick={loadProfileData}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button
                  onClick={signOut}
                  variant="destructive"
                  size="sm"
                >
                  Sign Out
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!profileData?.authenticated ? (
              <div className="text-center py-8">
                <p className="text-red-500 mb-4">Not authenticated</p>
                <Button onClick={() => window.location.href = '/signin'}>
                  Go to Sign In
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* User Info */}
                <div>
                  <h3 className="font-semibold mb-2">Auth User</h3>
                  <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
                    {JSON.stringify(profileData.user, null, 2)}
                  </pre>
                </div>

                {/* Profile Info */}
                <div>
                  <h3 className="font-semibold mb-2 flex items-center justify-between">
                    Profile
                    {!profileData.profile && (
                      <Button
                        onClick={createProfile}
                        size="sm"
                        disabled={creating}
                      >
                        {creating ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <UserPlus className="h-4 w-4 mr-2" />
                        )}
                        Create Profile
                      </Button>
                    )}
                  </h3>
                  {profileData.profile ? (
                    <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
                      {JSON.stringify(profileData.profile, null, 2)}
                    </pre>
                  ) : (
                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                      <p className="text-red-600">No profile found!</p>
                      {profileData.profileError && (
                        <p className="text-sm mt-2">
                          Error: {JSON.stringify(profileData.profileError)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Quick Actions</h3>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={() => window.location.href = '/dashboard'}
                      variant="outline"
                      size="sm"
                    >
                      Go to Dashboard
                    </Button>
                    <Button
                      onClick={() => window.location.href = '/signup?step=plan'}
                      variant="outline"
                      size="sm"
                    >
                      Go to Plan Selection
                    </Button>
                    <Button
                      onClick={async () => {
                        const response = await fetch('/api/debug/profile')
                        const data = await response.json()
                        console.log('API Debug:', data)
                        alert('Check console for API debug data')
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Test API Debug
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}