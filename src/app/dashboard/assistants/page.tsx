'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { usePinAuth } from '@/lib/contexts/pin-auth-context'
import { Settings, RefreshCw, Bot, Edit3, Save, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { DashboardLayout } from '@/components/dashboard/layout'
import { toast } from '@/hooks/use-toast'
import { motion } from 'framer-motion'
import { authenticatedFetch, handleAuthenticatedResponse } from '@/lib/utils/client-session'
import type { ClientAssistant } from '@/types/client'

interface EditingAssistant {
  id: string
  display_name: string
  first_message: string
  voice: string
  model: string
  eval_method: string
  max_call_duration: number
}

export default function AssistantsPage() {
  const { client, isAuthenticated, isLoading } = usePinAuth()
  const [assistants, setAssistants] = useState<ClientAssistant[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<EditingAssistant | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchAssistants()
    }
  }, [isAuthenticated, isLoading])

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
        description: 'Failed to load your assistants. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      
      const response = await authenticatedFetch('/api/assistants?action=refresh', {
        method: 'PATCH'
      })
      const result = await handleAuthenticatedResponse(response)
      
      if (result) {
        setAssistants(result.data)
        toast({
          title: 'Refreshed',
          description: result.message || 'Assistant data updated from VAPI'
        })
      }
    } catch (error) {
      console.error('[Assistants] Failed to refresh:', error)
      toast({
        title: 'Error',
        description: 'Failed to refresh assistants. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setRefreshing(false)
    }
  }

  const startEdit = (assistant: ClientAssistant) => {
    setEditingId(assistant.id)
    setEditData({
      id: assistant.id,
      display_name: assistant.display_name,
      first_message: assistant.first_message || '',
      voice: assistant.voice || 'jennifer',
      model: assistant.model || 'gpt-4',
      eval_method: assistant.eval_method || 'conversation_score',
      max_call_duration: assistant.max_call_duration || 300
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditData(null)
  }

  const saveEdit = async () => {
    if (!editData) return
    
    try {
      setSaving(true)
      
      const response = await authenticatedFetch(`/api/assistants/${editData.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          display_name: editData.display_name,
          first_message: editData.first_message,
          voice: editData.voice,
          model: editData.model,
          eval_method: editData.eval_method,
          max_call_duration: editData.max_call_duration
        })
      })

      const result = await handleAuthenticatedResponse(response)
      
      if (result) {
        toast({
          title: 'Updated',
          description: 'Assistant settings updated successfully'
        })
        await fetchAssistants() // Refresh data
        cancelEdit()
      }
    } catch (error) {
      console.error('[Assistants] Failed to update assistant:', error)
      toast({
        title: 'Error',
        description: 'Failed to update assistant. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  if (!isAuthenticated || isLoading) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <p className="vm-text-secondary">Loading...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-4xl font-bold tracking-tight vm-text-gradient">Your AI Assistants</h1>
            <p className="text-lg vm-text-secondary mt-2">
              Assistants assigned by your administrator. You can customize voice, messages, and basic settings.
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh from VAPI
          </Button>
        </motion.div>

        {loading ? (
          // Loading State
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="vm-card">
                <CardHeader>
                  <div className="h-6 vm-loading-skeleton rounded" />
                  <div className="h-4 vm-loading-skeleton rounded" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-4 vm-loading-skeleton rounded" />
                    <div className="h-4 vm-loading-skeleton rounded w-3/4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : assistants.length === 0 ? (
          // Empty State
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <Bot className="h-16 w-16 mx-auto mb-4 vm-text-muted" />
            <h3 className="text-xl font-semibold mb-2 vm-text-primary">No Assistants Assigned</h3>
            <p className="vm-text-secondary max-w-md mx-auto">
              No AI assistants have been assigned to your account yet. Contact your administrator to get started.
            </p>
          </motion.div>
        ) : (
          // Assistants Grid
          <div className="grid gap-6 md:grid-cols-2">
            {assistants.map((assistant, index) => (
              <motion.div
                key={assistant.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="vm-card backdrop-blur-lg border border-vm-glass-border bg-vm-gradient-glass">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 vm-text-bright">
                        <Bot className="h-5 w-5 text-vm-primary" />
                        {editingId === assistant.id ? (
                          <Input
                            value={editData?.display_name || ''}
                            onChange={(e) => setEditData(prev => prev ? {...prev, display_name: e.target.value} : null)}
                            className="vm-text-bright bg-vm-surface-elevated border-vm-border"
                          />
                        ) : (
                          assistant.display_name
                        )}
                      </CardTitle>
                      {editingId === assistant.id ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={saveEdit}
                            disabled={saving}
                            className="bg-vm-success hover:bg-vm-success/80 text-vm-success-foreground"
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEdit}
                            disabled={saving}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(assistant)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {editingId === assistant.id ? (
                      // Edit Mode
                      <div className="space-y-4">
                        <div>
                          <Label className="vm-text-muted">First Message</Label>
                          <Input
                            value={editData?.first_message || ''}
                            onChange={(e) => setEditData(prev => prev ? {...prev, first_message: e.target.value} : null)}
                            className="mt-1 bg-vm-surface-elevated border-vm-border vm-text-bright"
                            placeholder="Hello! How can I help you today?"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="vm-text-muted">Voice</Label>
                            <Select
                              value={editData?.voice || 'jennifer'}
                              onValueChange={(value) => setEditData(prev => prev ? {...prev, voice: value} : null)}
                            >
                              <SelectTrigger className="mt-1 bg-vm-surface-elevated border-vm-border">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="jennifer">Jennifer</SelectItem>
                                <SelectItem value="ryan">Ryan</SelectItem>
                                <SelectItem value="mark">Mark</SelectItem>
                                <SelectItem value="sarah">Sarah</SelectItem>
                                <SelectItem value="paige">Paige</SelectItem>
                                <SelectItem value="michael">Michael</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="vm-text-muted">Model</Label>
                            <Select
                              value={editData?.model || 'gpt-4'}
                              onValueChange={(value) => setEditData(prev => prev ? {...prev, model: value} : null)}
                            >
                              <SelectTrigger className="mt-1 bg-vm-surface-elevated border-vm-border">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="gpt-4">GPT-4</SelectItem>
                                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                                <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                                <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="vm-text-muted">Evaluation Method</Label>
                            <Select
                              value={editData?.eval_method || 'conversation_score'}
                              onValueChange={(value) => setEditData(prev => prev ? {...prev, eval_method: value} : null)}
                            >
                              <SelectTrigger className="mt-1 bg-vm-surface-elevated border-vm-border">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="conversation_score">Conversation Score</SelectItem>
                                <SelectItem value="lead_quality_score">Lead Quality</SelectItem>
                                <SelectItem value="problem_solved">Problem Solved</SelectItem>
                                <SelectItem value="customer_satisfaction">Customer Satisfaction</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="vm-text-muted">Max Duration (seconds)</Label>
                            <Input
                              type="number"
                              value={editData?.max_call_duration || 300}
                              onChange={(e) => setEditData(prev => prev ? {...prev, max_call_duration: parseInt(e.target.value) || 300} : null)}
                              className="mt-1 bg-vm-surface-elevated border-vm-border vm-text-bright"
                              min="60"
                              max="1800"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-vm-accent border-vm-accent">
                            {assistant.voice || 'Default Voice'}
                          </Badge>
                          <Badge variant="outline" className="text-vm-success border-vm-success">
                            {assistant.model || 'GPT-4'}
                          </Badge>
                          <Badge variant="outline" className="text-vm-warning border-vm-warning">
                            {assistant.max_call_duration || 300}s
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm vm-text-muted">First Message:</p>
                          <p className="vm-text-bright text-sm">
                            {assistant.first_message || 'No custom first message set'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm vm-text-muted">VAPI Assistant ID:</p>
                          <code className="text-xs text-vm-primary bg-vm-surface-elevated px-2 py-1 rounded">
                            {assistant.vapi_assistant_id}
                          </code>
                        </div>
                        {assistant.last_synced_at && (
                          <div>
                            <p className="text-xs vm-text-muted">
                              Last synced: {new Date(assistant.last_synced_at).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="vm-card border border-vm-accent/30 bg-vm-gradient-glass backdrop-blur-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-vm-accent">
                <Settings className="h-5 w-5" />
                Limited Edit Access
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="vm-text-bright text-sm">
                You can customize your assistant's voice, first message, model, evaluation method, and call duration. 
                Core functionality like system prompts and functions are managed by your administrator.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}