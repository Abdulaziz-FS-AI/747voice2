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
  Mic
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
import { motion } from 'framer-motion'
import type { Database } from '@/types/database'

type Assistant = Database['public']['Tables']['user_assistants']['Row']

interface AssistantCardProps {
  assistant: Assistant
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
      <div className="relative bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-gray-300 transition-all duration-300 overflow-hidden">
        {/* Background Gradient Effect */}
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br ${
          statusColor === 'emerald' 
            ? 'from-emerald-500/5 to-blue-500/5' 
            : 'from-gray-500/5 to-slate-500/5'
        }`} />
        
        {/* Status Indicator */}
        <div className="absolute top-4 right-4">
          <div className={`w-3 h-3 rounded-full ${
            statusColor === 'emerald' 
              ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50' 
              : 'bg-gray-400'
          } ${isHovered ? 'animate-pulse' : ''}`} />
        </div>

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-3">
              <div className={`p-3 rounded-xl ${
                statusColor === 'emerald' 
                  ? 'bg-emerald-100 group-hover:bg-emerald-200' 
                  : 'bg-gray-100 group-hover:bg-gray-200'
              } transition-colors duration-300`}>
                <Brain className={`h-5 w-5 ${
                  statusColor === 'emerald' ? 'text-emerald-600' : 'text-gray-600'
                }`} />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900 mb-1">
                  {assistant.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {assistant.vapi_assistant_id && (
                    <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md">
                      <Zap className="h-3 w-3" />
                      ID: {assistant.vapi_assistant_id.slice(0, 8)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {(onEdit || onDelete || onViewDetails) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {onViewDetails && (
                    <DropdownMenuItem onClick={onViewDetails}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                  )}
                  {onEdit && (
                    <DropdownMenuItem onClick={onEdit}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Settings
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem 
                      onClick={onDelete}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Status and Usage */}
          <div className="flex items-center gap-2 mb-4">
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
              statusColor === 'emerald' 
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                : 'bg-gray-100 text-gray-700 border border-gray-200'
            }`}>
              <Activity className="h-3 w-3" />
              {assistant.vapi_assistant_id ? 'Active' : 'Inactive'}
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
              <Clock className="h-3 w-3" />
              {assistant.usage_minutes || 0} min used
            </span>
          </div>

          {/* Voice Visualization */}
          <div className="mb-4 p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Mic className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Voice Profile</span>
            </div>
            <div className="flex items-center gap-1">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className={`w-1 rounded-full ${
                    statusColor === 'emerald' ? 'bg-emerald-400' : 'bg-gray-400'
                  }`}
                  animate={{
                    height: isHovered ? [8, 16 + Math.random() * 8, 8] : 8,
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: isHovered ? Infinity : 0,
                    delay: i * 0.1,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Language</p>
              <p className="text-sm font-medium text-gray-900">English</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Max Duration</p>
              <p className="text-sm font-medium text-gray-900">300s</p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              Created {formatDate(assistant.created_at)}
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-500">Ready</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}