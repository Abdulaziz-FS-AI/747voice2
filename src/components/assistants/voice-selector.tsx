'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Search, Play } from 'lucide-react'
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
      className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer rounded-lg transition-colors"
      onClick={() => {
        onVoiceSelect(voice.id)
        setIsOpen(false)
      }}
    >
      {/* Voice Avatar */}
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0">
        <span className="text-white text-sm font-medium">
          {voice.gender === 'Male' ? '👨' : '👩'}
        </span>
      </div>

      {/* Voice Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-medium text-sm text-gray-900">{voice.name}</h3>
          {voice.recommended && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
              Recommended
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
          <span>{voice.age} year old</span>
          <span>{voice.gender}</span>
          <span>{voice.accent}</span>
        </div>

        {/* Characteristics */}
        <div className="flex flex-wrap gap-1">
          {voice.characteristics.slice(0, 3).map(char => (
            <Badge key={char} variant="outline" className="text-xs px-1.5 py-0.5">
              {char}
            </Badge>
          ))}
          {voice.personality.slice(0, 2).map(trait => (
            <Badge key={trait} variant="outline" className="text-xs px-1.5 py-0.5">
              {trait}
            </Badge>
          ))}
        </div>
      </div>

      {/* Play Button */}
      <Button
        variant="ghost"
        size="sm"
        className="flex-shrink-0 w-8 h-8 p-0"
        onClick={(e) => {
          e.stopPropagation()
          console.log('Play voice preview:', voice.id)
        }}
      >
        <Play className="w-3 h-3" />
      </Button>
    </div>
  )

  return (
    <div className={className}>
      {/* Voice Selector Dropdown */}
      <div className="relative" ref={dropdownRef}>
        {/* Selected Voice Display */}
        <div
          className="w-full p-3 border border-gray-300 rounded-lg bg-white cursor-pointer flex items-center justify-between hover:border-gray-400 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center gap-3">
            {selectedVoiceData ? (
              <>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                  <span className="text-white text-xs">
                    {selectedVoiceData.gender === 'Male' ? '👨' : '👩'}
                  </span>
                </div>
                <span className="font-medium text-sm">{selectedVoiceData.name}</span>
              </>
            ) : (
              <span className="text-gray-500 text-sm">Select a voice...</span>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>

        {/* Dropdown Content */}
        {isOpen && (
          <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-96 overflow-hidden border border-gray-200 shadow-lg">
            {/* Search */}
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search voice..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-sm h-9"
                />
              </div>
            </div>

            {/* Voice List */}
            <div className="max-h-64 overflow-y-auto">
              {filteredVoices.map(renderVoiceOption)}
              
              {filteredVoices.length === 0 && (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No voices found
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Selected Voice Details */}
      {selectedVoiceData && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm">{selectedVoiceData.name}</h4>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => console.log('Play voice preview:', selectedVoiceData.id)}
            >
              <Play className="w-3 h-3 mr-1" />
              Preview
            </Button>
          </div>
          <p className="text-xs text-gray-600 mb-2">{selectedVoiceData.description}</p>
          <div className="flex flex-wrap gap-1">
            {selectedVoiceData.characteristics.map(char => (
              <Badge key={char} variant="secondary" className="text-xs px-1.5 py-0.5">
                {char}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}