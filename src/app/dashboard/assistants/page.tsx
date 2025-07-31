'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Plus, Search, Edit, Trash2, MoreVertical, Power, PowerOff, Bot, Zap, Sparkles, RefreshCw } from 'lucide-react'
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
import { motion, useScroll, useTransform } from 'framer-motion'

interface Assistant {
  id: string
  user_id: string
  name: string
  template_id: string | null
  vapi_assistant_id: string
  config: any
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function AssistantsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [filteredAssistants, setFilteredAssistants] = useState<Assistant[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
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

  const fetchAssistants = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      
      const response = await fetch('/api/assistants')
      const data = await response.json()
      
      if (data.success) {
        setAssistants(data.data || [])
        if (isRefresh) {
          toast({
            title: 'Success',
            description: 'Assistants refreshed successfully'
          })
        }
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
      if (isRefresh) {
        setRefreshing(false)
      } else {
        setLoading(false)
      }
    }
  }

  const handleRefresh = () => {
    fetchAssistants(true)
  }

  const filterAssistants = () => {
    let filtered = assistants

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(assistant =>
        assistant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assistant.config?.companyName?.toLowerCase().includes(searchQuery.toLowerCase())
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
      <div className="space-y-8">
        {/* Enhanced Header with Neural Network Pattern */}
        <div className="relative overflow-hidden">
          {/* Neural Network Background */}
          <div className="absolute inset-0 opacity-20">
            <svg className="w-full h-full" viewBox="0 0 800 200">
              <defs>
                <linearGradient id="neural-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: 'var(--vm-orange-primary)', stopOpacity: 0.6 }} />
                  <stop offset="100%" style={{ stopColor: 'var(--vm-violet)', stopOpacity: 0.3 }} />
                </linearGradient>
              </defs>
              <g stroke="url(#neural-gradient)" strokeWidth="1" fill="none">
                <circle cx="100" cy="50" r="3" fill="var(--vm-orange-primary)" opacity="0.8" />
                <circle cx="300" cy="80" r="2" fill="var(--vm-violet)" opacity="0.6" />
                <circle cx="500" cy="40" r="2.5" fill="var(--vm-cyan)" opacity="0.7" />
                <circle cx="700" cy="90" r="2" fill="var(--vm-emerald)" opacity="0.5" />
                <line x1="100" y1="50" x2="300" y2="80" />
                <line x1="300" y1="80" x2="500" y2="40" />
                <line x1="500" y1="40" x2="700" y2="90" />
              </g>
            </svg>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative flex justify-between items-center py-8"
          >
            <div>
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="flex items-center gap-3 mb-2"
              >
                <div className="p-3 rounded-xl" style={{ background: 'var(--vm-gradient-brand)' }}>
                  <Bot className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight" style={{ 
                  background: 'linear-gradient(135deg, var(--vm-orange-primary) 0%, var(--vm-violet) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>Neural Assistants</h1>
              </motion.div>
              <motion.p 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-muted-foreground text-lg"
              >
                Deploy and manage your intelligent AI voice agents
              </motion.p>
            </div>
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  onClick={handleRefresh}
                  disabled={refreshing}
                  variant="outline"
                  className="relative overflow-hidden group"
                  style={{
                    background: 'rgba(255, 107, 53, 0.1)',
                    border: '1px solid var(--vm-border-brand)',
                    color: 'var(--vm-orange-primary)'
                  }}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="font-medium">Refresh</span>
                </Button>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  onClick={() => router.push('/dashboard/assistants/new')}
                  className="relative overflow-hidden group"
                  style={{
                    background: 'var(--vm-gradient-brand)',
                    border: 'none',
                    boxShadow: '0 8px 32px rgba(255, 107, 53, 0.3)'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-700" />
                  <Plus className="mr-2 h-5 w-5" />
                  <span className="font-semibold">Create Neural Assistant</span>
                  <Sparkles className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Enhanced Quantum Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card className="relative overflow-hidden" style={{
            background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.03) 0%, rgba(139, 92, 246, 0.02) 100%)',
            border: '1px solid var(--vm-border-brand)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}>
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" style={{ color: 'var(--vm-orange-primary)' }} />
                  Neural Search Matrix
                </CardTitle>
                <Button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  variant="ghost"
                  size="sm"
                  className="text-sm hover:bg-white/10"
                  style={{ color: 'var(--vm-orange-primary)' }}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 flex-col sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--vm-orange-primary)' }} />
                  <Input
                    placeholder="Search neural patterns..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 transition-all duration-300 focus:shadow-lg focus:shadow-orange-500/20"
                    style={{
                      background: 'var(--vm-void)',
                      border: '1px solid var(--vm-border-subtle)',
                      borderRadius: '8px'
                    }}
                  />
                </div>
                <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                  <SelectTrigger className="w-full sm:w-48" style={{
                    background: 'var(--vm-void)',
                    border: '1px solid var(--vm-border-subtle)',
                    borderRadius: '8px'
                  }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Neural States</SelectItem>
                    <SelectItem value="active">Active Agents</SelectItem>
                    <SelectItem value="inactive">Dormant Agents</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quantum Assistants Grid */}
        {loading ? (
          <motion.div 
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            {[1, 2, 3, 4, 5, 6].map(i => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <Card className="relative overflow-hidden" style={{
                  background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.05) 0%, rgba(255, 107, 53, 0.02) 100%)',
                  border: '1px solid var(--vm-border-brand)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                }}>
                  <div className="absolute inset-0">
                    <div className="animate-pulse">
                      <div className="h-2 w-full bg-gradient-to-r from-orange-500/20 via-orange-500/40 to-orange-500/20 rounded-full" />
                    </div>
                  </div>
                  <CardHeader className="relative">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl animate-pulse" style={{ background: 'var(--vm-surface-elevated)' }} />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 rounded animate-pulse" style={{ background: 'var(--vm-surface-elevated)', width: '75%' }} />
                        <div className="h-3 rounded animate-pulse" style={{ background: 'var(--vm-surface-elevated)', width: '50%' }} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="space-y-3">
                      <div className="h-3 rounded animate-pulse" style={{ background: 'var(--vm-surface-elevated)' }} />
                      <div className="h-3 rounded animate-pulse" style={{ background: 'var(--vm-surface-elevated)', width: '80%' }} />
                      <div className="h-3 rounded animate-pulse" style={{ background: 'var(--vm-surface-elevated)', width: '60%' }} />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        ) : filteredAssistants.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card className="text-center py-16 relative overflow-hidden" style={{
              background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.03) 0%, rgba(139, 92, 246, 0.02) 100%)',
              border: '1px solid var(--vm-border-subtle)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}>
              {/* Floating Elements */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-10 left-10 w-20 h-20 rounded-full opacity-10" style={{ background: 'var(--vm-gradient-brand)' }} />
                <div className="absolute bottom-10 right-10 w-16 h-16 rounded-full opacity-10" style={{ background: 'var(--vm-gradient-premium)' }} />
              </div>
              
              <CardContent className="relative">
                <div className="text-muted-foreground mb-4">
                  {assistants.length === 0 ? (
                    <>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="mb-6"
                      >
                        <div className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--vm-gradient-brand)' }}>
                          <Bot className="h-10 w-10 text-white" />
                        </div>
                      </motion.div>
                      <h3 className="text-2xl font-bold mb-3" style={{ color: 'var(--vm-pure)' }}>No Neural Agents Deployed</h3>
                      <p className="mb-6 text-lg" style={{ color: 'var(--vm-gray-400)' }}>Initialize your first AI consciousness to begin the neural matrix</p>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button 
                          onClick={() => router.push('/dashboard/assistants/new')}
                          className="relative overflow-hidden group"
                          style={{
                            background: 'var(--vm-gradient-brand)',
                            border: 'none',
                            boxShadow: '0 8px 32px rgba(255, 107, 53, 0.3)'
                          }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-700" />
                          <Plus className="mr-2 h-5 w-5" />
                          <span className="font-semibold">Deploy First Agent</span>
                          <Zap className="ml-2 h-4 w-4" />
                        </Button>
                      </motion.div>
                    </>
                  ) : (
                    <>
                      <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--vm-surface-elevated)' }}>
                        <Search className="h-8 w-8" style={{ color: 'var(--vm-orange-primary)' }} />
                      </div>
                      <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--vm-pure)' }}>No Neural Patterns Found</h3>
                      <p style={{ color: 'var(--vm-gray-400)' }}>Adjust your search parameters to locate agents</p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div 
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            {filteredAssistants.map((assistant, index) => (
              <motion.div
                key={assistant.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group"
              >
                <Card className="relative p-6 rounded-2xl backdrop-blur-sm border overflow-hidden cursor-pointer h-full" style={{
                  background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.05) 0%, rgba(255, 107, 53, 0.02) 100%)',
                  border: '1px solid var(--vm-border-brand)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                }}>
                  {/* Floating Glow Effect */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-violet-600 rounded-2xl blur opacity-0 group-hover:opacity-20 transition duration-1000 group-hover:duration-200" />
                  
                  {/* Neural Status Indicator */}
                  <div className="absolute top-3 right-3">
                    <div className={`w-3 h-3 rounded-full ${assistant.is_active ? 'bg-emerald-400' : 'bg-gray-500'} animate-pulse`} />
                  </div>
                  
                  <CardHeader className="pb-4 relative">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl" style={{ background: assistant.is_active ? 'var(--vm-gradient-brand)' : 'var(--vm-surface-elevated)' }}>
                            <Bot className="h-5 w-5" style={{ color: assistant.is_active ? 'white' : 'var(--vm-gray-400)' }} />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-bold" style={{ color: 'var(--vm-pure)' }}>
                              {assistant.name}
                            </CardTitle>
                            <p className="text-sm" style={{ color: 'var(--vm-gray-400)' }}>
                              {assistant.config?.companyName || 'Neural Network'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="hover:bg-white/10">
                            <MoreVertical className="h-4 w-4" style={{ color: 'var(--vm-gray-400)' }} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => handleEdit(assistant)} className="group">
                            <Edit className="mr-2 h-4 w-4 group-hover:text-blue-400" />
                            Modify Agent
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(assistant)} className="group">
                            {assistant.is_active ? (
                              <>
                                <PowerOff className="mr-2 h-4 w-4 group-hover:text-orange-400" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <Power className="mr-2 h-4 w-4 group-hover:text-emerald-400" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(assistant)}
                            className="text-destructive group"
                          >
                            <Trash2 className="mr-2 h-4 w-4 group-hover:text-red-400" />
                            Terminate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge 
                        variant={assistant.is_active ? 'default' : 'secondary'}
                        className={assistant.is_active ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-gray-500/20 text-gray-400 border-gray-500/30'}
                      >
                        {assistant.is_active ? 'Active Neural State' : 'Dormant'}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className="bg-violet-500/10 text-violet-400 border-violet-500/30"
                      >
                        {assistant.config?.personality || 'Professional'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium" style={{ color: 'var(--vm-gray-300)' }}>Neural Network:</span>
                        <span style={{ color: 'var(--vm-gray-100)' }}>{assistant.config?.companyName || 'Unassigned'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium" style={{ color: 'var(--vm-gray-300)' }}>Max Duration:</span>
                        <span style={{ color: 'var(--vm-gray-100)' }}>{assistant.config?.maxCallDuration || 1800}s</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium" style={{ color: 'var(--vm-gray-300)' }}>Language Matrix:</span>
                        <span style={{ color: 'var(--vm-gray-100)' }}>{assistant.config?.language || 'en-US'}</span>
                      </div>
                      {assistant.vapi_assistant_id && (
                        <div className="flex items-center justify-between">
                          <span className="font-medium" style={{ color: 'var(--vm-gray-300)' }}>Neural ID:</span>
                          <span className="font-mono text-xs px-2 py-1 rounded" style={{ 
                            background: 'var(--vm-void)', 
                            color: 'var(--vm-orange-primary)',
                            border: '1px solid var(--vm-border-subtle)'
                          }}>
                            {assistant.vapi_assistant_id.slice(0, 8)}...
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--vm-border-subtle)' }}>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span style={{ color: 'var(--vm-gray-400)' }}>Neural Activity</span>
                        <span style={{ color: 'var(--vm-orange-primary)' }}>{assistant.is_active ? '98%' : '0%'}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-1.5">
                        <div 
                          className="h-1.5 rounded-full transition-all duration-1000" 
                          style={{ 
                            width: assistant.is_active ? '98%' : '0%',
                            background: assistant.is_active ? 'var(--vm-gradient-brand)' : 'var(--vm-gray-600)'
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
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