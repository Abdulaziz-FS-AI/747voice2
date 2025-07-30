'use client'

import { useState, useMemo } from 'react'
import { Search, Play, Pause, User, Filter, Star } from 'lucide-react'
import { 
  VAPI_VOICES,
  VOICE_CATEGORIES,
  VoiceOption,
  VoiceCategory,
  getVoicesByCategory,
  getRecommendedVoices,
  getVoicesByGender,
  searchVoices 
} from '@/lib/voices'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface VoiceSelectorProps {
  selectedVoice?: string
  onVoiceSelect: (voiceId: string) => void
  className?: string
}

type FilterType = 'all' | 'recommended'

export function VoiceSelector({ selectedVoice, onVoiceSelect, className }: VoiceSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<VoiceCategory | 'all'>('all')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [playingVoice, setPlayingVoice] = useState<string | null>(null)

  // Filter voices based on search, category, and filter type
  const filteredVoices = useMemo(() => {
    let voices = VAPI_VOICES

    // Apply search filter
    if (searchQuery) {
      voices = searchVoices(searchQuery)
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      voices = voices.filter(voice => voice.category === selectedCategory)
    }

    // Apply special filters
    switch (filterType) {
      case 'recommended':
        voices = voices.filter(voice => voice.recommended)
        break
    }

    return voices
  }, [searchQuery, selectedCategory, filterType])

  // Group voices by category
  const groupedVoices = useMemo(() => {
    const groups: Record<VoiceCategory, VoiceOption[]> = {
      professional: [],
      friendly: [],
      energetic: [],
      soothing: []
    }

    filteredVoices.forEach(voice => {
      groups[voice.category].push(voice)
    })

    // Sort each group by recommended first, then alphabetically
    Object.keys(groups).forEach(category => {
      groups[category as VoiceCategory].sort((a, b) => {
        if (a.recommended && !b.recommended) return -1
        if (!a.recommended && b.recommended) return 1
        return a.name.localeCompare(b.name)
      })
    })

    return groups
  }, [filteredVoices])

  const handlePlayPreview = (voiceId: string) => {
    if (playingVoice === voiceId) {
      setPlayingVoice(null)
      // Stop playing audio
    } else {
      setPlayingVoice(voiceId)
      // Start playing audio preview
      // Note: This would integrate with VAPI's voice preview API
      console.log('Playing voice preview for:', voiceId)
      
      // Simulate audio playing for 3 seconds
      setTimeout(() => {
        setPlayingVoice(null)
      }, 3000)
    }
  }


  const renderVoiceCard = (voice: VoiceOption) => {
    const isSelected = selectedVoice === voice.id
    const isPlaying = playingVoice === voice.id
    const categoryInfo = VOICE_CATEGORIES[voice.category]

    return (
      <div
        key={voice.id}
        className={`
          relative p-6 rounded-xl border transition-all duration-300 cursor-pointer hover:scale-[1.02]
          ${isSelected 
            ? 'vm-glow border-[var(--vm-primary)] bg-gradient-to-br from-[var(--vm-primary)]/10 to-transparent' 
            : 'border-[var(--vm-border)] bg-[var(--vm-surface)] hover:border-[var(--vm-primary)]/50'
          }
        `}
        style={{
          background: isSelected 
            ? `linear-gradient(135deg, ${categoryInfo.color}15 0%, transparent 100%)`
            : 'var(--vm-surface)'
        }}
        onClick={() => onVoiceSelect(voice.id)}
      >
        {/* Recommended Badge */}
        {voice.recommended && (
          <div className="absolute -top-2 -right-2">
            <Badge 
              className="text-xs font-bold px-2 py-1"
              style={{
                background: 'var(--vm-primary)',
                color: 'var(--vm-background)'
              }}
            >
              <Star className="h-3 w-3 mr-1" />
              RECOMMENDED
            </Badge>
          </div>
        )}

        {/* Voice Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div 
              className="h-12 w-12 rounded-full flex items-center justify-center text-2xl"
              style={{ background: `${categoryInfo.color}20` }}
            >
              🎤
            </div>
            
            {/* Name and Basic Info */}
            <div>
              <h3 className="font-bold text-lg text-[var(--vm-text-primary)] mb-1">
                {voice.name}
              </h3>
              <div className="flex items-center gap-2 text-sm text-[var(--vm-text-secondary)]">
                <Badge variant="outline" className="text-xs">
                  {voice.age} years old
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {voice.accent}
                </Badge>
              </div>
            </div>
          </div>

          {/* Play Button */}
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={(e) => {
              e.stopPropagation()
              handlePlayPreview(voice.id)
            }}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" style={{ color: 'var(--vm-primary)' }} />
            ) : (
              <Play className="h-4 w-4" style={{ color: 'var(--vm-primary)' }} />
            )}
          </Button>
        </div>

        {/* Voice Characteristics */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-1 mb-2">
            {voice.characteristics.slice(0, 4).map(characteristic => (
              <Badge key={characteristic} variant="secondary" className="text-xs">
                {characteristic}
              </Badge>
            ))}
            {voice.characteristics.length > 4 && (
              <Badge variant="secondary" className="text-xs">
                +{voice.characteristics.length - 4} more
              </Badge>
            )}
          </div>
        </div>

        {/* Personality Traits */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {voice.personality.map(trait => (
              <Badge 
                key={trait} 
                className="text-xs"
                style={{
                  background: `${categoryInfo.color}30`,
                  color: categoryInfo.color,
                  border: `1px solid ${categoryInfo.color}50`
                }}
              >
                {trait}
              </Badge>
            ))}
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-[var(--vm-text-secondary)] leading-relaxed">
          {voice.description}
        </p>

        {/* Selection Indicator */}
        {isSelected && (
          <div 
            className="absolute inset-0 rounded-xl border-2 pointer-events-none"
            style={{ borderColor: 'var(--vm-primary)' }}
          />
        )}

        {/* Playing Indicator */}
        {isPlaying && (
          <div className="absolute top-4 left-4">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: 'var(--vm-primary)' }} />
              <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: 'var(--vm-primary)', animationDelay: '0.2s' }} />
              <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: 'var(--vm-primary)', animationDelay: '0.4s' }} />
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="vm-heading text-2xl font-bold mb-2">Select Voice</h2>
        <p className="vm-text-muted">
          Choose the perfect voice that represents your brand and connects with your audience.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4 mb-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--vm-text-secondary)]" />
          <Input
            placeholder="Search voices by name, accent, or characteristics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 vm-input"
          />
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('all')}
            className={filterType === 'all' ? 'vm-button-primary' : ''}
          >
            <Filter className="h-4 w-4 mr-2" />
            All Voices
          </Button>
          <Button
            variant={filterType === 'recommended' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('recommended')}
            className={filterType === 'recommended' ? 'vm-button-primary' : ''}
          >
            <Star className="h-4 w-4 mr-2" />
            Recommended
          </Button>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
            className={selectedCategory === 'all' ? 'vm-button-primary' : ''}
          >
            All Categories
          </Button>
          {Object.entries(VOICE_CATEGORIES).map(([key, category]) => (
            <Button
              key={key}
              variant={selectedCategory === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(key as VoiceCategory)}
              className={selectedCategory === key ? 'vm-button-primary' : ''}
              style={{
                borderColor: selectedCategory === key ? category.color : undefined,
                color: selectedCategory === key ? 'var(--vm-background)' : category.color,
                background: selectedCategory === key ? category.gradient : undefined
              }}
            >
              <span className="mr-2">{category.icon}</span>
              {category.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Voices Grid by Category */}
      <div className="space-y-8">
        {Object.entries(groupedVoices).map(([categoryKey, voices]) => {
          if (voices.length === 0) return null
          
          const categoryInfo = VOICE_CATEGORIES[categoryKey as VoiceCategory]
          
          return (
            <div key={categoryKey}>
              {/* Category Header */}
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="h-12 w-12 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: categoryInfo.gradient }}
                >
                  <span style={{ color: 'var(--vm-background)' }}>
                    {categoryInfo.icon}
                  </span>
                </div>
                <div>
                  <h3 className="vm-heading text-xl font-bold" style={{ color: categoryInfo.color }}>
                    {categoryInfo.name}
                  </h3>
                  <p className="text-sm vm-text-muted">{categoryInfo.description}</p>
                </div>
              </div>

              {/* Voices Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {voices.map(renderVoiceCard)}
              </div>
            </div>
          )
        })}
      </div>

      {/* No Results */}
      {filteredVoices.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🎤</div>
          <h3 className="vm-heading text-lg font-semibold mb-2">No voices found</h3>
          <p className="vm-text-muted">
            Try adjusting your search terms or filters to find the perfect voice.
          </p>
        </div>
      )}
    </div>
  )
}