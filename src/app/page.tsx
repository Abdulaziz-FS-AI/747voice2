'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Play, Mic, Shield, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth-context'

// Simple mouse tracking for subtle interactions
const useSimpleMouseTracking = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return mousePosition
}

// Subtle voice wave component
const VoiceWave = ({ mousePosition }: { mousePosition: { x: number, y: number } }) => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg className="w-full h-full" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: 'var(--vm-orange-primary)', stopOpacity: 0.3 }} />
            <stop offset="50%" style={{ stopColor: 'var(--vm-violet)', stopOpacity: 0.5 }} />
            <stop offset="100%" style={{ stopColor: 'var(--vm-cyan)', stopOpacity: 0.3 }} />
          </linearGradient>
        </defs>
        
        {/* Horizontal voice wave */}
        <path
          d={`M 0 200 Q 200 ${180 + mousePosition.y * 0.2} 400 200 T 800 200`}
          stroke="url(#waveGradient)"
          strokeWidth="2"
          fill="none"
          className="voice-wave"
        />
        
        {/* Secondary wave */}
        <path
          d={`M 0 220 Q 200 ${200 + mousePosition.y * 0.15} 400 220 T 800 220`}
          stroke="url(#waveGradient)"
          strokeWidth="1"
          fill="none"
          opacity="0.6"
          className="voice-wave-secondary"
        />
      </svg>
    </div>
  )
}

// Bass bars component
const BassBars = ({ mousePosition }: { mousePosition: { x: number, y: number } }) => {
  const bars = Array.from({ length: 12 }, (_, i) => i)
  
  return (
    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex items-end gap-2 pointer-events-none">
      {bars.map((bar, index) => (
        <motion.div
          key={bar}
          className="bass-bar"
          style={{
            width: '4px',
            background: 'var(--vm-gradient-brand)',
            borderRadius: '2px',
            height: `${20 + Math.sin((index + mousePosition.x * 0.1) * 0.5) * 15}px`,
          }}
          animate={{
            height: `${20 + Math.sin((index + Date.now() * 0.002) * 0.5) * 15 + mousePosition.y * 0.3}px`
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()
  const { user } = useAuth()
  const mousePosition = useSimpleMouseTracking()

  return (
    <div className="min-h-screen" style={{ background: 'var(--vm-background)' }}>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Subtle Background Effects */}
        <VoiceWave mousePosition={mousePosition} />
        <BassBars mousePosition={mousePosition} />
        
        <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Badge className="mb-6 px-4 py-2" style={{ background: 'var(--vm-orange-pale)', color: 'var(--vm-orange-primary)', border: '1px solid var(--vm-orange-primary)' }}>
              Voice AI Technology
            </Badge>
            
            <h1 className="text-6xl md:text-7xl font-bold mb-6 vm-text-gradient">
              Voice Matrix
            </h1>
            
            <p className="text-xl md:text-2xl vm-text-secondary mb-8 max-w-2xl mx-auto leading-relaxed">
              Deploy intelligent voice agents that understand, respond, and convert. 
              Transform your business with AI-powered conversations.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  size="lg" 
                  className="px-8 py-4 text-lg font-semibold"
                  style={{ background: 'var(--vm-gradient-brand)', border: 'none' }}
                  onClick={() => router.push(user ? '/dashboard' : '/signup')}
                >
                  {user ? 'Go to Dashboard' : 'Start Free Trial'}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="px-8 py-4 text-lg font-semibold"
                  style={{ borderColor: 'var(--vm-orange-primary)', color: 'var(--vm-orange-primary)' }}
                >
                  <Play className="mr-2 h-5 w-5" />
                  Watch Demo
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 vm-text-primary">
              Powerful Voice Agents
            </h2>
            <p className="text-xl vm-text-secondary max-w-2xl mx-auto">
              Everything you need to deploy, manage, and scale your voice AI operations.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Mic,
                title: "Smart Voice Agents",
                description: "Deploy AI agents that understand context and respond naturally to customer inquiries."
              },
              {
                icon: Shield,
                title: "Enterprise Security",
                description: "Bank-grade security and compliance features to protect your business data."
              },
              {
                icon: BarChart3,
                title: "Real-time Analytics",
                description: "Track performance, monitor conversations, and optimize your voice operations."
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                whileHover={{ y: -10 }}
                className="p-8 rounded-2xl"
                style={{ background: 'var(--vm-surface)', border: '1px solid var(--vm-border-subtle)' }}
              >
                <div className="p-3 rounded-xl mb-6 inline-block" style={{ background: 'var(--vm-gradient-brand)' }}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4 vm-text-primary">{feature.title}</h3>
                <p className="vm-text-secondary leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 vm-text-primary">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl vm-text-secondary mb-8 max-w-2xl mx-auto">
            Join thousands of companies using Voice Matrix to automate conversations and drive growth.
          </p>
          
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              size="lg" 
              className="px-8 py-4 text-lg font-semibold"
              style={{ background: 'var(--vm-gradient-brand)', border: 'none' }}
              onClick={() => router.push(user ? '/dashboard' : '/signup')}
            >
              {user ? 'Go to Dashboard' : 'Get Started Today'}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </motion.div>
      </section>
    </div>
  )
}