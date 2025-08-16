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
import type { ClientAssistant, VapiVoiceId, VapiEvaluationRubric } from '@/types/client'
import { VAPI_VOICES, VAPI_EVALUATION_RUBRICS, getVoiceById, getEvaluationRubricById } from '@/lib/voices'

interface EditingAssistant {
  id: string
  first_message: string
  voice: VapiVoiceId
  eval_method: VapiEvaluationRubric
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
      const result = await handleAuthenticatedResponse<{data: ClientAssistant[]}>(response)
      
      if (result && result.data) {
        // Ensure data is always an array
        const assistantsData = Array.isArray(result.data) ? result.data : []
        setAssistants(assistantsData)
      } else {
        setAssistants([])
      }
    } catch (error) {
      console.error('[Assistants] Failed to fetch assistants:', error)
      setAssistants([]) // Set empty array on error
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
      const result = await handleAuthenticatedResponse<{data: ClientAssistant[], message?: string}>(response)
      
      if (result && result.data) {
        // Ensure data is always an array
        const assistantsData = Array.isArray(result.data) ? result.data : []
        setAssistants(assistantsData)
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
      first_message: assistant.first_message || '',
      voice: (assistant.voice as VapiVoiceId) || 'Elliot',
      eval_method: (assistant.eval_method as VapiEvaluationRubric) || 'PassFail',
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
          first_message: editData.first_message,
          voice: editData.voice,
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
                        {assistant.display_name}
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
                        <div className="space-y-4">
                          <div>
                            <Label className="vm-text-muted">Voice</Label>
                            <Select
                              value={editData?.voice || 'Elliot'}
                              onValueChange={(value) => setEditData(prev => prev ? {...prev, voice: value as VapiVoiceId} : null)}
                            >
                              <SelectTrigger className="mt-1 bg-vm-surface-elevated border-vm-border">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {VAPI_VOICES.map((voice) => (
                                  <SelectItem key={voice.id} value={voice.id}>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{voice.name}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {voice.gender}, {voice.accent}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="vm-text-muted">Evaluation Method</Label>
                            <Select
                              value={editData?.eval_method || 'PassFail'}
                              onValueChange={(value) => setEditData(prev => prev ? {...prev, eval_method: value as VapiEvaluationRubric} : null)}
                            >
                              <SelectTrigger className="mt-1 bg-vm-surface-elevated border-vm-border">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {VAPI_EVALUATION_RUBRICS.map((rubric) => (
                                  <SelectItem key={rubric.id} value={rubric.id}>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm">{rubric.icon}</span>
                                      <div>
                                        <div className="font-medium">{rubric.name}</div>
                                        <div className="text-xs text-muted-foreground">{rubric.description}</div>
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))}
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
                            Voice: {getVoiceById(assistant.voice as VapiVoiceId)?.name || assistant.voice || 'Default'}
                          </Badge>
                          <Badge variant="outline" className="text-vm-success border-vm-success">
                            Eval: {getEvaluationRubricById(assistant.eval_method as VapiEvaluationRubric)?.name || assistant.eval_method || 'Pass/Fail'}
                          </Badge>
                          <Badge variant="outline" className="text-vm-warning border-vm-warning">
                            {assistant.max_call_duration || 300}s max
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
                You can customize your assistant's voice, first message, evaluation method, and call duration. 
                Assistant names, models, and core functionality are managed by your administrator.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}