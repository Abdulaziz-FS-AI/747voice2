'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Search, Play, Volume2 } from 'lucide-react'
import { VAPI_VOICES, getVoiceById } from '@/lib/voices'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

interface VoiceSelectorProps {
  selectedVoice?: string
  onVoiceSelect: (voiceId: string) => void
  className?: string
}

export function VoiceSelector({ selectedVoice, onVoiceSelect, className }: VoiceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredVoices = VAPI_VOICES.filter(voice =>
    voice.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    voice.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    voice.accent.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedVoiceData = selectedVoice ? getVoiceById(selectedVoice) : null

  const renderVoiceOption = (voice: typeof VAPI_VOICES[0]) => (
    <div
      key={voice.id}
      className="flex items-start gap-3 p-3 hover:bg-gray-800/80 cursor-pointer transition-all duration-200 border-b border-gray-800/50 last:border-b-0"
      onClick={() => {
        onVoiceSelect(voice.id)
        setIsOpen(false)
      }}
    >
      {/* Compact Voice Avatar */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-sm">
        <span className="text-white text-xs font-medium">
          {voice.gender === 'Male' ? '👨' : '👩'}
        </span>
      </div>

      {/* Voice Info - Compact Layout */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-white truncate">{voice.name}</h3>
            {voice.recommended && (
              <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30 text-xs px-1.5 py-0 leading-tight">
                ★
              </Badge>
            )}
          </div>
          
          {/* Inline Play Button */}
          <Button
            variant="ghost"
            size="sm"
            className="flex-shrink-0 w-6 h-6 p-0 text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              console.log('Play voice preview:', voice.id)
            }}
          >
            <Play className="w-3 h-3" />
          </Button>
        </div>
        
        {/* Condensed Info Line */}
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-1.5">
          <span>{voice.age}</span>
          <span>•</span>
          <span>{voice.gender}</span>
          <span>•</span>
          <span className="truncate">{voice.accent}</span>
        </div>

        {/* Compact Characteristics */}
        <div className="flex flex-wrap gap-1">
          {voice.characteristics.slice(0, 2).map(char => (
            <Badge key={char} variant="outline" className="text-xs px-1.5 py-0 border-gray-600 text-gray-300 bg-gray-800/30 leading-tight">
              {char}
            </Badge>
          ))}
          {voice.personality.slice(0, 1).map(trait => (
            <Badge key={trait} variant="outline" className="text-xs px-1.5 py-0 border-gray-600 text-gray-300 bg-gray-800/30 leading-tight">
              {trait}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className={className}>
      {/* Voice Selector Dropdown */}
      <div className="relative" ref={dropdownRef}>
        {/* Selected Voice Display - Compact */}
        <div
          className="w-full p-3 border border-gray-700 rounded-lg bg-gray-900 cursor-pointer flex items-center justify-between hover:border-orange-400 transition-all duration-200 group"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {selectedVoiceData ? (
              <>
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-white text-xs">
                    {selectedVoiceData.gender === 'Male' ? '👨' : '👩'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm text-white block truncate">{selectedVoiceData.name}</span>
                  <span className="text-xs text-gray-400 truncate">{selectedVoiceData.accent}</span>
                </div>
              </>
            ) : (
              <span className="text-gray-400 text-sm">Select a voice...</span>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform group-hover:text-orange-400 ${isOpen ? 'rotate-180' : ''}`} />
        </div>

        {/* Dropdown Content - Optimized Height */}
        {isOpen && (
          <Card className="absolute top-full left-0 right-0 mt-2 z-50 max-h-80 overflow-hidden bg-gray-900 border border-gray-700 shadow-2xl rounded-lg">
            {/* Search */}
            <div className="p-3 border-b border-gray-700/50 bg-gray-800/30">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search voice..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-sm h-8 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-orange-400 focus:ring-1 focus:ring-orange-400/20"
                />
              </div>
            </div>

            {/* Voice List - Scrollable */}
            <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-orange-500/20 scrollbar-track-transparent">
              {filteredVoices.map(renderVoiceOption)}
              
              {filteredVoices.length === 0 && (
                <div className="p-6 text-center text-gray-400 text-sm">
                  No voices found matching "{searchQuery}"
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Selected Voice Details - Improved Layout */}
      {selectedVoiceData && (
        <div className="mt-4 p-4 bg-gradient-to-br from-gray-800/80 to-gray-800/60 rounded-lg border border-gray-700/50">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-sm">
                <span className="text-white text-sm font-medium">
                  {selectedVoiceData.gender === 'Male' ? '👨' : '👩'}
                </span>
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm leading-tight">{selectedVoiceData.name}</h4>
                <p className="text-xs text-gray-400">{selectedVoiceData.age} year old • {selectedVoiceData.gender} • {selectedVoiceData.accent}</p>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs bg-gray-700/80 border-gray-600 text-gray-300 hover:bg-orange-500/10 hover:border-orange-400 hover:text-orange-300 transition-all duration-200"
              onClick={() => console.log('Play voice preview:', selectedVoiceData.id)}
            >
              <Volume2 className="w-3 h-3 mr-1.5" />
              Preview
            </Button>
          </div>
          
          {/* Description */}
          <p className="text-xs text-gray-300 mb-3 leading-relaxed">{selectedVoiceData.description}</p>
          
          {/* Characteristics */}
          <div className="flex flex-wrap gap-1.5">
            {selectedVoiceData.characteristics.map(char => (
              <Badge key={char} className="text-xs px-2 py-1 bg-gray-700/60 text-gray-300 border-gray-600/50 hover:bg-orange-500/10 hover:border-orange-500/30 transition-colors">
                {char}
              </Badge>
            ))}
            {selectedVoiceData.personality.map(trait => (
              <Badge key={trait} className="text-xs px-2 py-1 bg-orange-500/10 text-orange-300 border-orange-500/30">
                {trait}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}