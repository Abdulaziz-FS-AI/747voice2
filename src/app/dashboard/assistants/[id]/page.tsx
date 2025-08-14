'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { usePinAuth } from '@/lib/contexts/pin-auth-context'
import { ArrowLeft, Brain, Clock, Edit3, Lock, Settings, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DashboardLayout } from '@/components/dashboard/layout'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { motion } from 'framer-motion'
import { authenticatedFetch, handleAuthenticatedResponse } from '@/lib/utils/client-session'
import type { ClientAssistant } from '@/types/client'

export default function AssistantDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { client, isAuthenticated, isLoading } = usePinAuth()
  const [assistant, setAssistant] = useState<ClientAssistant | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  // Editable fields
  const [displayName, setDisplayName] = useState('')
  const [firstMessage, setFirstMessage] = useState('')
  const [voice, setVoice] = useState('')
  const [model, setModel] = useState('')
  const [evalMethod, setEvalMethod] = useState('')
  const [maxCallDuration, setMaxCallDuration] = useState('')
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchAssistant()
    }
  }, [isAuthenticated, isLoading, params.id])

  useEffect(() => {
    if (assistant) {
      const originalDisplayName = assistant.display_name || ''
      const originalFirstMessage = assistant.first_message || ''
      const originalVoice = assistant.voice || ''
      const originalModel = assistant.model || ''
      const originalEvalMethod = assistant.eval_method || ''
      const originalMaxDuration = assistant.max_call_duration?.toString() || ''

      const changed = displayName !== originalDisplayName ||
                     firstMessage !== originalFirstMessage ||
                     voice !== originalVoice ||
                     model !== originalModel ||
                     evalMethod !== originalEvalMethod ||
                     maxCallDuration !== originalMaxDuration

      setHasChanges(changed)
    }
  }, [assistant, displayName, firstMessage, voice, model, evalMethod, maxCallDuration])

  const fetchAssistant = async () => {
    try {
      setLoading(true)
      
      const response = await authenticatedFetch(`/api/assistants/${params.id}`)
      const data = await handleAuthenticatedResponse<ClientAssistant>(response)
      
      if (data) {
        setAssistant(data)
        // Set form values
        setDisplayName(data.display_name || '')
        setFirstMessage(data.first_message || '')
        setVoice(data.voice || '')
        setModel(data.model || '')
        setEvalMethod(data.eval_method || '')
        setMaxCallDuration(data.max_call_duration?.toString() || '')
      } else {
        router.push('/dashboard/assistants')
      }
    } catch (error) {
      console.error('[Assistant Detail] Failed to fetch assistant:', error)
      toast({
        title: 'Error',
        description: 'Failed to load assistant details. Please try again.',
        variant: 'destructive'
      })
      router.push('/dashboard/assistants')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async () => {
    if (!assistant || !hasChanges) return

    try {
      setUpdating(true)

      const response = await authenticatedFetch(`/api/assistants/${assistant.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          display_name: displayName,
          first_message: firstMessage || null,
          voice: voice || null,
          model: model || null,
          eval_method: evalMethod || null,
          max_call_duration: maxCallDuration ? parseInt(maxCallDuration) : null
        })
      })

      const updatedAssistant = await handleAuthenticatedResponse<ClientAssistant>(response)

      if (updatedAssistant) {
        setAssistant(updatedAssistant)
        toast({
          title: 'Success',
          description: 'Assistant settings updated successfully'
        })
      }
    } catch (error: any) {
      console.error('[Assistant Detail] Failed to update assistant:', error)
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update assistant settings',
        variant: 'destructive'
      })
    } finally {
      setUpdating(false)
    }
  }

  const resetChanges = () => {
    if (!assistant) return
    
    setDisplayName(assistant.display_name || '')
    setFirstMessage(assistant.first_message || '')
    setVoice(assistant.voice || '')
    setModel(assistant.model || '')
    setEvalMethod(assistant.eval_method || '')
    setMaxCallDuration(assistant.max_call_duration?.toString() || '')
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

  if (!assistant) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{assistant.display_name}</h1>
              <p className="text-gray-600">
                Assigned {new Date(assistant.assigned_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {hasChanges && (
              <Button
                variant="outline"
                onClick={resetChanges}
                disabled={updating}
              >
                Reset
              </Button>
            )}
            <Button
              onClick={handleUpdate}
              disabled={!hasChanges || updating}
              className={hasChanges ? 'bg-blue-600 hover:bg-blue-700' : ''}
            >
              {updating ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Assistant Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  <Badge variant={assistant.is_active ? "default" : "secondary"}>
                    {assistant.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">VAPI ID</span>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {assistant.vapi_assistant_id.slice(0, 12)}...
                  </code>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Assigned</span>
                  <span className="text-sm font-medium">
                    {new Date(assistant.assigned_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Updated</span>
                  <span className="text-sm font-medium">
                    {new Date(assistant.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Company</span>
                  <span className="text-sm font-medium">{client?.company_name}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="settings" className="space-y-4">
          <TabsList>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="readonly">
              <Lock className="h-4 w-4 mr-2" />
              Admin Only
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Editable Settings</CardTitle>
                  <CardDescription>
                    You can modify these settings for your assistant
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Display Name *</Label>
                      <Input
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Enter assistant display name"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="voice">Voice</Label>
                      <Select value={voice} onValueChange={setVoice}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a voice" />
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

                    <div className="space-y-2">
                      <Label htmlFor="model">AI Model</Label>
                      <Select value={model} onValueChange={setModel}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gpt-4">GPT-4</SelectItem>
                          <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                          <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                          <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="evalMethod">Evaluation Method</Label>
                      <Select value={evalMethod} onValueChange={setEvalMethod}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select evaluation method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="conversation_score">Conversation Score</SelectItem>
                          <SelectItem value="task_completion">Task Completion</SelectItem>
                          <SelectItem value="user_satisfaction">User Satisfaction</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="maxCallDuration">Max Call Duration (seconds)</Label>
                      <Input
                        id="maxCallDuration"
                        type="number"
                        value={maxCallDuration}
                        onChange={(e) => setMaxCallDuration(e.target.value)}
                        placeholder="e.g. 600"
                        min="30"
                        max="3600"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="firstMessage">First Message</Label>
                    <Textarea
                      id="firstMessage"
                      value={firstMessage}
                      onChange={(e) => setFirstMessage(e.target.value)}
                      placeholder="Enter the first message your assistant will say to callers"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Assistant Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Current Display Name</Label>
                      <p className="text-sm text-gray-900 mt-1">{assistant.display_name || 'Not set'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Voice Setting</Label>
                      <p className="text-sm text-gray-900 mt-1">{assistant.voice || 'Default'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">AI Model</Label>
                      <p className="text-sm text-gray-900 mt-1">{assistant.model || 'Default'}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Evaluation Method</Label>
                      <p className="text-sm text-gray-900 mt-1">{assistant.eval_method || 'Not set'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Max Call Duration</Label>
                      <p className="text-sm text-gray-900 mt-1">
                        {assistant.max_call_duration ? `${assistant.max_call_duration} seconds` : 'Not set'}
                      </p>
                    </div>
                  </div>
                </div>

                {assistant.first_message && (
                  <div className="pt-4 border-t">
                    <Label className="text-sm font-medium text-gray-700">First Message</Label>
                    <p className="text-sm text-gray-900 mt-1">{assistant.first_message}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="readonly" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Administrator-Controlled Settings
                </CardTitle>
                <CardDescription>
                  These settings can only be modified by your administrator
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">System Prompt</Label>
                    <p className="text-sm text-gray-600 mt-1">
                      {assistant.system_prompt || 'No system prompt configured'}
                    </p>
                  </div>
                  
                  {assistant.questions && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Structured Questions</Label>
                      <div className="mt-2 space-y-2">
                        {typeof assistant.questions === 'object' ? (
                          Object.entries(assistant.questions).map(([key, question]) => (
                            <div key={key} className="text-sm text-gray-600 bg-white p-2 rounded border">
                              <span className="font-medium">{key}:</span> {String(question)}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-600">{String(assistant.questions)}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="text-sm font-medium text-gray-700">VAPI Assistant ID</Label>
                    <code className="block text-xs bg-white p-2 rounded border mt-1">
                      {assistant.vapi_assistant_id}
                    </code>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900">Need Changes?</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Contact your administrator to modify system prompts, structured questions, or other advanced settings.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}