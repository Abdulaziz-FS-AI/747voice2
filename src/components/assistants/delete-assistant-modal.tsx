'use client'

import { useState } from 'react'
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
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'
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
        toast({
          title: 'Success',
          description: 'Assistant deleted successfully'
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

          {/* Warning */}
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">
                  Warning: This will also delete:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• All call history and transcripts</li>
                  <li>• Associated analytics and reports</li>
                  <li>• The assistant from your Vapi account</li>
                  <li>• Any phone number assignments</li>
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