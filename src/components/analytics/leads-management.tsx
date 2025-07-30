'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Search, 
  Filter, 
  Download, 
  Phone, 
  Mail, 
  Calendar,
  Star,
  Clock,
  TrendingUp,
  User
} from 'lucide-react'

interface Lead {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  company: string
  lead_quality: 'hot' | 'warm' | 'cool' | 'cold'
  lead_score: number
  primary_intent: string
  recommended_action: string
  call_time: string
  assistant_name: string
  sentiment_score: number
  engagement_score: number
  detected_topics: string[]
  extraction_confidence: number
}

interface LeadsData {
  leads: Lead[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  stats: {
    total: number
    recentCount: number
    byQuality: {
      hot: number
      warm: number
      cool: number
      cold: number
    }
  }
}

const LeadQualityBadge = ({ quality }: { quality: string }) => {
  const variants = {
    hot: { variant: 'destructive' as const, label: '🔥 Hot' },
    warm: { variant: 'secondary' as const, label: '🟡 Warm' },
    cool: { variant: 'outline' as const, label: '🔵 Cool' },
    cold: { variant: 'outline' as const, label: '❄️ Cold' }
  }
  
  const config = variants[quality as keyof typeof variants] || variants.cold
  
  return <Badge variant={config.variant}>{config.label}</Badge>
}

const LeadDetailModal = ({ lead, isOpen, onClose }: { 
  lead: Lead | null
  isOpen: boolean
  onClose: () => void 
}) => {
  if (!lead) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{lead.first_name} {lead.last_name}</span>
            <LeadQualityBadge quality={lead.lead_quality} />
          </DialogTitle>
          <DialogDescription>
            Lead Score: {lead.lead_score}/100 • Confidence: {(lead.extraction_confidence * 100).toFixed(0)}%
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Contact Information */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {lead.email && (
                  <div className="flex items-center text-sm">
                    <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{lead.email}</span>
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-center text-sm">
                    <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{lead.phone}</span>
                  </div>
                )}
                {lead.company && (
                  <div className="flex items-center text-sm">
                    <User className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{lead.company}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Call Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Sentiment:</span>
                  <span className={
                    lead.sentiment_score > 0.3 ? 'text-green-600' :
                    lead.sentiment_score < -0.3 ? 'text-red-600' : 'text-gray-600'
                  }>
                    {lead.sentiment_score > 0.3 ? 'Positive' :
                     lead.sentiment_score < -0.3 ? 'Negative' : 'Neutral'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Engagement:</span>
                  <span>{lead.engagement_score}/100</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Assistant:</span>
                  <span>{lead.assistant_name}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Intent and Topics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Conversation Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium">Primary Intent: </span>
                  <Badge variant="outline">{lead.primary_intent}</Badge>
                </div>
                {lead.detected_topics && lead.detected_topics.length > 0 && (
                  <div>
                    <span className="text-sm font-medium">Topics Discussed: </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {lead.detected_topics.map((topic, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recommended Action */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                Recommended Action
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{lead.recommended_action}</p>
              <div className="flex gap-2 mt-3">
                {lead.email && (
                  <Button size="sm" variant="outline">
                    <Mail className="h-4 w-4 mr-1" />
                    Email
                  </Button>
                )}
                {lead.phone && (
                  <Button size="sm" variant="outline">
                    <Phone className="h-4 w-4 mr-1" />
                    Call
                  </Button>
                )}
                <Button size="sm" variant="outline">
                  <Calendar className="h-4 w-4 mr-1" />
                  Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function LeadsManagement() {
  const [data, setData] = useState<LeadsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [qualityFilter, setQualityFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(25)

  const fetchLeads = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString()
      })
      
      if (qualityFilter) {
        params.append('quality', qualityFilter)
      }

      const response = await fetch(`/api/analytics/leads?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch leads')
      }
      
      const result = await response.json()
      if (result.success) {
        setData(result.data)
      } else {
        throw new Error(result.error || 'Unknown error')
      }
    } catch (err) {
      console.error('Leads fetch error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeads()
  }, [currentPage, qualityFilter])

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead)
    setShowDetailModal(true)
  }

  const filteredLeads = data?.leads.filter(lead => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      lead.first_name?.toLowerCase().includes(search) ||
      lead.last_name?.toLowerCase().includes(search) ||
      lead.email?.toLowerCase().includes(search) ||
      lead.phone?.includes(search) ||
      lead.company?.toLowerCase().includes(search)
    )
  }) || []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading leads...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error loading leads: {error}</p>
          <Button onClick={fetchLeads}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lead Management</h1>
          <p className="text-muted-foreground">
            Manage and follow up with generated leads
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Leads
        </Button>
      </div>

      {/* Stats Cards */}
      {data?.stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {data.stats.recentCount} in last 7 days
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Hot Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{data.stats.byQuality.hot}</div>
              <p className="text-xs text-muted-foreground">Need immediate attention</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Warm Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{data.stats.byQuality.warm}</div>
              <p className="text-xs text-muted-foreground">Follow up within 24h</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Cool Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{data.stats.byQuality.cool}</div>
              <p className="text-xs text-muted-foreground">Nurture campaign</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={qualityFilter} onValueChange={setQualityFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by quality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Quality</SelectItem>
                <SelectItem value="hot">Hot Leads</SelectItem>
                <SelectItem value="warm">Warm Leads</SelectItem>
                <SelectItem value="cool">Cool Leads</SelectItem>
                <SelectItem value="cold">Cold Leads</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leads ({filteredLeads.length})</CardTitle>
          <CardDescription>
            Click on a lead to view detailed information and take actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Quality</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Intent</TableHead>
                <TableHead>Call Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => (
                <TableRow 
                  key={lead.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleLeadClick(lead)}
                >
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {lead.first_name} {lead.last_name}
                      </div>
                      {lead.company && (
                        <div className="text-sm text-muted-foreground">
                          {lead.company}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {lead.email && <div>{lead.email}</div>}
                      {lead.phone && <div>{lead.phone}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <LeadQualityBadge quality={lead.lead_quality} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Star className="h-4 w-4 mr-1 text-yellow-500" />
                      {lead.lead_score}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{lead.primary_intent}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-sm">
                      <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                      {new Date(lead.call_time).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      {lead.email && (
                        <Button size="sm" variant="ghost" onClick={(e) => e.stopPropagation()}>
                          <Mail className="h-3 w-3" />
                        </Button>
                      )}
                      {lead.phone && (
                        <Button size="sm" variant="ghost" onClick={(e) => e.stopPropagation()}>
                          <Phone className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {data?.pagination && data.pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, data.pagination.total)} of {data.pagination.total} leads
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(data.pagination.pages, p + 1))}
                  disabled={currentPage === data.pagination.pages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lead Detail Modal */}
      <LeadDetailModal
        lead={selectedLead}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
      />
    </div>
  )
}