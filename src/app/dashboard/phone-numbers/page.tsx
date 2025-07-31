'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Plus, Phone, MoreVertical, Edit, Trash2, Users, PhoneCall, Clock, TrendingUp, RefreshCw, RotateCcw } from 'lucide-react'
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
import { EditPhoneNumberModal } from '@/components/phone-numbers/edit-phone-number-modal'
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
  activeNumbers: number
  totalCalls: number
  totalMinutes: number
}

export default function PhoneNumbersPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([])
  const [stats, setStats] = useState<PhoneNumberStats>({
    totalNumbers: 0,
    activeNumbers: 0,
    totalCalls: 0,
    totalMinutes: 0
  })
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingNumber, setEditingNumber] = useState<PhoneNumber | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [syncing, setSyncing] = useState(false)

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
    const stats = numbers.reduce((acc, number) => {
      acc.totalNumbers += 1
      if (number.is_active) acc.activeNumbers += 1
      acc.totalCalls += number.total_calls || 0
      acc.totalMinutes += number.total_minutes || 0
      return acc
    }, {
      totalNumbers: 0,
      activeNumbers: 0,
      totalCalls: 0,
      totalMinutes: 0
    })
    
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

      if (response.ok) {
        setPhoneNumbers(prev => prev.filter(n => n.id !== numberId))
        toast({
          title: 'Success',
          description: 'Phone number deleted successfully'
        })
      } else {
        throw new Error('Failed to delete')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete phone number',
        variant: 'destructive'
      })
    }
  }

  const handleToggleActive = async (numberId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/phone-numbers/${numberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive })
      })

      if (response.ok) {
        setPhoneNumbers(prev => 
          prev.map(n => n.id === numberId ? { ...n, is_active: !isActive } : n)
        )
        toast({
          title: 'Success',
          description: `Phone number ${!isActive ? 'activated' : 'deactivated'}`
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update phone number',
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

  const handleEditNumber = (number: PhoneNumber) => {
    setEditingNumber(number)
    setShowEditModal(true)
  }

  const handleNumberUpdated = (updatedNumber: PhoneNumber) => {
    setPhoneNumbers(prev => 
      prev.map(n => n.id === updatedNumber.id ? updatedNumber : n)
    )
    setShowEditModal(false)
    setEditingNumber(null)
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/sync', {
        method: 'POST'
      })
      const data = await response.json()
      
      if (data.success) {
        // Refresh data after sync
        await fetchPhoneNumbers(false)
        toast({
          title: 'Sync Complete',
          description: data.message
        })
      } else {
        throw new Error(data.error?.message || 'Sync failed')
      }
    } catch (error) {
      toast({
        title: 'Sync Error',
        description: error instanceof Error ? error.message : 'Failed to sync with VAPI',
        variant: 'destructive'
      })
    } finally {
      setSyncing(false)
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
              onClick={() => fetchPhoneNumbers(true)}
              disabled={refreshing || syncing}
              size="lg"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button 
              variant="outline"
              onClick={handleSync}
              disabled={refreshing || syncing}
              size="lg"
            >
              <RotateCcw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync VAPI'}
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Numbers"
            value={stats.totalNumbers}
            icon={Phone}
            loading={loading}
          />
          <StatsCard
            title="Active Numbers"
            value={stats.activeNumbers}
            icon={PhoneCall}
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
                    <TableHead>Status</TableHead>
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
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={number.is_active ? "default" : "secondary"}
                            className={number.is_active ? "bg-green-500" : ""}
                          >
                            {number.is_active ? "Active" : "Inactive"}
                          </Badge>
                          {number.is_verified && (
                            <Badge variant="outline" className="text-xs">
                              Verified
                            </Badge>
                          )}
                        </div>
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
                          <div>{number.total_calls || 0} calls</div>
                          <div className="text-muted-foreground">
                            {number.total_minutes || 0} min
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {number.last_call_at ? (
                          <span className="text-sm text-muted-foreground">
                            {new Date(number.last_call_at).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Never</span>
                        )}
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
                              onClick={() => handleToggleActive(number.id, number.is_active)}
                            >
                              {number.is_active ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleEditNumber(number)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
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

        {/* Edit Phone Number Modal */}
        <EditPhoneNumberModal
          open={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setEditingNumber(null)
          }}
          phoneNumber={editingNumber}
          onSuccess={handleNumberUpdated}
        />
      </div>
    </DashboardLayout>
  )
}