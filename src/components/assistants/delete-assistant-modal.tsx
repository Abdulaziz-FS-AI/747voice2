'use client'

import { useState, useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Loader2, Trash2, Phone } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

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

interface DeleteAssistantModalProps {
  isOpen: boolean
  onClose: () => void
  assistant: Assistant
  onSuccess: (deletedId: string) => void
}

export function DeleteAssistantModal({ 
  isOpen, 
  onClose, 
  assistant, 
  onSuccess 
}: DeleteAssistantModalProps) {
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)
  const [assignedPhones, setAssignedPhones] = useState<Array<{id: string, phone_number: string, friendly_name: string}>>([])
  const [loadingPhones, setLoadingPhones] = useState(false)

  // Fetch assigned phone numbers when modal opens
  useEffect(() => {
    if (isOpen && assistant.id) {
      fetchAssignedPhones()
    }
  }, [isOpen, assistant.id])

  const fetchAssignedPhones = async () => {
    setLoadingPhones(true)
    try {
      const response = await fetch('/api/phone-numbers')
      const data = await response.json()
      if (data.success && data.data) {
        // Filter to only phones assigned to this assistant
        const assigned = data.data.filter((phone: any) => 
          phone.assigned_assistant_id === assistant.id && phone.is_active
        )
        setAssignedPhones(assigned)
      }
    } catch (error) {
      console.error('Failed to fetch assigned phones:', error)
    } finally {
      setLoadingPhones(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    
    try {
      const response = await fetch(`/api/assistants/${assistant.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to delete assistant')
      }

      if (result.success) {
        onSuccess(assistant.id)
        
        // Show detailed success message
        let description = result.message || 'Assistant deleted successfully'
        if (result.details?.totalPhoneNumbers > 0) {
          const successfulDeletes = result.details.phoneNumbers?.filter((p: any) => p.success).length || 0
          description += `\n\nPhone numbers affected: ${result.details.totalPhoneNumbers}`
          if (successfulDeletes > 0) {
            description += ` (${successfulDeletes} removed from voice service)`
          }
        }
        
        toast({
          title: 'Success',
          description: description
        })
      } else {
        throw new Error(result.error?.message || 'Failed to delete assistant')
      }
    } catch (error) {
      console.error('Failed to delete assistant:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete assistant',
        variant: 'destructive'
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleClose = () => {
    if (!isDeleting) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg border-0 shadow-2xl" style={{ 
        background: 'var(--vm-surface)',
        borderRadius: '16px'
      }}>
        <DialogHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center" 
               style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
            <Trash2 className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold vm-text-primary">
            Delete Voice Agent
          </DialogTitle>
          <DialogDescription className="text-center vm-text-secondary leading-relaxed">
            This action cannot be undone. This will permanently remove <strong className="vm-text-primary">{assistant.name}</strong> and all associated data from your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Assistant Info */}
          <div className="rounded-xl p-6 border" style={{ 
            background: 'var(--vm-background)',
            borderColor: 'var(--vm-border-subtle)'
          }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" 
                     style={{ background: 'var(--vm-gradient-brand)' }}>
                  <span className="text-white font-semibold">{assistant.name.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <h3 className="font-semibold vm-text-primary">{assistant.name}</h3>
                  <p className="text-sm vm-text-muted">{assistant.config?.company_name || 'No company set'}</p>
                </div>
              </div>
              <Badge 
                className={`px-3 py-1 ${assistant.is_active 
                  ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                  : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                }`}
              >
                {assistant.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            {assistant.vapi_assistant_id && (
              <div className="text-xs vm-text-muted font-mono">
                Service ID: {assistant.vapi_assistant_id.slice(0, 8)}...
              </div>
            )}
          </div>

          {/* Assigned Phone Numbers */}
          {!loadingPhones && assignedPhones.length > 0 && (
            <div className="rounded-xl p-6 border" style={{ 
              background: 'var(--vm-orange-pale)',
              borderColor: 'var(--vm-orange-primary)',
              borderWidth: '1px'
            }}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" 
                     style={{ background: 'var(--vm-orange-primary)' }}>
                  <Phone className="h-5 w-5 text-white" />
                </div>
                <div className="space-y-3 flex-1">
                  <p className="font-semibold" style={{ color: 'var(--vm-orange-primary)' }}>
                    Connected Phone Numbers ({assignedPhones.length})
                  </p>
                  <div className="grid gap-2">
                    {assignedPhones.map((phone) => (
                      <div key={phone.id} className="flex items-center gap-2 p-2 rounded-lg" 
                           style={{ background: 'rgba(255, 255, 255, 0.5)' }}>
                        <div className="w-2 h-2 rounded-full" style={{ background: 'var(--vm-orange-primary)' }} />
                        <span className="font-mono text-sm vm-text-primary">{phone.phone_number}</span>
                        <span className="text-sm vm-text-muted">({phone.friendly_name})</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm vm-text-secondary">
                    These phone numbers will be removed from the voice service and unassigned from your account.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="rounded-xl p-6 border-2 border-dashed" style={{ 
            background: 'rgba(239, 68, 68, 0.05)',
            borderColor: '#ef4444'
          }}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-500/10" >
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div className="space-y-3 flex-1">
                <p className="font-semibold text-red-500">
                  This deletion will permanently remove:
                </p>
                <div className="grid gap-2">
                  {[
                    'Voice agent from your account',
                    'All connected phone numbers',
                    'Call history and conversation logs',
                    'Analytics data and performance reports'
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm vm-text-secondary">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      {item}
                    </div>
                  ))}
                </div>
                <p className="text-xs vm-text-muted italic">
                  Note: Database records will be preserved for audit purposes
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-3 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
            className="flex-1 h-12 font-medium"
            style={{ 
              borderColor: 'var(--vm-border-subtle)',
              color: 'var(--vm-text-secondary)'
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 h-12 font-medium text-white"
            style={{ 
              background: isDeleting ? '#dc2626' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              border: 'none'
            }}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting Agent...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Voice Agent
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}