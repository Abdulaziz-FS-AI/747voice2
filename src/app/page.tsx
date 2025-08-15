'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, Play, Mic, Shield, BarChart3, Users, Star, Menu, X, Phone, Zap, Globe, Headphones, Clock, Crown, MousePointer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { usePinAuth } from '@/lib/contexts/pin-auth-context'

// Performance-optimized mouse tracking with throttling
const useOptimizedMouseTracking = () => {
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 })
  const [isScrolling, setIsScrolling] = useState(false)

  useEffect(() => {
    let animationFrameId: number
    let scrollTimeout: NodeJS.Timeout

    const handleMouseMove = (e: MouseEvent) => {
      // Skip mouse tracking while scrolling for better performance
      if (isScrolling) return
      
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
      
      animationFrameId = requestAnimationFrame(() => {
        setMousePosition({
          x: (e.clientX / window.innerWidth) * 100,
          y: (e.clientY / window.innerHeight) * 100
        })
      })
    }

    const handleScroll = () => {
      setIsScrolling(true)
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        setIsScrolling(false)
      }, 150)
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('scroll', handleScroll)
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
      clearTimeout(scrollTimeout)
    }
  }, [isScrolling])

  return { mousePosition, isScrolling }
}

// Enhanced voice wave component with more variety
const VoiceWave = ({ mousePosition, variant = 'primary' }: { mousePosition: { x: number, y: number }, variant?: 'primary' | 'secondary' | 'accent' }) => {
  const gradientId = `waveGradient-${variant}`
  const colors = {
    primary: { start: 'var(--vm-secondary-purple)', mid: 'var(--vm-accent-blue)', end: 'var(--vm-accent-teal)' },
    secondary: { start: 'var(--vm-accent-teal)', mid: 'var(--vm-success-green)', end: 'var(--vm-secondary-purple)' },
    accent: { start: 'var(--vm-secondary-purple)', mid: 'var(--vm-accent-blue)', end: 'var(--vm-success-green)' }
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg className="w-full h-full" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: colors[variant].start, stopOpacity: 0.4 }} />
            <stop offset="50%" style={{ stopColor: colors[variant].mid, stopOpacity: 0.6 }} />
            <stop offset="100%" style={{ stopColor: colors[variant].end, stopOpacity: 0.4 }} />
          </linearGradient>
        </defs>
        
        {/* Primary voice wave */}
        <path
          d={`M 0 200 Q 200 ${180 + mousePosition.y * 0.3} 400 200 T 800 200`}
          stroke={`url(#${gradientId})`}
          strokeWidth="3"
          fill="none"
          className="voice-wave"
        />
        
        {/* Secondary wave */}
        <path
          d={`M 0 220 Q 200 ${200 + mousePosition.y * 0.2} 400 220 T 800 220`}
          stroke={`url(#${gradientId})`}
          strokeWidth="2"
          fill="none"
          opacity="0.7"
          className="voice-wave-secondary"
        />
        
        {/* Tertiary wave */}
        <path
          d={`M 0 240 Q 200 ${220 + mousePosition.y * 0.1} 400 240 T 800 240`}
          stroke={`url(#${gradientId})`}
          strokeWidth="1"
          fill="none"
          opacity="0.5"
          className="voice-wave"
        />
      </svg>
    </div>
  )
}

// Performance-optimized bass bars with reduced count and CSS animations
const OptimizedBassBars = ({ mousePosition, isScrolling, count = 25, variant = 'default' }: { 
  mousePosition: { x: number, y: number },
  isScrolling: boolean,
  count?: number,
  variant?: 'default' | 'wide' | 'social'
}) => {
  const [animationTime, setAnimationTime] = useState(0)
  
  // Use RAF for time-based animation instead of Date.now()
  useEffect(() => {
    if (isScrolling) return // Pause during scroll
    
    let rafId: number
    const startTime = performance.now()
    
    const animate = (currentTime: number) => {
      const elapsed = (currentTime - startTime) / 1000 // Convert to seconds
      setAnimationTime(elapsed)
      rafId = requestAnimationFrame(animate)
    }
    
    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [isScrolling])
  
  const bars = Array.from({ length: count }, (_, i) => i)
  
  const containerClass = variant === 'social' 
    ? "absolute inset-x-0 bottom-0 flex items-end justify-center gap-[3px] pointer-events-none px-8"
    : variant === 'wide'
    ? "absolute inset-x-0 bottom-0 flex items-end justify-center gap-2 pointer-events-none px-4"
    : "absolute bottom-0 left-1/2 transform -translate-x-1/2 flex items-end gap-2 pointer-events-none"
  
  return (
    <div className={containerClass} style={{ willChange: isScrolling ? 'auto' : 'transform' }}>
      {bars.map((bar, index) => {
        const centerDistance = Math.abs(index - count / 2)
        const heightMultiplier = variant === 'social' ? 1.5 : variant === 'wide' ? 1.2 : 1
        const maxHeight = variant === 'social' ? 35 : variant === 'wide' ? 30 : 20
        
        // Pre-calculate animation values to reduce computation
        const baseHeight = 6
        const wave1 = Math.sin((index + animationTime * 3) * 1.2) * (maxHeight * 0.3) * heightMultiplier
        const wave2 = Math.cos((centerDistance + animationTime * 4) * 1.8) * 2
        const wave3 = Math.sin((index + animationTime * 6) * 2.1) * 1.5
        const mouseInfluence = isScrolling ? 0 : mousePosition.y * 0.05
        
        const finalHeight = Math.max(baseHeight, baseHeight + wave1 + wave2 + wave3 + mouseInfluence)
        
        return (
          <div
            key={bar}
            className="bass-bar transition-all duration-75 ease-linear"
            style={{
              width: variant === 'social' ? '5px' : variant === 'wide' ? '4px' : '4px',
              height: `${finalHeight}px`,
              background: index % 4 === 0 ? 'var(--vm-secondary-purple)' : 
                         index % 4 === 1 ? 'var(--vm-accent-blue)' : 
                         index % 4 === 2 ? 'var(--vm-accent-teal)' : 'var(--vm-success-green)',
              borderRadius: '2px',
              boxShadow: variant === 'social' && !isScrolling ? '0 0 6px currentColor' : undefined,
              opacity: isScrolling ? 0.6 : 1,
              willChange: isScrolling ? 'auto' : 'height, opacity'
            }}
          />
        )
      })}
    </div>
  )
}

// Simplified voice indicators with CSS animations
const OptimizedVoiceIndicators = ({ isScrolling }: { isScrolling: boolean }) => {
  const indicators = Array.from({ length: 4 }, (_, i) => i) // Reduced count
  
  if (isScrolling) return null // Don't render during scroll
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      {indicators.map((indicator, index) => (
        <div
          key={indicator}
          className="absolute w-1.5 h-1.5 rounded-full animate-pulse"
          style={{
            background: 'var(--vm-secondary-purple)',
            left: `${25 + (index * 15)}%`,
            top: `${35 + Math.sin(index) * 15}%`,
            boxShadow: '0 0 8px currentColor',
            animationDelay: `${index * 0.5}s`,
            animationDuration: '2s'
          }}
        />
      ))}
    </div>
  )
}

// Luxury Header Component
const LuxuryHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { client, isAuthenticated } = usePinAuth()
  const router = useRouter()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-luxury-obsidian/95 backdrop-blur-luxury border-b border-luxury-gold/10">
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex items-center justify-between h-20">
          {/* Luxury Logo */}
          <motion.div 
            className="flex items-center gap-4"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div className="w-12 h-12 rounded-luxury bg-luxury-gradient-gold p-0.5">
              <div className="w-full h-full rounded-luxury bg-luxury-obsidian flex items-center justify-center">
                <Crown className="w-6 h-6 text-luxury-gold" />
              </div>
            </div>
            <div>
              <h1 className="luxury-heading-3 text-luxury-platinum font-luxury-primary">Voice Matrix</h1>
              <p className="luxury-body-small text-luxury-silver">Executive Suite</p>
            </div>
          </motion.div>

          {/* Luxury Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="luxury-button-ghost transition-all duration-luxury-fast hover:text-luxury-gold">
              Features
            </a>
            <a href="#about" className="luxury-button-ghost transition-all duration-luxury-fast hover:text-luxury-gold">
              About
            </a>
            <a href="#testimonials" className="luxury-button-ghost transition-all duration-luxury-fast hover:text-luxury-gold">
              Reviews
            </a>
            <a href="#contact" className="luxury-button-ghost transition-all duration-luxury-fast hover:text-luxury-gold">
              Contact
            </a>
          </nav>

          {/* Luxury Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated && client ? (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <button 
                  onClick={() => router.push('/dashboard')} 
                  className="luxury-button-primary"
                >
                  <span>Executive Dashboard</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </motion.div>
            ) : (
              <>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <button 
                    onClick={() => router.push('/signin')} 
                    className="luxury-button-ghost"
                  >
                    Sign In
                  </button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <button 
                    onClick={() => router.push('/signup')} 
                    className="luxury-button-primary"
                  >
                    Request Access
                  </button>
                </motion.div>
              </>
            )}
          </div>

          {/* Luxury Mobile Menu Button */}
          <motion.button
            className="md:hidden p-3 rounded-luxury border border-luxury-gold/20 bg-luxury-charcoal/50 text-luxury-platinum"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </motion.button>
        </div>

        {/* Luxury Mobile Menu */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="md:hidden py-6 border-t border-luxury-gold/10 bg-luxury-charcoal/30 backdrop-blur-luxury"
          >
            <nav className="flex flex-col gap-6">
              <a href="#features" className="luxury-button-ghost text-center" onClick={() => setIsMenuOpen(false)}>Features</a>
              <a href="#about" className="luxury-button-ghost text-center" onClick={() => setIsMenuOpen(false)}>About</a>
              <a href="#testimonials" className="luxury-button-ghost text-center" onClick={() => setIsMenuOpen(false)}>Reviews</a>
              <a href="#contact" className="luxury-button-ghost text-center" onClick={() => setIsMenuOpen(false)}>Contact</a>
              <div className="flex flex-col gap-4 pt-6 border-t border-luxury-gold/10">
                {isAuthenticated && client ? (
                  <button 
                    onClick={() => router.push('/dashboard')} 
                    className="luxury-button-primary w-full"
                  >
                    Executive Dashboard
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={() => router.push('/signin')} 
                      className="luxury-button-secondary w-full"
                    >
                      Sign In
                    </button>
                    <button 
                      onClick={() => router.push('/signup')} 
                      className="luxury-button-primary w-full"
                    >
                      Request Access
                    </button>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </div>
    </header>
  )
}

export default function LuxuryHomePage() {
  const router = useRouter()
  const { client, isAuthenticated, isLoading } = usePinAuth()
  const { mousePosition, isScrolling } = useOptimizedMouseTracking()

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated && client) {
      router.push('/dashboard')
    }
  }, [client, isAuthenticated, isLoading, router])

  // Luxury loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-luxury-obsidian">
        <div className="text-center">
          <div className="w-20 h-20 rounded-luxury mx-auto mb-6 flex items-center justify-center bg-luxury-gradient-gold p-0.5">
            <div className="w-full h-full rounded-luxury bg-luxury-obsidian flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="luxury-glow"
              >
                <Crown className="h-10 w-10 text-luxury-gold" />
              </motion.div>
            </div>
          </div>
          <motion.p 
            className="luxury-body text-luxury-silver"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Loading Executive Suite...
          </motion.p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-luxury-obsidian">
      <LuxuryHeader />

      {/* Luxury Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Luxury Background Effects */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Gold Dust Particles */}
          <div className="absolute inset-0 opacity-30">
            {Array.from({ length: 50 }, (_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-luxury-gold rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [0, -20, 0],
                  opacity: [0.2, 0.8, 0.2],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>
          
          {/* Luxury Gradient Overlay */}
          <div className="absolute inset-0 bg-luxury-gradient-dark opacity-80" />
        </div>
        
        <div className="relative z-10 text-center max-w-6xl mx-auto px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            {/* Luxury Badge */}
            <motion.div 
              className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-luxury-charcoal/50 border border-luxury-gold/30 backdrop-blur-luxury mb-8"
              animate={{ 
                boxShadow: [
                  "0 0 20px rgba(212, 175, 55, 0)", 
                  "0 0 40px rgba(212, 175, 55, 0.3)", 
                  "0 0 20px rgba(212, 175, 55, 0)"
                ]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Crown className="w-5 h-5 text-luxury-gold" />
              <span className="luxury-body-small text-luxury-gold font-medium tracking-luxury-wider uppercase">
                Enterprise Edition
              </span>
            </motion.div>
            
            {/* Luxury Headline */}
            <motion.h1 
              className="luxury-heading-hero text-luxury-platinum mb-8"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
            >
              <span className="block">Elevate Your</span>
              <span className="block luxury-text-gold">
                Communication Excellence
              </span>
            </motion.h1>
            
            {/* Luxury Subtitle */}
            <motion.p 
              className="luxury-body-large text-luxury-silver max-w-4xl mx-auto mb-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 1 }}
            >
              The premier AI voice assistant platform trusted by Fortune 500 companies 
              and luxury brands worldwide. Where technology meets elegance.
            </motion.p>
            
            {/* Luxury CTA Buttons */}
            <motion.div 
              className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.8 }}
            >
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <button 
                  className="luxury-button-primary px-10 py-5 text-lg"
                  onClick={() => router.push(isAuthenticated && client ? '/dashboard' : '/signup')}
                >
                  <span>{isAuthenticated && client ? 'Executive Dashboard' : 'Request Private Demo'}</span>
                  <ArrowRight className="ml-3 h-5 w-5" />
                </button>
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <button className="luxury-button-secondary px-10 py-5 text-lg">
                  <Play className="mr-3 h-5 w-5" />
                  <span>View Case Studies</span>
                </button>
              </motion.div>
            </motion.div>

            {/* Luxury Social Proof */}
            <motion.div 
              className="flex flex-col items-center gap-8 relative"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.8 }}
            >
              {/* Luxury Voice Visualization */}
              <div className="relative w-full max-w-4xl h-20 mb-8 luxury-card-glass p-6 rounded-luxury-xl">
                <div className="flex items-center justify-center gap-2 h-full">
                  {Array.from({ length: 25 }, (_, i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-luxury-gradient-gold rounded-full"
                      animate={{
                        height: [8, 20 + Math.random() * 15, 8],
                        opacity: [0.3, 1, 0.3],
                      }}
                      transition={{
                        duration: 2 + Math.random(),
                        repeat: Infinity,
                        delay: i * 0.1,
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                </div>
              </div>
              
              {/* Luxury Social Proof Text */}
              <motion.div 
                className="flex flex-col items-center gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 0.8 }}
              >
                <p className="luxury-body-small text-luxury-silver font-medium tracking-luxury-wide uppercase">
                  Trusted by Fortune 500 Companies Worldwide
                </p>
                <div className="flex items-center gap-2">
                  {[1,2,3,4,5].map((star, index) => (
                    <motion.div
                      key={star}
                      initial={{ opacity: 0, scale: 0, rotate: -180 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      transition={{ 
                        delay: 1.8 + index * 0.15, 
                        duration: 0.6,
                        type: "spring",
                        stiffness: 200
                      }}
                    >
                      <Star className="h-6 w-6 fill-luxury-gold text-luxury-gold" />
                    </motion.div>
                  ))}
                  <motion.span 
                    className="ml-4 luxury-body text-luxury-platinum font-medium"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 2.5, duration: 0.8 }}
                  >
                    4.9/5 from 2,500+ enterprise clients
                  </motion.span>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

        {/* Luxury Scroll Indicator */}
        <motion.div 
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-luxury-gold/30 flex justify-center">
            <motion.div 
              className="w-1 h-3 bg-luxury-gold rounded-full mt-2"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <span className="luxury-body-small text-luxury-silver/50 tracking-luxury-wide">SCROLL</span>
        </motion.div>
      </section>

      {/* Luxury Features Section */}
      <section id="features" className="py-luxury-xl px-8 relative bg-luxury-charcoal/20">
        {/* Luxury Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-luxury-gradient-surface opacity-50" />
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="text-center mb-luxury-lg"
          >
            <motion.div 
              className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-luxury-gold/10 border border-luxury-gold/20 mb-8"
              whileHover={{ scale: 1.05 }}
            >
              <Crown className="w-4 h-4 text-luxury-gold" />
              <span className="luxury-body-small text-luxury-gold font-medium tracking-luxury-wider uppercase">
                Executive Features
              </span>
            </motion.div>

            <h2 className="luxury-heading-1 text-luxury-platinum mb-6 font-luxury-primary">
              Enterprise-Grade Voice Intelligence
            </h2>
            <p className="luxury-body-large text-luxury-silver max-w-4xl mx-auto">
              Sophisticated AI voice solutions designed for Fortune 500 companies who demand excellence, 
              precision, and uncompromising performance.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Crown,
                title: "Executive Voice Concierge",
                description: "Deploy AI voice assistants trained on executive communication patterns, handling complex negotiations and high-stakes conversations with diplomatic precision.",
                premium: true
              },
              {
                icon: Shield,
                title: "Military-Grade Security",
                description: "Zero-trust architecture with end-to-end encryption, SOC 2 Type II compliance, and dedicated security teams protecting your most sensitive communications.",
                premium: true
              },
              {
                icon: BarChart3,
                title: "Strategic Intelligence Dashboard",
                description: "Real-time executive reporting with predictive analytics, market insights, and performance metrics that drive strategic decision-making.",
                premium: false
              },
              {
                icon: Users,
                title: "Global Enterprise Orchestration",
                description: "Seamlessly coordinate voice operations across multiple time zones, departments, and subsidiaries with enterprise-grade workflow automation.",
                premium: false
              },
              {
                icon: Globe,
                title: "Multinational Voice Fluency",
                description: "Native-level communication in 75+ languages with cultural nuance understanding for international business relationships.",
                premium: false
              },
              {
                icon: Headphones,
                title: "White-Glove Concierge Support",
                description: "Dedicated account managers, 24/7 priority support, and custom solution architecture from our executive services team.",
                premium: true
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.15 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="luxury-card group relative overflow-hidden"
              >
                {/* Premium Badge */}
                {feature.premium && (
                  <div className="absolute top-4 right-4 z-20">
                    <div className="px-3 py-1 rounded-full bg-luxury-gold/20 border border-luxury-gold/30">
                      <span className="luxury-body-small text-luxury-gold font-medium">PREMIUM</span>
                    </div>
                  </div>
                )}

                {/* Luxury Glow Effect */}
                <div className="absolute inset-0 bg-luxury-gradient-gold opacity-0 group-hover:opacity-10 transition-opacity duration-luxury-slow" />
                
                {/* Content */}
                <div className="relative z-10">
                  {/* Luxury Icon */}
                  <div className="w-16 h-16 rounded-luxury mb-6 bg-luxury-gradient-gold p-0.5">
                    <div className="w-full h-full rounded-luxury bg-luxury-obsidian flex items-center justify-center">
                      <feature.icon className="h-8 w-8 text-luxury-gold" />
                    </div>
                  </div>

                  <h3 className="luxury-heading-3 text-luxury-platinum mb-4 font-luxury-primary">
                    {feature.title}
                  </h3>
                  <p className="luxury-body text-luxury-silver leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Luxury Accent Line */}
                  <div className="mt-6 h-px bg-luxury-gradient-gold opacity-30 group-hover:opacity-100 transition-opacity duration-luxury-base" />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Luxury CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="text-center mt-luxury-lg"
          >
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <button className="luxury-button-primary px-10 py-5">
                <span>Schedule Executive Consultation</span>
                <ArrowRight className="ml-3 h-5 w-5" />
              </button>
            </motion.div>
            <p className="luxury-body-small text-luxury-silver/70 mt-4">
              Complimentary strategic assessment • White-glove onboarding included
            </p>
          </motion.div>
        </div>
      </section>

      {/* Luxury Premium Services Section */}
      <section id="about" className="py-luxury-xl px-8 relative bg-luxury-obsidian">
        {/* Luxury Background Pattern */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 opacity-10">
            <svg width="100%" height="100%" viewBox="0 0 100 100" className="h-full w-full">
              <defs>
                <pattern id="luxury-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-luxury-gold"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#luxury-grid)" />
            </svg>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="text-center mb-luxury-lg"
          >
            <motion.div 
              className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-luxury-platinum/10 border border-luxury-platinum/20 mb-8"
              whileHover={{ scale: 1.05 }}
            >
              <Crown className="w-4 h-4 text-luxury-platinum" />
              <span className="luxury-body-small text-luxury-platinum font-medium tracking-luxury-wider uppercase">
                Premium Services
              </span>
            </motion.div>

            <h2 className="luxury-heading-1 text-luxury-platinum mb-6 font-luxury-primary">
              Executive-Level Service Portfolio
            </h2>
            <p className="luxury-body-large text-luxury-silver max-w-4xl mx-auto">
              Comprehensive voice intelligence solutions crafted for discerning enterprises 
              who demand nothing less than perfection.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Crown,
                title: "Unlimited Voice Assistants",
                description: "Deploy an unlimited fleet of sophisticated AI voice agents, each fine-tuned for specific business functions and executive requirements.",
                tier: "platinum"
              },
              {
                icon: Clock,
                title: "Unlimited Monthly Usage",
                description: "No restrictions on conversation volume or duration. Scale your voice operations without constraints or overage fees.",
                tier: "gold"
              },
              {
                icon: Mic,
                title: "Proprietary AI Models",
                description: "Access to our most advanced proprietary voice AI models, trained on executive communication patterns and industry-specific lexicons.",
                tier: "platinum"
              },
              {
                icon: BarChart3,
                title: "Executive Intelligence Reports",
                description: "Sophisticated analytics and strategic insights delivered directly to C-suite dashboards with predictive market intelligence.",
                tier: "gold"
              },
              {
                icon: Shield,
                title: "Zero-Trust Security Architecture",
                description: "Military-grade security protocols with dedicated SOCs, compliance certifications, and bespoke security assessments.",
                tier: "platinum"
              },
              {
                icon: Headphones,
                title: "Dedicated Success Concierge",
                description: "Personal account executive, 24/7 white-glove support, and direct access to our executive engineering team.",
                tier: "gold"
              }
            ].map((service, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.15 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="luxury-card-glass text-center group relative overflow-hidden"
              >
                {/* Tier Badge */}
                <div className="absolute top-4 right-4 z-20">
                  <div className={`px-3 py-1 rounded-full border ${
                    service.tier === 'platinum' 
                      ? 'bg-luxury-platinum/20 border-luxury-platinum/30' 
                      : 'bg-luxury-gold/20 border-luxury-gold/30'
                  }`}>
                    <span className={`luxury-body-small font-medium uppercase ${
                      service.tier === 'platinum' ? 'text-luxury-platinum' : 'text-luxury-gold'
                    }`}>
                      {service.tier}
                    </span>
                  </div>
                </div>

                {/* Luxury Glow Effect */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-luxury-slow ${
                  service.tier === 'platinum' 
                    ? 'bg-luxury-gradient-platinum' 
                    : 'bg-luxury-gradient-gold'
                }`} />
                
                <div className="relative z-10 p-8">
                  {/* Luxury Icon */}
                  <div className={`w-20 h-20 rounded-luxury mx-auto mb-6 p-0.5 ${
                    service.tier === 'platinum' 
                      ? 'bg-luxury-gradient-platinum' 
                      : 'bg-luxury-gradient-gold'
                  }`}>
                    <div className="w-full h-full rounded-luxury bg-luxury-obsidian flex items-center justify-center">
                      <service.icon className={`h-10 w-10 ${
                        service.tier === 'platinum' ? 'text-luxury-platinum' : 'text-luxury-gold'
                      }`} />
                    </div>
                  </div>

                  <h3 className="luxury-heading-3 text-luxury-platinum mb-4 font-luxury-primary">
                    {service.title}
                  </h3>
                  <p className="luxury-body text-luxury-silver leading-relaxed">
                    {service.description}
                  </p>

                  {/* Luxury Accent Line */}
                  <div className={`mt-6 h-px opacity-30 group-hover:opacity-100 transition-opacity duration-luxury-base ${
                    service.tier === 'platinum' 
                      ? 'bg-luxury-gradient-platinum' 
                      : 'bg-luxury-gradient-gold'
                  }`} />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Luxury Investment Information */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="text-center mt-luxury-lg"
          >
            <div className="luxury-card-glass p-12 max-w-4xl mx-auto">
              <h3 className="luxury-heading-2 text-luxury-platinum mb-6 font-luxury-primary">
                Investment Tiers
              </h3>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="text-center">
                  <div className="luxury-text-gold luxury-heading-2 mb-2">Professional</div>
                  <div className="luxury-body text-luxury-silver mb-4">$497/month</div>
                  <div className="luxury-body-small text-luxury-silver/70">
                    For growing enterprises requiring sophisticated voice capabilities
                  </div>
                </div>
                <div className="text-center">
                  <div className="luxury-text-platinum luxury-heading-2 mb-2">Enterprise</div>
                  <div className="luxury-body text-luxury-silver mb-4">Custom Investment</div>
                  <div className="luxury-body-small text-luxury-silver/70">
                    Bespoke solutions for Fortune 500 companies
                  </div>
                </div>
              </div>
            </div>

            <motion.div 
              className="mt-8 flex flex-col sm:flex-row gap-6 justify-center"
              whileHover={{ scale: 1.01 }}
            >
              <button 
                className="luxury-button-primary px-10 py-5"
                onClick={() => router.push(isAuthenticated && client ? '/dashboard' : '/signup')}
              >
                <span>{isAuthenticated && client ? 'Executive Dashboard' : 'Request Consultation'}</span>
                <ArrowRight className="ml-3 h-5 w-5" />
              </button>
            </motion.div>
            
            <p className="luxury-body-small text-luxury-silver/50 mt-6">
              Complimentary consultation • Bespoke implementation • Executive onboarding included
            </p>
          </motion.div>
        </div>
      </section>

      {/* Luxury Fortune 500 Testimonials Section */}
      <section id="testimonials" className="py-luxury-xl px-8 relative bg-luxury-charcoal/30">
        {/* Luxury Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-luxury-gradient-surface opacity-30" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="text-center mb-luxury-lg"
          >
            <motion.div 
              className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-luxury-rose-gold/10 border border-luxury-rose-gold/20 mb-8"
              whileHover={{ scale: 1.05 }}
            >
              <Star className="w-4 h-4 text-luxury-rose-gold fill-luxury-rose-gold" />
              <span className="luxury-body-small text-luxury-rose-gold font-medium tracking-luxury-wider uppercase">
                Client Excellence
              </span>
            </motion.div>

            <h2 className="luxury-heading-1 text-luxury-platinum mb-6 font-luxury-primary">
              Trusted by Industry Leaders
            </h2>
            <p className="luxury-body-large text-luxury-silver max-w-4xl mx-auto">
              Discover why Fortune 500 executives choose Voice Matrix for their most critical 
              communication initiatives.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Victoria Sterling",
                title: "Chief Technology Officer", 
                company: "Goldman Sachs",
                content: "Voice Matrix has revolutionized our client communications. The sophistication and reliability exceed our highest expectations. A truly enterprise-grade solution.",
                rating: 5,
                logo: "GS",
                tier: "fortune-100"
              },
              {
                name: "James Morrison",
                title: "Head of Digital Innovation",
                company: "JPMorgan Chase",
                content: "The level of customization and security provided by Voice Matrix is unparalleled. It's become an integral part of our digital transformation strategy.",
                rating: 5,
                logo: "JP",
                tier: "fortune-50"
              },
              {
                name: "Alexandra Chen",
                title: "Executive Vice President",
                company: "Microsoft Corporation",
                content: "Voice Matrix delivers the enterprise scalability and intelligence we require. The ROI has exceeded our most optimistic projections by 340%.",
                rating: 5,
                logo: "MS",
                tier: "fortune-10"
              }
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="luxury-card group relative overflow-hidden"
              >
                {/* Fortune Badge */}
                <div className="absolute top-4 right-4 z-20">
                  <div className={`px-3 py-1 rounded-full border ${
                    testimonial.tier === 'fortune-10' 
                      ? 'bg-luxury-platinum/20 border-luxury-platinum/30' 
                      : testimonial.tier === 'fortune-50'
                      ? 'bg-luxury-gold/20 border-luxury-gold/30'
                      : 'bg-luxury-rose-gold/20 border-luxury-rose-gold/30'
                  }`}>
                    <span className={`luxury-body-small font-medium uppercase ${
                      testimonial.tier === 'fortune-10' 
                        ? 'text-luxury-platinum' 
                        : testimonial.tier === 'fortune-50'
                        ? 'text-luxury-gold'
                        : 'text-luxury-rose-gold'
                    }`}>
                      {testimonial.tier.replace('-', ' ')}
                    </span>
                  </div>
                </div>

                {/* Luxury Glow Effect */}
                <div className="absolute inset-0 bg-luxury-gradient-gold opacity-0 group-hover:opacity-5 transition-opacity duration-luxury-slow" />
                
                <div className="relative z-10 p-8">
                  {/* Rating Stars */}
                  <div className="flex items-center mb-6">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0, rotate: -180 }}
                        whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
                      >
                        <Star className="h-5 w-5 fill-luxury-gold text-luxury-gold mr-1" />
                      </motion.div>
                    ))}
                  </div>

                  {/* Testimonial Content */}
                  <blockquote className="luxury-body text-luxury-silver leading-relaxed mb-8 italic">
                    "{testimonial.content}"
                  </blockquote>

                  {/* Executive Profile */}
                  <div className="flex items-center gap-4">
                    {/* Company Logo */}
                    <div className="w-14 h-14 rounded-luxury bg-luxury-gradient-gold p-0.5">
                      <div className="w-full h-full rounded-luxury bg-luxury-obsidian flex items-center justify-center">
                        <span className="text-luxury-gold font-bold text-lg font-luxury-primary">
                          {testimonial.logo}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <div className="luxury-body text-luxury-platinum font-medium">
                        {testimonial.name}
                      </div>
                      <div className="luxury-body-small text-luxury-gold">
                        {testimonial.title}
                      </div>
                      <div className="luxury-body-small text-luxury-silver font-medium">
                        {testimonial.company}
                      </div>
                    </div>
                  </div>

                  {/* Luxury Accent Line */}
                  <div className="mt-6 h-px bg-luxury-gradient-gold opacity-30 group-hover:opacity-100 transition-opacity duration-luxury-base" />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Client Marquee */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mt-luxury-lg"
          >
            <div className="luxury-card-glass p-8">
              <p className="luxury-body-small text-luxury-silver text-center mb-6 tracking-luxury-wide uppercase">
                Trusted by Industry Leaders
              </p>
              <div className="flex items-center justify-center gap-12 opacity-60">
                {['Goldman Sachs', 'JPMorgan Chase', 'Microsoft', 'Apple', 'Google', 'Amazon'].map((company, index) => (
                  <motion.div
                    key={company}
                    className="luxury-body text-luxury-platinum font-medium"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    whileHover={{ opacity: 1, scale: 1.1 }}
                  >
                    {company}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Luxury Executive CTA Section */}
      <section className="py-luxury-xl px-8 relative bg-luxury-obsidian">
        {/* Luxury Background Effects */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Gold Dust Animation */}
          <div className="absolute inset-0 opacity-20">
            {Array.from({ length: 30 }, (_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-luxury-gold rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [0, -30, 0],
                  opacity: [0.1, 0.8, 0.1],
                  scale: [0.5, 1.2, 0.5],
                }}
                transition={{
                  duration: 4 + Math.random() * 3,
                  repeat: Infinity,
                  delay: Math.random() * 3,
                }}
              />
            ))}
          </div>
          
          {/* Luxury Voice Visualization */}
          <div className="absolute bottom-0 left-0 right-0 h-32 opacity-30">
            <div className="flex items-end justify-center gap-2 h-full">
              {Array.from({ length: 40 }, (_, i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-luxury-gradient-gold rounded-full"
                  animate={{
                    height: [8, 25 + Math.random() * 20, 8],
                    opacity: [0.2, 1, 0.2],
                  }}
                  transition={{
                    duration: 2 + Math.random(),
                    repeat: Infinity,
                    delay: i * 0.05,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="max-w-5xl mx-auto text-center relative z-10"
        >
          {/* Executive Badge */}
          <motion.div 
            className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-luxury-gold/10 border border-luxury-gold/30 backdrop-blur-luxury mb-8"
            animate={{ 
              boxShadow: [
                "0 0 20px rgba(212, 175, 55, 0)", 
                "0 0 60px rgba(212, 175, 55, 0.4)", 
                "0 0 20px rgba(212, 175, 55, 0)"
              ]
            }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <Crown className="w-5 h-5 text-luxury-gold" />
            <span className="luxury-body-small text-luxury-gold font-medium tracking-luxury-wider uppercase">
              Join the Elite
            </span>
          </motion.div>

          {/* Luxury Headline */}
          <h2 className="luxury-heading-hero text-luxury-platinum mb-8 font-luxury-primary">
            <span className="block">Ready to Ascend to</span>
            <span className="block luxury-text-gold">Executive Excellence?</span>
          </h2>
          
          <p className="luxury-body-large text-luxury-silver mb-12 max-w-3xl mx-auto">
            Join the exclusive ranks of Fortune 500 executives who trust Voice Matrix 
            for their most critical communication initiatives.
          </p>
          
          {/* Luxury CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <button 
                className="luxury-button-primary px-12 py-6 text-xl"
                onClick={() => router.push(isAuthenticated && client ? '/dashboard' : '/signup')}
              >
                <span>{isAuthenticated && client ? 'Executive Dashboard' : 'Request Private Consultation'}</span>
                <ArrowRight className="ml-3 h-6 w-6" />
              </button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <button className="luxury-button-secondary px-12 py-6 text-xl">
                <Phone className="mr-3 h-6 w-6" />
                <span>Schedule Executive Briefing</span>
              </button>
            </motion.div>
          </div>
          
          {/* Luxury Guarantees */}
          <div className="luxury-card-glass p-8 max-w-3xl mx-auto">
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <Shield className="w-8 h-8 text-luxury-gold mx-auto mb-3" />
                <p className="luxury-body-small text-luxury-silver">
                  <span className="text-luxury-gold font-medium">30-Day</span><br />
                  Executive Guarantee
                </p>
              </div>
              <div>
                <Crown className="w-8 h-8 text-luxury-platinum mx-auto mb-3" />
                <p className="luxury-body-small text-luxury-silver">
                  <span className="text-luxury-platinum font-medium">White-Glove</span><br />
                  Implementation
                </p>
              </div>
              <div>
                <Headphones className="w-8 h-8 text-luxury-rose-gold mx-auto mb-3" />
                <p className="luxury-body-small text-luxury-silver">
                  <span className="text-luxury-rose-gold font-medium">24/7 Priority</span><br />
                  Concierge Support
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Luxury Executive Footer */}
      <footer id="contact" className="py-luxury-lg px-8 border-t border-luxury-gold/10 bg-luxury-charcoal/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            {/* Executive Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-luxury bg-luxury-gradient-gold p-0.5">
                  <div className="w-full h-full rounded-luxury bg-luxury-obsidian flex items-center justify-center">
                    <Crown className="h-6 w-6 text-luxury-gold" />
                  </div>
                </div>
                <div>
                  <h3 className="luxury-heading-3 text-luxury-platinum font-luxury-primary">Voice Matrix</h3>
                  <p className="luxury-body-small text-luxury-gold">Executive Communication Suite</p>
                </div>
              </div>
              <p className="luxury-body text-luxury-silver mb-6 max-w-md leading-relaxed">
                The premier AI voice intelligence platform trusted by Fortune 500 executives 
                for their most critical communication initiatives.
              </p>
              
              {/* Executive Contact */}
              <div className="luxury-card-glass p-6 max-w-md">
                <h4 className="luxury-body text-luxury-platinum font-medium mb-3">Executive Inquiries</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-luxury-gold" />
                    <span className="luxury-body-small text-luxury-silver">+1 (555) MATRIX-1</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-luxury-gold" />
                    <span className="luxury-body-small text-luxury-silver">executive@voicematrix.ai</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Executive Services */}
            <div>
              <h4 className="luxury-heading-3 text-luxury-platinum font-luxury-primary mb-6">Executive Services</h4>
              <ul className="space-y-3">
                <li>
                  <a href="#features" className="luxury-body-small text-luxury-silver hover:text-luxury-gold transition-colors duration-luxury-fast">
                    Enterprise Features
                  </a>
                </li>
                <li>
                  <a href="#about" className="luxury-body-small text-luxury-silver hover:text-luxury-gold transition-colors duration-luxury-fast">
                    Premium Services
                  </a>
                </li>
                <li>
                  <a href="/dashboard" className="luxury-body-small text-luxury-silver hover:text-luxury-gold transition-colors duration-luxury-fast">
                    Executive Dashboard
                  </a>
                </li>
                <li>
                  <a href="/docs" className="luxury-body-small text-luxury-silver hover:text-luxury-gold transition-colors duration-luxury-fast">
                    Strategic Documentation
                  </a>
                </li>
              </ul>
            </div>
            
            {/* Company Information */}
            <div>
              <h4 className="luxury-heading-3 text-luxury-platinum font-luxury-primary mb-6">Executive Access</h4>
              <ul className="space-y-3">
                <li>
                  <a href="/about" className="luxury-body-small text-luxury-silver hover:text-luxury-gold transition-colors duration-luxury-fast">
                    Executive Leadership
                  </a>
                </li>
                <li>
                  <a href="/careers" className="luxury-body-small text-luxury-silver hover:text-luxury-gold transition-colors duration-luxury-fast">
                    Executive Positions
                  </a>
                </li>
                <li>
                  <a href="/contact" className="luxury-body-small text-luxury-silver hover:text-luxury-gold transition-colors duration-luxury-fast">
                    Executive Contact
                  </a>
                </li>
                <li>
                  <a href="/privacy" className="luxury-body-small text-luxury-silver hover:text-luxury-gold transition-colors duration-luxury-fast">
                    Privacy & Compliance
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Luxury Separator */}
          <div className="h-px bg-luxury-gradient-gold opacity-20 mb-8" />

          {/* Executive Footer Bottom */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-8">
              <p className="luxury-body-small text-luxury-silver/70">
                © 2024 Voice Matrix Executive Suite. All rights reserved.
              </p>
              <div className="flex items-center gap-4">
                {/* Security Badges */}
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-luxury-gold" />
                  <span className="luxury-body-small text-luxury-silver/70">SOC 2 Certified</span>
                </div>
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-luxury-platinum" />
                  <span className="luxury-body-small text-luxury-silver/70">Enterprise Grade</span>
                </div>
              </div>
            </div>
            
            {/* Executive Status */}
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-luxury-success animate-pulse" />
              <span className="luxury-body-small text-luxury-silver">All Systems Operational</span>
            </div>
          </div>

          {/* Luxury Accent Line */}
          <div className="mt-8 h-px bg-luxury-gradient-gold opacity-10" />
        </div>
      </footer>
    </div>
  )
}