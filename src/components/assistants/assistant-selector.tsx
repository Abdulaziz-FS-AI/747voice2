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

type Assistant = Database['public']['Tables']['assistants']['Row']

interface AssistantSelectorProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  includeInactive?: boolean
  className?: string
}

export function AssistantSelector({
  value,
  onValueChange,
  placeholder = "Select an assistant...",
  includeInactive = false,
  className
}: AssistantSelectorProps) {
  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAssistants()
  }, [includeInactive])

  const fetchAssistants = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/assistants')
      const data = await response.json()
      
      if (data.success) {
        let filteredAssistants = data.data || []
        
        // Filter out inactive assistants if not included
        if (!includeInactive) {
          filteredAssistants = filteredAssistants.filter((a: Assistant) => a.is_active)
        }
        
        setAssistants(filteredAssistants)
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
                variant={selectedAssistant.is_active ? 'default' : 'secondary'}
                className="ml-auto"
              >
                {selectedAssistant.is_active ? 'Active' : 'Inactive'}
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
                    {assistant.agent_name} • {assistant.company_name}
                  </span>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Badge 
                    variant={assistant.is_active ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {assistant.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {assistant.personality}
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