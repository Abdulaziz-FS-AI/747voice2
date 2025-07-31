'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/use-toast'
import type { Database } from '@/types/database'

type PhoneNumber = Database['public']['Tables']['user_phone_numbers']['Row']
type Assistant = Database['public']['Tables']['user_assistants']['Row']

interface EditPhoneNumberModalProps {
  open: boolean
  onClose: () => void
  phoneNumber: PhoneNumber | null
  onSuccess: (updatedNumber: PhoneNumber) => void
}

export function EditPhoneNumberModal({
  open,
  onClose,
  phoneNumber,
  onSuccess
}: EditPhoneNumberModalProps) {
  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [selectedAssistantId, setSelectedAssistantId] = useState<string>('')
  const [friendlyName, setFriendlyName] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      fetchAssistants()
      if (phoneNumber) {
        setSelectedAssistantId(phoneNumber.assigned_assistant_id || '')
        setFriendlyName(phoneNumber.friendly_name || '')
        setNotes(phoneNumber.notes || '')
      }
    }
  }, [open, phoneNumber])

  const fetchAssistants = async () => {
    try {
      const response = await fetch('/api/assistants')
      const data = await response.json()
      if (data.success) {
        setAssistants(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch assistants:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phoneNumber) return

    setLoading(true)
    try {
      const response = await fetch(`/api/phone-numbers/${phoneNumber.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          friendly_name: friendlyName,
          assigned_assistant_id: selectedAssistantId || null,
          notes: notes || null
        })
      })

      const data = await response.json()

      if (data.success) {
        onSuccess(data.data)
        onClose()
        toast({
          title: 'Success',
          description: 'Phone number updated successfully'
        })
      } else {
        throw new Error(data.error?.message || 'Failed to update phone number')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update phone number',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Phone Number</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="friendlyName">Label</Label>
            <Input
              id="friendlyName"
              value={friendlyName}
              onChange={(e) => setFriendlyName(e.target.value)}
              placeholder="e.g., Main Office Number"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assistant">Assigned Assistant</Label>
            <Select value={selectedAssistantId} onValueChange={setSelectedAssistantId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an assistant (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No Assignment</SelectItem>
                {assistants.map((assistant) => (
                  <SelectItem key={assistant.id} value={assistant.id}>
                    {assistant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}