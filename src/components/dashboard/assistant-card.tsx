'use client'

import { useState } from 'react'
import { 
  Phone, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye,
  Clock,
  Building,
  Zap,
  Brain,
  TrendingUp,
  Activity,
  Mic,
  ChevronDown,
  ChevronUp,
  Settings,
  Volume2,
  Timer,
  BarChart3,
  VolumeX
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { motion, AnimatePresence } from 'framer-motion'
import type { ClientAssistant } from '@/types/client'

interface AssistantCardProps {
  assistant: ClientAssistant
  onEdit?: () => void
  onDelete?: () => void
  onViewDetails?: () => void
}

export function AssistantCard({
  assistant,
  onEdit,
  onDelete,
  onViewDetails
}: AssistantCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusColor = () => {
    if (assistant.vapi_assistant_id) {
      return "emerald"
    }
    return "gray"
  }

  const statusColor = getStatusColor()

  return (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="group relative"
    >
      <div className="relative vm-card overflow-hidden">
        {/* Background Gradient Effect */}
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br ${
          statusColor === 'emerald' 
            ? 'from-vm-primary/5 to-vm-accent/5' 
            : 'from-vm-muted/5 to-vm-surface/5'
        }`} />
        
        {/* Status Indicator */}
        <div className="absolute top-4 right-4">
          <div className={`w-3 h-3 rounded-full ${
            statusColor === 'emerald' 
              ? 'bg-vm-success shadow-lg shadow-vm-success/50' 
              : 'bg-vm-muted'
          } ${isHovered ? 'animate-pulse' : ''}`} />
        </div>

        <div className="relative z-10 p-6">
          {/* Header - Name, Role, Description */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4 flex-1">
              <div className={`p-3 rounded-xl ${
                statusColor === 'emerald' 
                  ? 'bg-vm-primary/10 group-hover:bg-vm-primary/20' 
                  : 'bg-vm-muted/10 group-hover:bg-vm-muted/20'
              } transition-colors duration-300`}>
                <Brain className={`h-6 w-6 ${
                  statusColor === 'emerald' ? 'text-vm-primary' : 'text-vm-muted'
                }`} />
              </div>
              <div className="flex-1">
                <h3 className="vm-text-lg font-semibold vm-text-bright mb-1">
                  {assistant.display_name}
                </h3>
                
                {/* Role Badge */}
                {assistant.assistant_role && (
                  <div className="mb-2">
                    <Badge variant="secondary" className="vm-text-small">
                      {assistant.assistant_role}
                    </Badge>
                  </div>
                )}
                
                {/* Description */}
                {assistant.assistant_description && (
                  <p className="vm-text-small vm-text-contrast leading-relaxed mb-2">
                    {assistant.assistant_description}
                  </p>
                )}
                
                {/* VAPI ID */}
                <div className="flex items-center gap-2 vm-text-small vm-text-muted">
                  <Zap className="h-3 w-3" />
                  <span>ID: {assistant.vapi_assistant_id.slice(0, 8)}...</span>
                </div>
              </div>
            </div>

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {onViewDetails && (
                  <DropdownMenuItem onClick={onViewDetails}>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View Analytics
                  </DropdownMenuItem>
                )}
                {onEdit && (
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Settings
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2 mb-4">
            <Badge 
              variant={statusColor === 'emerald' ? 'default' : 'secondary'}
              className="vm-text-small"
            >
              <Activity className="h-3 w-3 mr-1" />
              {assistant.vapi_assistant_id ? 'Active' : 'Inactive'}
            </Badge>
            
            {/* Last Synced */}
            {assistant.last_synced_at && (
              <span className="vm-text-small vm-text-muted">
                Synced {formatDate(assistant.last_synced_at)}
              </span>
            )}
          </div>

          {/* Quick Info Row */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="vm-text-small vm-text-muted mb-1">Voice</p>
              <p className="vm-text-small vm-text-bright font-medium">
                {assistant.voice || 'Default'}
              </p>
            </div>
            <div>
              <p className="vm-text-small vm-text-muted mb-1">Model</p>
              <p className="vm-text-small vm-text-bright font-medium">
                {assistant.model || 'GPT-4'}
              </p>
            </div>
          </div>

          {/* Details Toggle Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full justify-between vm-hover-lift"
          >
            <span className="vm-text-small">Technical Details</span>
            {showDetails ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          {/* Expandable Details Section */}
          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="pt-4 border-t border-vm-border mt-4">
                  <div className="space-y-4">
                    {/* Voice Settings */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Volume2 className="h-4 w-4 vm-text-muted" />
                        <span className="vm-text-small vm-text-contrast">Voice Model</span>
                      </div>
                      <span className="vm-text-small vm-text-bright font-medium">
                        {assistant.voice || 'Elliot'}
                      </span>
                    </div>

                    {/* First Message */}
                    {assistant.first_message && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Mic className="h-4 w-4 vm-text-muted" />
                          <span className="vm-text-small vm-text-contrast">First Message</span>
                        </div>
                        <p className="vm-text-small vm-text-muted leading-relaxed pl-6 bg-vm-surface/50 p-2 rounded-lg">
                          "{assistant.first_message}"
                        </p>
                      </div>
                    )}

                    {/* Technical Specs */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Timer className="h-4 w-4 vm-text-muted" />
                          <span className="vm-text-small vm-text-contrast">Max Duration</span>
                        </div>
                        <span className="vm-text-small vm-text-bright font-medium">
                          {assistant.max_call_duration || 300}s
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 vm-text-muted" />
                          <span className="vm-text-small vm-text-contrast">Evaluation</span>
                        </div>
                        <span className="vm-text-small vm-text-bright font-medium">
                          {assistant.evaluation_type || 'Standard'}
                        </span>
                      </div>
                    </div>

                    {/* Background Noise */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {assistant.background_noise_enabled ? (
                          <Volume2 className="h-4 w-4 vm-text-muted" />
                        ) : (
                          <VolumeX className="h-4 w-4 vm-text-muted" />
                        )}
                        <span className="vm-text-small vm-text-contrast">Background Noise</span>
                      </div>
                      <Badge 
                        variant={assistant.background_noise_enabled ? "default" : "secondary"}
                        className="vm-text-small"
                      >
                        {assistant.background_noise_enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}