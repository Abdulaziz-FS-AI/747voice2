'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Edit, Trash2, MoreVertical, Power, PowerOff } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { DashboardLayout } from '@/components/dashboard/layout'
import { EditAssistantModal } from '@/components/assistants/edit-assistant-modal'
import { DeleteAssistantModal } from '@/components/assistants/delete-assistant-modal'
import { useToast } from '@/hooks/use-toast'
import type { Database } from '@/types/database'

type Assistant = Database['public']['Tables']['assistants']['Row']

export default function AssistantsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [filteredAssistants, setFilteredAssistants] = useState<Assistant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  
  // Modal states
  const [selectedAssistant, setSelectedAssistant] = useState<Assistant | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    fetchAssistants()
  }, [user])

  useEffect(() => {
    filterAssistants()
  }, [assistants, searchQuery, statusFilter])

  const fetchAssistants = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/assistants')
      const data = await response.json()
      
      if (data.success) {
        setAssistants(data.data || [])
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch assistants',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Failed to fetch assistants:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch assistants',
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
        assistant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assistant.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assistant.agent_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(assistant => 
        statusFilter === 'active' ? assistant.is_active : !assistant.is_active
      )
    }

    setFilteredAssistants(filtered)
  }

  const handleToggleStatus = async (assistant: Assistant) => {
    try {
      const response = await fetch(`/api/assistants/${assistant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !assistant.is_active })
      })

      if (response.ok) {
        setAssistants(prev => 
          prev.map(a => a.id === assistant.id ? { ...a, is_active: !assistant.is_active } : a)
        )
        toast({
          title: 'Success',
          description: `Assistant ${assistant.is_active ? 'disabled' : 'enabled'} successfully`
        })
      } else {
        throw new Error('Failed to update assistant')
      }
    } catch (error) {
      console.error('Failed to toggle assistant:', error)
      toast({
        title: 'Error',
        description: 'Failed to update assistant status',
        variant: 'destructive'
      })
    }
  }

  const handleEdit = (assistant: Assistant) => {
    setSelectedAssistant(assistant)
    setIsEditModalOpen(true)
  }

  const handleDelete = (assistant: Assistant) => {
    setSelectedAssistant(assistant)
    setIsDeleteModalOpen(true)
  }

  const handleEditSuccess = (updatedAssistant: Assistant) => {
    setAssistants(prev => 
      prev.map(a => a.id === updatedAssistant.id ? updatedAssistant : a)
    )
    setIsEditModalOpen(false)
    setSelectedAssistant(null)
    toast({
      title: 'Success',
      description: 'Assistant updated successfully'
    })
  }

  const handleDeleteSuccess = (deletedId: string) => {
    setAssistants(prev => prev.filter(a => a.id !== deletedId))
    setIsDeleteModalOpen(false)
    setSelectedAssistant(null)
    toast({
      title: 'Success',
      description: 'Assistant deleted successfully'
    })
  }

  const getStatusBadge = (isActive: boolean) => (
    <Badge variant={isActive ? 'default' : 'secondary'}>
      {isActive ? 'Active' : 'Inactive'}
    </Badge>
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Assistants</h1>
            <p className="text-muted-foreground mt-1">
              Manage your AI voice assistants
            </p>
          </div>
          <Button onClick={() => router.push('/dashboard/assistants/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Assistant
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-col sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search assistants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Assistants Grid */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-20 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredAssistants.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-muted-foreground mb-4">
                {assistants.length === 0 ? (
                  <>
                    <h3 className="text-lg font-semibold mb-2">No assistants yet</h3>
                    <p className="mb-4">Create your first AI voice assistant to get started</p>
                    <Button onClick={() => router.push('/dashboard/assistants/new')}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Assistant
                    </Button>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold mb-2">No results found</h3>
                    <p>Try adjusting your search or filter criteria</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAssistants.map(assistant => (
              <Card key={assistant.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg">{assistant.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {assistant.agent_name || assistant.company_name}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(assistant)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(assistant)}>
                          {assistant.is_active ? (
                            <>
                              <PowerOff className="mr-2 h-4 w-4" />
                              Disable
                            </>
                          ) : (
                            <>
                              <Power className="mr-2 h-4 w-4" />
                              Enable
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDelete(assistant)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(assistant.is_active)}
                    <Badge variant="outline">{assistant.personality}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Company:</span> {assistant.company_name}
                    </div>
                    <div>
                      <span className="font-medium">Max Duration:</span> {assistant.max_call_duration}s
                    </div>
                    <div>
                      <span className="font-medium">Language:</span> {assistant.language}
                    </div>
                    {assistant.vapi_assistant_id && (
                      <div>
                        <span className="font-medium">Vapi ID:</span> 
                        <span className="text-xs text-muted-foreground ml-1">
                          {assistant.vapi_assistant_id.slice(0, 8)}...
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedAssistant && (
        <>
          <EditAssistantModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false)
              setSelectedAssistant(null)
            }}
            assistant={selectedAssistant}
            onSuccess={handleEditSuccess}
          />
          
          <DeleteAssistantModal
            isOpen={isDeleteModalOpen}
            onClose={() => {
              setIsDeleteModalOpen(false)
              setSelectedAssistant(null)
            }}
            assistant={selectedAssistant}
            onSuccess={handleDeleteSuccess}
          />
        </>
      )}
    </DashboardLayout>
  )
}