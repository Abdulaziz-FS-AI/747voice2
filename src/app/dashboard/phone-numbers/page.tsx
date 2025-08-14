'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePinAuth } from '@/lib/contexts/pin-auth-context'
import { Phone, Settings, Brain, AlertCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DashboardLayout } from '@/components/dashboard/layout'
import { toast } from '@/hooks/use-toast'
import { motion } from 'framer-motion'
import { authenticatedFetch, handleAuthenticatedResponse } from '@/lib/utils/client-session'
import type { ClientPhoneNumber } from '@/types/client'

interface PhoneNumberStats {
  totalNumbers: number
  activeNumbers: number
  totalCalls: number
  totalMinutes: number
}

export default function PhoneNumbersPage() {
  const router = useRouter()
  const { client, isAuthenticated, isLoading } = usePinAuth()
  const [phoneNumbers, setPhoneNumbers] = useState<ClientPhoneNumber[]>([])
  const [stats, setStats] = useState<PhoneNumberStats>({
    totalNumbers: 0,
    activeNumbers: 0,
    totalCalls: 0,
    totalMinutes: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchPhoneNumbers()
    }
  }, [isAuthenticated, isLoading])

  const fetchPhoneNumbers = async () => {
    try {
      setLoading(true)
      
      const response = await authenticatedFetch('/api/phone-numbers')
      const data = await handleAuthenticatedResponse<ClientPhoneNumber[]>(response)
      
      if (data) {
        setPhoneNumbers(data)
        calculateStats(data)
      }
    } catch (error) {
      console.error('[Phone Numbers] Failed to fetch phone numbers:', error)
      toast({
        title: 'Error',
        description: 'Failed to load phone numbers. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (numbers: ClientPhoneNumber[]) => {
    const activeNumbers = numbers.filter(n => n.is_active)
    
    setStats({
      totalNumbers: numbers.length,
      activeNumbers: activeNumbers.length,
      // TODO: Fetch call stats from analytics API
      totalCalls: 0,
      totalMinutes: 0
    })
  }

  const formatPhoneNumber = (phoneNumber: string | null | undefined) => {
    if (!phoneNumber) return 'N/A'
    
    // Format US numbers as (XXX) XXX-XXXX
    if (phoneNumber.match(/^\+1\d{10}$/)) {
      const cleaned = phoneNumber.replace(/^\+1/, '')
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phoneNumber
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
            <h1 className="text-3xl font-bold text-gray-900">Phone Numbers</h1>
            <p className="text-gray-600">View your assigned phone numbers and their configurations</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/settings')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Numbers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalNumbers}</p>
              </div>
              <Phone className="h-8 w-8 text-blue-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Numbers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeNumbers}</p>
              </div>
              <Brain className="h-8 w-8 text-green-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Calls</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCalls}</p>
              </div>
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Minutes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalMinutes}</p>
              </div>
              <Phone className="h-8 w-8 text-orange-600" />
            </div>
          </motion.div>
        </div>

        {/* Phone Numbers Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Your Phone Numbers</h2>
                <p className="text-sm text-gray-600">Phone numbers assigned to your account by your administrator</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {phoneNumbers.length === 0 ? (
              <div className="text-center py-12">
                <Phone className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No phone numbers assigned</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Your administrator will assign phone numbers to your account.
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  Contact your administrator if you need phone number access.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Read-only notice */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">Administrator Managed</p>
                      <p className="mt-1">
                        Phone numbers are assigned and managed by your administrator. 
                        Contact them if you need changes to your phone number assignments.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Phone Numbers Table */}
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="font-medium text-gray-900">Phone Number</TableHead>
                        <TableHead className="font-medium text-gray-900">Friendly Name</TableHead>
                        <TableHead className="font-medium text-gray-900">Assistant</TableHead>
                        <TableHead className="font-medium text-gray-900">Status</TableHead>
                        <TableHead className="font-medium text-gray-900">Assigned Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="bg-white divide-y divide-gray-200">
                      {phoneNumbers.map((phoneNumber, index) => (
                        <motion.tr
                          key={phoneNumber.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 + index * 0.1 }}
                          className="hover:bg-gray-50"
                        >
                          <TableCell className="font-mono text-sm">
                            {formatPhoneNumber(phoneNumber.phone_number)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {phoneNumber.friendly_name || 'Unnamed Number'}
                          </TableCell>
                          <TableCell>
                            {phoneNumber.assistant_display_name ? (
                              <div className="flex items-center gap-2">
                                <Brain className="h-4 w-4 text-blue-600" />
                                <span className="text-sm">{phoneNumber.assistant_display_name}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">No assistant assigned</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={phoneNumber.is_active ? "default" : "secondary"}>
                              {phoneNumber.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {new Date(phoneNumber.assigned_at).toLocaleDateString()}
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contact Support */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gray-50 rounded-lg p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Phone className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Need Phone Number Changes?</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Phone numbers are managed by your administrator. If you need additional numbers, 
            want to change assistant assignments, or have any issues with your current numbers, 
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
              onClick={() => router.push('/dashboard/settings')}
            >
              Account Settings
            </Button>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}