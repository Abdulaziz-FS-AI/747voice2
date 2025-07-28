import { CreateAssistantForm } from '@/components/assistants/create-assistant-form'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewAssistantPage() {
  return (
    <div className="container mx-auto p-6 space-y-8 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/assistants">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Assistant</h1>
          <p className="text-muted-foreground">
            Set up a new AI voice assistant for your business
          </p>
        </div>
      </div>

      <CreateAssistantForm />
    </div>
  )
}