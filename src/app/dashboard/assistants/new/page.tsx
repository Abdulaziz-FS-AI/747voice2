'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TemplateSelector } from '@/components/assistants/template-selector'
import { DashboardLayout } from '@/components/dashboard/layout'

export default function NewAssistantPage() {
  const router = useRouter()

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
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
            <h1 className="text-2xl font-bold">Choose Your Assistant Template</h1>
            <p className="text-muted-foreground">
              Start with a proven template or build from scratch
            </p>
          </div>
        </div>

        {/* Template Selection */}
        <TemplateSelector />
      </div>
    </DashboardLayout>
  )
}