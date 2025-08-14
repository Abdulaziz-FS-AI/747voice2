'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePinAuth } from '@/lib/contexts/pin-auth-context'
import { Settings, Search, Brain, Zap, Activity, Lock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DashboardLayout } from '@/components/dashboard/layout'
import { AssistantCard } from '@/components/dashboard/assistant-card'
import { toast } from '@/hooks/use-toast'
import { motion } from 'framer-motion'
import { authenticatedFetch, handleAuthenticatedResponse } from '@/lib/utils/client-session'
import type { ClientAssistant } from '@/types/client'


export default function AssistantsPage() {
  const router = useRouter()
  const { client, isAuthenticated, isLoading } = usePinAuth()
  const [assistants, setAssistants] = useState<ClientAssistant[]>([])
  const [filteredAssistants, setFilteredAssistants] = useState<ClientAssistant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchAssistants()
    }
  }, [isAuthenticated, isLoading])

  useEffect(() => {
    filterAssistants()
  }, [assistants, searchQuery])

  const fetchAssistants = async () => {
    try {
      setLoading(true)
      
      const response = await authenticatedFetch('/api/assistants')
      const data = await handleAuthenticatedResponse<ClientAssistant[]>(response)
      
      if (data) {
        setAssistants(data)
      }
    } catch (error) {
      console.error('[Assistants] Failed to fetch assistants:', error)
      toast({
        title: 'Error',
        description: 'Failed to load assistants. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const filterAssistants = () => {
    let filtered = assistants

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(assistant =>
        assistant.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assistant.vapi_assistant_id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Only show active assistants
    filtered = filtered.filter(assistant => assistant.is_active)

    setFilteredAssistants(filtered)
  }

  const handleAssistantClick = (assistant: ClientAssistant) => {
    router.push(`/dashboard/assistants/${assistant.id}`)
  }
  if (isLoading || loading) {
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Your Assistants</h1>
            <p className="text-gray-600">View and manage your assigned AI voice assistants</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/settings')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search assistants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Assistants Grid */}
        <div>
          {filteredAssistants.length === 0 ? (
            <div className="text-center py-12">
              <Brain className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {assistants.length === 0 ? 'No assistants assigned' : 'No assistants found'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {assistants.length === 0 
                  ? 'Your administrator will assign assistants to your account.'
                  : 'Try adjusting your search query.'
                }
              </p>
              {assistants.length === 0 && (
                <p className="mt-2 text-xs text-gray-400">
                  Contact your administrator if you need assistance.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAssistants.map((assistant, index) => (
                <motion.div
                  key={assistant.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleAssistantClick(assistant)}
                  className="cursor-pointer"
                >
                  <AssistantCard assistant={assistant} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}