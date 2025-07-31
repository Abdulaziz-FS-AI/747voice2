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
            description += ` (${successfulDeletes} deleted from VAPI)`
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Assistant
          </DialogTitle>
          <DialogDescription className="text-left">
            This action cannot be undone. This will permanently delete the assistant
            and remove all associated data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Assistant Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">{assistant.name}</span>
              <Badge variant={assistant.is_active ? 'default' : 'secondary'}>
                {assistant.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              <div>Company: {assistant.config?.companyName || 'Not set'}</div>
              {assistant.vapi_assistant_id && (
                <div>Vapi ID: {assistant.vapi_assistant_id.slice(0, 8)}...</div>
              )}
            </div>
          </div>

          {/* Assigned Phone Numbers */}
          {!loadingPhones && assignedPhones.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-orange-800">
                    Assigned Phone Numbers ({assignedPhones.length})
                  </p>
                  <div className="space-y-1">
                    {assignedPhones.map((phone) => (
                      <div key={phone.id} className="text-sm text-orange-700">
                        • {phone.phone_number} ({phone.friendly_name})
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-orange-600 mt-2">
                    These phone numbers will be deleted from VAPI and unassigned in your account.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">
                  Warning: This will also delete:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• The assistant from your VAPI account</li>
                  <li>• All assigned phone numbers from VAPI</li>
                  <li>• Call history and transcripts (preserved in database)</li>
                  <li>• Associated analytics and reports</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Assistant
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}