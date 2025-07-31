'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Plus, Phone, MoreVertical, Trash2, Users, Clock, TrendingUp, RefreshCw } from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DashboardLayout } from '@/components/dashboard/layout'
import { AddPhoneNumberModal } from '@/components/phone-numbers/add-phone-number-modal'
import { StatsCard } from '@/components/dashboard/stats-card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/hooks/use-toast'
import type { Database } from '@/types/database-simplified'

type PhoneNumber = Database['public']['Tables']['user_phone_numbers']['Row'] & {
  user_assistants?: {
    id: string
    name: string
  } | null
}

interface PhoneNumberStats {
  totalNumbers: number
  totalCalls: number
  totalMinutes: number
}

export default function PhoneNumbersPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([])
  const [stats, setStats] = useState<PhoneNumberStats>({
    totalNumbers: 0,
    totalCalls: 0,
    totalMinutes: 0
  })
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    fetchPhoneNumbers()
  }, [user])

  const fetchPhoneNumbers = async (showRefreshingState = false) => {
    if (showRefreshingState) {
      setRefreshing(true)
    }
    
    try {
      const response = await fetch('/api/phone-numbers', {
        cache: 'no-store', // Force fresh data
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      const data = await response.json()
      
      if (data.success) {
        setPhoneNumbers(data.data || [])
        calculateStats(data.data || [])
        
        if (showRefreshingState) {
          toast({
            title: 'Refreshed',
            description: 'Phone numbers updated successfully'
          })
        }
      }
    } catch (error) {
      console.error('Failed to fetch phone numbers:', error)
      toast({
        title: 'Error',
        description: 'Failed to load phone numbers',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
      if (showRefreshingState) {
        setRefreshing(false)
      }
    }
  }

  const calculateStats = (numbers: PhoneNumber[]) => {
    const stats = {
      totalNumbers: numbers.length,
      // Note: total_calls and total_minutes would need to be fetched from calls table
      // For now, setting to 0 until we implement call aggregation
      totalCalls: 0,
      totalMinutes: 0
    }
    
    setStats(stats)
  }

  const handleDeleteNumber = async (numberId: string) => {
    if (!confirm('Are you sure you want to delete this phone number? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/phone-numbers/${numberId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setPhoneNumbers(prev => prev.filter(n => n.id !== numberId))
        toast({
          title: 'Success',
          description: data.message || 'Phone number deleted successfully'
        })
      } else {
        throw new Error(data.error?.message || `HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Delete phone number error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete phone number',
        variant: 'destructive'
      })
    }
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

  const getProviderBadge = (provider: string | null | undefined) => {
    switch (provider) {
      case 'testing':
        return <Badge variant="secondary">Testing</Badge>
      case 'twilio':
        return <Badge variant="default">Twilio</Badge>
      case 'vapi':
        return <Badge variant="outline">Vapi</Badge>
      case null:
      case undefined:
        return <Badge variant="secondary">Unknown</Badge>
      default:
        return <Badge variant="secondary">{provider}</Badge>
    }
  }

  const handleNumberAdded = (newNumber: PhoneNumber) => {
    setPhoneNumbers(prev => [newNumber, ...prev])
    setShowAddModal(false)
    toast({
      title: 'Success',
      description: 'Phone number added successfully'
    })
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const response = await fetch('/api/sync', {
        method: 'POST'
      })
      const data = await response.json()
      
      if (data.success) {
        // Refresh phone numbers list
        await fetchPhoneNumbers(false)
        
        // Show sync results
        const details = data.data
        let description = data.message
        
        if (details.phoneNumbers.details.length > 0) {
          description += '\n\nUpdated:'
          details.phoneNumbers.details.forEach((item: any) => {
            description += `\n• ${item.number} - ${item.action}`
          })
        }
        
        toast({
          title: 'Refreshed',
          description: description
        })
      } else {
        throw new Error(data.error?.message || 'Refresh failed')
      }
    } catch (error) {
      toast({
        title: 'Refresh Error',
        description: error instanceof Error ? error.message : 'Failed to refresh phone numbers',
        variant: 'destructive'
      })
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Phone Numbers</h1>
            <p className="text-muted-foreground mt-1">
              Manage your phone numbers and connect them to assistants
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              size="lg"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button 
              onClick={() => setShowAddModal(true)}
              size="lg"
            >
              <Plus className="mr-2 h-5 w-5" />
              Add Number
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatsCard
            title="Total Numbers"
            value={stats.totalNumbers}
            icon={Phone}
            loading={loading}
          />
          <StatsCard
            title="Total Calls"
            value={stats.totalCalls}
            icon={TrendingUp}
            loading={loading}
          />
          <StatsCard
            title="Total Minutes"
            value={stats.totalMinutes}
            icon={Clock}
            loading={loading}
          />
        </div>

        {/* Phone Numbers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Your Phone Numbers</CardTitle>
            <CardDescription>
              Phone numbers connected to your Voice Matrix account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : phoneNumbers.length === 0 ? (
              // Empty State
              <div className="text-center py-12">
                <Phone className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No phone numbers yet</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Add your first phone number to start receiving calls through your AI assistants.
                </p>
                <div className="space-y-4">
                  <Button onClick={() => setShowAddModal(true)} size="lg">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Number
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    <p>💡 <strong>Testing Mode:</strong> Add numbers for testing without external providers</p>
                    <p>🔗 <strong>Production:</strong> Connect Twilio numbers for real phone calls</p>
                  </div>
                </div>
              </div>
            ) : (
              // Numbers Table
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Assistant</TableHead>
                    <TableHead>Calls</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead className="w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {phoneNumbers.map((number) => (
                    <TableRow key={number.id}>
                      <TableCell className="font-medium">
                        {number.friendly_name}
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatPhoneNumber(number.phone_number)}
                      </TableCell>
                      <TableCell>
                        {getProviderBadge(number.provider)}
                      </TableCell>
                      <TableCell>
                        {number.user_assistants ? (
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{number.user_assistants.name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>0 calls</div>
                          <div className="text-muted-foreground">
                            0 min
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">Never</span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => handleDeleteNumber(number.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Add Phone Number Modal */}
        <AddPhoneNumberModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleNumberAdded}
        />

      </div>
    </DashboardLayout>
  )
}