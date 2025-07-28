'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CreateAssistantForm } from '@/components/assistants/create-assistant-form'
import { DashboardLayout } from '@/components/dashboard/layout'

export default function NewAssistantPage() {
  const router = useRouter()

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Create New Assistant</h1>
            <p className="text-muted-foreground">
              Set up your AI voice assistant in just a few steps
            </p>
          </div>
        </div>

        {/* Form */}
        <CreateAssistantForm />
      </div>
    </DashboardLayout>
  )
}