'use client'

import { useState, useEffect } from 'react'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import type { Database } from '@/types/database'

type Assistant = Database['public']['Tables']['user_assistants']['Row']

interface AssistantSelectorProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function AssistantSelector({
  value,
  onValueChange,
  placeholder = "Select an assistant...",
  className
}: AssistantSelectorProps) {
  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAssistants()
  }, [])

  const fetchAssistants = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/assistants')
      const data = await response.json()
      
      if (data.success) {
        // Only show active assistants (demo system only has active or deleted)
        const activeAssistants = data.data || []
        setAssistants(activeAssistants)
      }
    } catch (error) {
      console.error('Failed to fetch assistants:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedAssistant = assistants.find(a => a.id === value)

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>
          {selectedAssistant && (
            <div className="flex items-center gap-2">
              <span>{selectedAssistant.name}</span>
              <Badge 
                variant="default"
                className="ml-auto"
              >
                Active
              </Badge>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="ml-2 text-sm text-muted-foreground">Loading assistants...</span>
          </div>
        ) : assistants.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            No assistants found
          </div>
        ) : (
          assistants.map((assistant) => (
            <SelectItem key={assistant.id} value={assistant.id}>
              <div className="flex items-center justify-between w-full">
                <div className="flex flex-col items-start">
                  <span className="font-medium">{assistant.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {assistant.vapi_assistant_id}
                  </span>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Badge 
                    variant="default"
                    className="text-xs"
                  >
                    Active
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {assistant.usage_minutes || 0} min
                  </Badge>
                </div>
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}