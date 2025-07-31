'use client'

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Search, Info } from 'lucide-react'

export type MessageType = 
  | 'conversation-update'
  | 'function-call'
  | 'hang'
  | 'function-call-result'
  | 'metadata'
  | 'model-output'
  | 'speech-update'
  | 'status-update'
  | 'user-interrupted'
  | 'end-of-call-report'

interface MessageTypeInfo {
  id: MessageType
  label: string
  description: string
  category: 'real-time' | 'events' | 'analytics'
}

const messageTypes: MessageTypeInfo[] = [
  {
    id: 'conversation-update',
    label: 'Conversation Update',
    description: 'Real-time conversation updates and transcript changes',
    category: 'real-time'
  },
  {
    id: 'function-call',
    label: 'Function Call',
    description: 'Function calls that require responses from your application',
    category: 'events'
  },
  {
    id: 'hang',
    label: 'Hang',
    description: 'When the call is hung up by either party',
    category: 'events'
  },
  {
    id: 'function-call-result',
    label: 'Function Call Result',
    description: 'Results from executed function calls',
    category: 'events'
  },
  {
    id: 'metadata',
    label: 'Metadata',
    description: 'Additional call metadata and context information',
    category: 'analytics'
  },
  {
    id: 'model-output',
    label: 'Model Output',
    description: 'AI model outputs and responses during the conversation',
    category: 'real-time'
  },
  {
    id: 'speech-update',
    label: 'Speech Update',
    description: 'Speech recognition updates and audio processing events',
    category: 'real-time'
  },
  {
    id: 'status-update',
    label: 'Status Update',
    description: 'Call status changes and connection updates',
    category: 'events'
  },
  {
    id: 'user-interrupted',
    label: 'User Interrupted',
    description: 'When the user interrupts the AI assistant',
    category: 'events'
  },
  {
    id: 'end-of-call-report',
    label: 'End of Call Report',
    description: 'Comprehensive call analytics and summary (recommended)',
    category: 'analytics'
  }
]

interface ClientMessagesSelectorProps {
  selectedMessages: MessageType[]
  onMessagesChange: (messages: MessageType[]) => void
  className?: string
}

export function ClientMessagesSelector({ 
  selectedMessages, 
  onMessagesChange, 
  className = '' 
}: ClientMessagesSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')

  // Filter message types based on search
  const filteredMessageTypes = messageTypes.filter(msgType =>
    msgType.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    msgType.description.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  // Check if all filtered messages are selected
  const allFilteredSelected = filteredMessageTypes.length > 0 && 
    filteredMessageTypes.every(msgType => selectedMessages.includes(msgType.id))

  // Handle individual message selection
  const handleMessageToggle = (messageId: MessageType, checked: boolean) => {
    if (checked) {
      onMessagesChange([...selectedMessages, messageId])
    } else {
      onMessagesChange(selectedMessages.filter(id => id !== messageId))
    }
  }

  // Handle select all toggle
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onMessagesChange(filteredMessageTypes.map(msg => msg.id))
    } else {
      onMessagesChange([])
    }
  }

  // Group messages by category
  const groupedMessages = filteredMessageTypes.reduce((acc, msgType) => {
    if (!acc[msgType.category]) {
      acc[msgType.category] = []
    }
    acc[msgType.category].push(msgType)
    return acc
  }, {} as Record<string, MessageTypeInfo[]>)

  const categoryLabels = {
    'real-time': 'Real-time Updates',
    'events': 'Event Notifications', 
    'analytics': 'Analytics & Reports'
  }

  const categoryColors = {
    'real-time': 'var(--vm-accent-blue)',
    'events': 'var(--vm-secondary-purple)',
    'analytics': 'var(--vm-success-green)'
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--vm-primary-light)' }}>
            Client Messages
          </h3>
          <p className="text-sm" style={{ color: 'var(--vm-neutral-400)' }}>
            These are the messages that will be sent to the Client SDKs.
          </p>
        </div>
        <div className="w-6 h-6 rounded-full flex items-center justify-center" 
             style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
          <Info className="w-4 h-4" style={{ color: 'var(--vm-accent-blue)' }} />
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" 
                style={{ color: 'var(--vm-neutral-400)' }} />
        <Input
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          style={{
            background: 'var(--vm-primary-dark)',
            border: '1px solid var(--vm-neutral-800)',
            color: 'var(--vm-primary-light)'
          }}
        />
      </div>

      {/* Select All */}
      <div className="flex items-center space-x-2 p-3 rounded-lg" 
           style={{ background: 'var(--vm-primary-surface)', border: '1px solid var(--vm-border-default)' }}>
        <Checkbox
          id="select-all"
          checked={allFilteredSelected}
          onCheckedChange={handleSelectAll}
        />
        <Label htmlFor="select-all" className="text-sm cursor-pointer" 
               style={{ color: 'var(--vm-primary-light)' }}>
          (Select All)
        </Label>
      </div>

      {/* Message Types by Category */}
      <div className="space-y-6 max-h-96 overflow-y-auto">
        {Object.entries(groupedMessages).map(([category, messages]) => (
          <div key={category} className="space-y-3">
            {/* Category Header */}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" 
                   style={{ background: categoryColors[category as keyof typeof categoryColors] }} />
              <h4 className="text-sm font-medium" style={{ color: 'var(--vm-primary-light)' }}>
                {categoryLabels[category as keyof typeof categoryLabels]}
              </h4>
              <div className="h-px flex-1" style={{ background: 'var(--vm-border-default)' }} />
            </div>

            {/* Message Options */}
            <div className="space-y-2">
              {messages.map((msgType) => (
                <div
                  key={msgType.id}
                  className="flex items-start space-x-3 p-3 rounded-lg hover:bg-opacity-50 transition-colors"
                  style={{ background: 'var(--vm-primary-surface)', border: '1px solid var(--vm-border-default)' }}
                >
                  <Checkbox
                    id={msgType.id}
                    checked={selectedMessages.includes(msgType.id)}
                    onCheckedChange={(checked) => handleMessageToggle(msgType.id, checked as boolean)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <Label 
                      htmlFor={msgType.id} 
                      className="text-sm font-medium cursor-pointer block"
                      style={{ color: 'var(--vm-primary-light)' }}
                    >
                      {msgType.label}
                    </Label>
                    <p className="text-xs mt-1" style={{ color: 'var(--vm-neutral-400)' }}>
                      {msgType.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Selection Summary */}
      <div className="flex items-center justify-between p-3 rounded-lg" 
           style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
        <span className="text-sm font-medium" style={{ color: 'var(--vm-secondary-purple)' }}>
          {selectedMessages.length} message types selected
        </span>
        {selectedMessages.length > 0 && (
          <button
            onClick={() => onMessagesChange([])}
            className="text-xs px-2 py-1 rounded hover:bg-white hover:bg-opacity-10 transition-colors"
            style={{ color: 'var(--vm-secondary-purple)' }}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Recommendation */}
      {selectedMessages.length === 0 && (
        <div className="p-3 rounded-lg" 
             style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <p className="text-xs" style={{ color: 'var(--vm-success-green)' }}>
            💡 Default: Only transcript (post-call summary) will be sent. Add other message types as needed.
          </p>
        </div>
      )}
    </div>
  )
}