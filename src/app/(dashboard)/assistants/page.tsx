import { Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Phone, Bot, Clock, Users } from 'lucide-react'
import { getServerSession } from 'next-auth'
import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'

async function getAssistants() {
  const session = await getServerSession()
  if (!session) {
    redirect('/login')
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/assistants`, {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('Failed to fetch assistants')
  }

  return response.json()
}

function AssistantCard({ assistant }: { assistant: any }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{assistant.name}</CardTitle>
            <CardDescription>
              {assistant.agent_name} • {assistant.company_name}
            </CardDescription>
          </div>
          <Badge variant={assistant.is_active ? 'default' : 'secondary'}>
            {assistant.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-muted-foreground" />
            <span className="capitalize">{assistant.tone} tone</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{assistant.max_call_duration}s max</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{assistant.language}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{assistant.assistant_questions?.length || 0} questions</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href={`/assistants/${assistant.id}`}>View Details</Link>
        </Button>
        <Button asChild size="sm">
          <Link href={`/assistants/${assistant.id}/edit`}>Edit</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

function AssistantsSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <div className="h-5 w-32 bg-muted animate-pulse rounded" />
            <div className="h-4 w-48 bg-muted animate-pulse rounded mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="h-4 w-full bg-muted animate-pulse rounded" />
              <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
            </div>
          </CardContent>
          <CardFooter>
            <div className="h-9 w-24 bg-muted animate-pulse rounded" />
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

export default async function AssistantsPage() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Assistants</h1>
          <p className="text-muted-foreground">
            Manage your voice AI assistants and their configurations
          </p>
        </div>
        <Button asChild>
          <Link href="/assistants/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Assistant
          </Link>
        </Button>
      </div>

      <Suspense fallback={<AssistantsSkeleton />}>
        <AssistantsList />
      </Suspense>
    </div>
  )
}

async function AssistantsList() {
  const data = await getAssistants()
  const assistants = data.data || []

  if (assistants.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Bot className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No assistants yet</h3>
          <p className="text-muted-foreground text-center mb-6">
            Create your first AI assistant to start handling calls
          </p>
          <Button asChild>
            <Link href="/assistants/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Assistant
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {assistants.map((assistant: any) => (
        <AssistantCard key={assistant.id} assistant={assistant} />
      ))}
    </div>
  )
}