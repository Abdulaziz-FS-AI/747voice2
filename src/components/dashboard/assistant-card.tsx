'use client'

import { useState } from 'react'
import { 
  Phone, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Power,
  Eye,
  Clock,
  Building
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Database } from '@/types/database'

type Assistant = Database['public']['Tables']['assistants']['Row']

interface AssistantCardProps {
  assistant: Assistant
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onViewDetails: () => void
}

export function AssistantCard({
  assistant,
  onToggle,
  onEdit,
  onDelete,
  onViewDetails
}: AssistantCardProps) {
  const [isToggling, setIsToggling] = useState(false)

  const handleToggle = async () => {
    setIsToggling(true)
    await onToggle()
    setIsToggling(false)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <Card className="group hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-lg leading-none vm-text-bright">
              {assistant.name}
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {assistant.agent_name && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {assistant.agent_name}
                </span>
              )}
              {assistant.company_name && (
                <span className="flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  {assistant.company_name}
                </span>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onViewDetails}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={assistant.is_active ? "default" : "secondary"}>
              {assistant.is_active ? "Enabled" : "Disabled"}
            </Badge>
            {assistant.tone && (
              <Badge variant="outline" className="capitalize">
                {assistant.tone}
              </Badge>
            )}
          </div>
          <Switch
            checked={assistant.is_active}
            onCheckedChange={handleToggle}
            disabled={isToggling}
            className="data-[state=checked]:bg-green-500"
          />
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Language</span>
            <span className="font-medium text-foreground">
              {assistant.language || 'en'}
            </span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Max Duration</span>
            <span className="font-medium text-foreground">
              {assistant.max_call_duration}s
            </span>
          </div>
          {assistant.vapi_assistant_id && (
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Status</span>
              <Badge variant="outline" className="text-xs">
                <Power className="mr-1 h-3 w-3" />
                Deployed
              </Badge>
            </div>
          )}
        </div>

        <div className="pt-2 border-t">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Created {formatDate(assistant.created_at)}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}