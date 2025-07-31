'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, Play, Mic, Shield, BarChart3, Users, CheckCircle, Star, Menu, X, Phone, Zap, Globe, Headphones } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth-context'

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

// Header component
const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl" 
            style={{ background: 'rgba(15, 15, 20, 0.95)', borderBottom: '1px solid var(--vm-border-default)' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <motion.div 
            className="flex items-center gap-3"
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-10 h-10 rounded-xl overflow-hidden" style={{ background: 'var(--vm-gradient-primary)' }}>
              <svg className="w-full h-full p-1" viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="3" className="text-yellow-400"/>
                <rect x="25" y="45" width="50" height="10" rx="5" fill="currentColor" className="text-yellow-400"/>
                <text x="50" y="35" textAnchor="middle" className="text-white text-xs font-bold" fontSize="8">ARTIFICIAL</text>
                <text x="50" y="75" textAnchor="middle" className="text-white text-xs font-bold" fontSize="8">INTELLIGENCE</text>
                <circle cx="50" cy="50" r="8" fill="currentColor" className="text-yellow-400"/>
                <rect x="47" y="30" width="6" height="40" fill="currentColor" className="text-yellow-400"/>
                <circle cx="50" cy="30" r="4" fill="currentColor" className="text-yellow-400"/>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--vm-primary-light)' }}>Voice Matrix</h1>
              <p className="text-xs" style={{ color: 'var(--vm-neutral-400)' }}>AI Voice Platform</p>
            </div>
          </motion.div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="transition-colors hover:text-purple-400" style={{ color: 'var(--vm-neutral-200)' }}>Features</a>
            <a href="#pricing" className="transition-colors hover:text-purple-400" style={{ color: 'var(--vm-neutral-200)' }}>Pricing</a>
            <a href="#testimonials" className="transition-colors hover:text-purple-400" style={{ color: 'var(--vm-neutral-200)' }}>Reviews</a>
            <a href="#contact" className="transition-colors hover:text-purple-400" style={{ color: 'var(--vm-neutral-200)' }}>Contact</a>
          </nav>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <Button onClick={() => router.push('/dashboard')} style={{ background: 'var(--vm-gradient-primary)', color: '#FFFFFF' }}>
                Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => router.push('/login')} style={{ color: 'var(--vm-primary-light)' }}>
                  Sign In
                </Button>
                <Button onClick={() => router.push('/signup')} style={{ background: 'var(--vm-gradient-primary)', color: '#FFFFFF' }}>
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden py-4 border-t" style={{ borderColor: 'var(--vm-border-default)' }}
          >
            <nav className="flex flex-col gap-4">
              <a href="#features" style={{ color: 'var(--vm-neutral-200)' }} onClick={() => setIsMenuOpen(false)}>Features</a>
              <a href="#pricing" style={{ color: 'var(--vm-neutral-200)' }} onClick={() => setIsMenuOpen(false)}>Pricing</a>
              <a href="#testimonials" style={{ color: 'var(--vm-neutral-200)' }} onClick={() => setIsMenuOpen(false)}>Reviews</a>
              <a href="#contact" style={{ color: 'var(--vm-neutral-200)' }} onClick={() => setIsMenuOpen(false)}>Contact</a>
              <div className="flex flex-col gap-2 pt-4 border-t" style={{ borderColor: 'var(--vm-border-default)' }}>
                {user ? (
                  <Button onClick={() => router.push('/dashboard')} style={{ background: 'var(--vm-gradient-primary)', color: '#FFFFFF' }}>
                    Dashboard
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => router.push('/login')} style={{ borderColor: 'var(--vm-neutral-700)', color: 'var(--vm-neutral-200)' }}>Sign In</Button>
                    <Button onClick={() => router.push('/signup')} style={{ background: 'var(--vm-gradient-primary)', color: '#FFFFFF' }}>Get Started</Button>
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

export default function HomePage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { mousePosition, isScrolling } = useOptimizedMouseTracking()

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--vm-primary-dark)' }}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--vm-gradient-primary)' }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Zap className="h-8 w-8 text-white" />
            </motion.div>
          </div>
          <p style={{ color: 'var(--vm-neutral-400)' }}>Loading Voice Matrix...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--vm-primary-dark)' }}>
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Background Effects - Optimized */}
        {!isScrolling && <VoiceWave mousePosition={mousePosition} variant="primary" />}
        <OptimizedVoiceIndicators isScrolling={isScrolling} />
        
        <div className="relative z-10 text-center max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Badge className="mb-6 px-4 py-2" 
                   style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--vm-secondary-purple)', border: '1px solid var(--vm-secondary-purple)' }}>
              <Zap className="mr-2 h-4 w-4" />
              Next-Generation Voice AI Platform
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span style={{ color: 'var(--vm-primary-light)' }}>Transform Your Business with</span><br />
              <span className="vm-text-gradient">Intelligent Voice Agents</span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto leading-relaxed" style={{ color: 'var(--vm-neutral-200)' }}>
              Deploy AI-powered voice agents that understand, respond, and convert customers 24/7. 
              Increase engagement by 300% and reduce operational costs by 70%.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  size="lg" 
                  className="px-8 py-4 text-lg font-semibold"
                  style={{ background: 'var(--vm-gradient-primary)', border: 'none', color: '#FFFFFF' }}
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
                  style={{ borderColor: 'var(--vm-secondary-purple)', color: 'var(--vm-secondary-purple)' }}
                >
                  <Play className="mr-2 h-5 w-5" />
                  Watch Demo
                </Button>
              </motion.div>
            </div>

            {/* Social Proof with Enhanced Animation */}
            <motion.div 
              className="flex flex-col items-center gap-6 relative"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.8 }}
            >
              {/* Optimized Bass Bars Animation */}
              <div className="relative w-full max-w-3xl h-16 mb-8">
                <OptimizedBassBars mousePosition={mousePosition} isScrolling={isScrolling} count={30} variant="social" />
              </div>
              
              {/* Social Proof Text */}
              <motion.div 
                className="flex flex-col items-center gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 0.8 }}
              >
                <p className="text-sm font-medium" style={{ color: 'var(--vm-neutral-400)' }}>Trusted by 2,500+ companies worldwide</p>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map((star, index) => (
                    <motion.div
                      key={star}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.8 + index * 0.1, duration: 0.3 }}
                    >
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    </motion.div>
                  ))}
                  <motion.span 
                    className="ml-2 font-medium"
                    style={{ color: 'var(--vm-neutral-200)' }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 2.3, duration: 0.6 }}
                  >
                    4.9/5 from 1,200+ reviews
                  </motion.span>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 relative">
        {!isScrolling && <VoiceWave mousePosition={mousePosition} variant="secondary" />}
        
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: 'var(--vm-primary-light)' }}>
              Everything You Need for Voice AI Success
            </h2>
            <p className="text-xl max-w-3xl mx-auto" style={{ color: 'var(--vm-neutral-200)' }}>
              Deploy, manage, and scale your voice operations with enterprise-grade tools and analytics.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Mic,
                title: "Smart Voice Agents",
                description: "Deploy AI agents that understand context, handle complex conversations, and provide human-like responses to customer inquiries."
              },
              {
                icon: Shield,
                title: "Enterprise Security",
                description: "Bank-grade security and compliance features protect your business data with end-to-end encryption and SOC 2 certification."
              },
              {
                icon: BarChart3,
                title: "Real-time Analytics",
                description: "Track performance, monitor conversations, and optimize your voice operations with detailed insights and reporting."
              },
              {
                icon: Users,
                title: "Team Collaboration",
                description: "Manage multiple agents, assign team roles, and collaborate effectively with built-in workflow management tools."
              },
              {
                icon: Globe,
                title: "Global Reach",
                description: "Support 50+ languages and dialects with localized voice models and cultural understanding capabilities."
              },
              {
                icon: Headphones,
                title: "24/7 Support",
                description: "Get expert help whenever you need it with our dedicated support team and comprehensive documentation."
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="p-8 rounded-2xl relative group"
                style={{ background: 'var(--vm-primary-surface)', border: '1px solid var(--vm-border-default)' }}
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/0 via-orange-500/5 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="relative z-10">
                  <div className="p-3 rounded-xl mb-6 inline-block" style={{ background: 'var(--vm-gradient-primary)' }}>
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--vm-primary-light)' }}>{feature.title}</h3>
                  <p className="leading-relaxed" style={{ color: 'var(--vm-neutral-200)' }}>{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 relative">
        {!isScrolling && <VoiceWave mousePosition={mousePosition} variant="accent" />}
        
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: 'var(--vm-primary-light)' }}>
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl max-w-2xl mx-auto" style={{ color: 'var(--vm-neutral-200)' }}>
              Choose the perfect plan for your business. Start free, scale as you grow.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Starter",
                price: "Free",
                description: "Perfect for trying out Voice Matrix",
                features: ["500 free minutes/month", "1 voice agent", "Basic analytics", "Email support"],
                cta: "Start Free",
                popular: false
              },
              {
                name: "Professional",
                price: "$49",
                description: "Best for growing businesses",
                features: ["5,000 minutes/month", "5 voice agents", "Advanced analytics", "Priority support", "Custom integrations"],
                cta: "Start Trial",
                popular: true
              },
              {
                name: "Enterprise",
                price: "Custom",
                description: "For large organizations",
                features: ["Unlimited minutes", "Unlimited agents", "Custom AI models", "Dedicated support", "White-label options"],
                cta: "Contact Sales",
                popular: false
              }
            ].map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className={`p-8 rounded-2xl relative ${plan.popular ? 'ring-2 ring-orange-500' : ''}`}
                style={{ 
                  background: 'var(--vm-surface)', 
                  border: '1px solid var(--vm-border-subtle)'
                }}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-4 py-1"
                         style={{ background: 'var(--vm-gradient-primary)', color: '#FFFFFF' }}>
                    Most Popular
                  </Badge>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--vm-primary-light)' }}>{plan.name}</h3>
                  <div className="mb-2">
                    <span className="text-4xl font-bold" style={{ color: 'var(--vm-primary-light)' }}>{plan.price}</span>
                    {plan.price !== "Free" && plan.price !== "Custom" && <span style={{ color: 'var(--vm-neutral-400)' }}>/month</span>}
                  </div>
                  <p style={{ color: 'var(--vm-neutral-200)' }}>{plan.description}</p>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span style={{ color: 'var(--vm-neutral-200)' }}>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  style={plan.popular ? { background: 'var(--vm-gradient-primary)', color: '#FFFFFF' } : { borderColor: 'var(--vm-secondary-purple)', color: 'var(--vm-secondary-purple)' }}
                >
                  {plan.cta}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: 'var(--vm-primary-light)' }}>
              Loved by Thousands of Companies
            </h2>
            <p className="text-xl max-w-2xl mx-auto" style={{ color: 'var(--vm-neutral-200)' }}>
              See what our customers are saying about Voice Matrix.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Sarah Johnson",
                title: "Head of Customer Success",
                company: "TechFlow Inc",
                content: "Voice Matrix transformed our customer service. We've seen a 300% increase in customer satisfaction and reduced response times by 80%.",
                rating: 5
              },
              {
                name: "Michael Chen",
                title: "Operations Director", 
                company: "Global Solutions",
                content: "The AI agents handle complex queries better than we expected. It's like having 24/7 expert staff without the overhead costs.",
                rating: 5
              },
              {
                name: "Emily Rodriguez",
                title: "Founder",
                company: "StartupX",
                content: "As a startup, Voice Matrix gave us enterprise-level voice capabilities from day one. The ROI has been incredible.",
                rating: 5
              }
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className="p-6 rounded-2xl"
                style={{ background: 'var(--vm-primary-surface)', border: '1px solid var(--vm-border-default)' }}
              >
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="mb-6 leading-relaxed" style={{ color: 'var(--vm-neutral-200)' }}>"{testimonial.content}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center"
                       style={{ background: 'var(--vm-gradient-primary)' }}>
                    <span className="text-white font-semibold">{testimonial.name.charAt(0)}</span>
                  </div>
                  <div>
                    <div className="font-semibold" style={{ color: 'var(--vm-primary-light)' }}>{testimonial.name}</div>
                    <div className="text-sm" style={{ color: 'var(--vm-neutral-400)' }}>{testimonial.title}, {testimonial.company}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 relative">
        {!isScrolling && <VoiceWave mousePosition={mousePosition} variant="primary" />}
        <OptimizedBassBars mousePosition={mousePosition} isScrolling={isScrolling} count={25} variant="wide" />
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center relative z-10"
        >
          <h2 className="text-4xl md:text-6xl font-bold mb-6 vm-text-gradient">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto" style={{ color: 'var(--vm-neutral-200)' }}>
            Join thousands of companies using Voice Matrix to automate conversations, 
            increase engagement, and drive growth.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                size="lg" 
                className="px-8 py-4 text-lg font-semibold"
                style={{ background: 'var(--vm-gradient-primary)', border: 'none', color: '#FFFFFF' }}
                onClick={() => router.push(user ? '/dashboard' : '/signup')}
              >
                {user ? 'Go to Dashboard' : 'Start Free Trial Today'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                variant="outline" 
                size="lg" 
                className="px-8 py-4 text-lg font-semibold"
                style={{ borderColor: 'var(--vm-secondary-purple)', color: 'var(--vm-secondary-purple)' }}
              >
                <Phone className="mr-2 h-5 w-5" />
                Schedule Demo
              </Button>
            </motion.div>
          </div>
          
          <p className="text-sm" style={{ color: 'var(--vm-neutral-400)' }}>
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer id="contact" className="py-16 px-6 border-t" style={{ borderColor: 'var(--vm-border-default)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl" style={{ background: 'var(--vm-gradient-primary)' }}>
                  <Mic className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: 'var(--vm-primary-light)' }}>Voice Matrix</h3>
                  <p className="text-sm" style={{ color: 'var(--vm-neutral-400)' }}>AI Voice Platform</p>
                </div>
              </div>
              <p className="mb-4 max-w-md" style={{ color: 'var(--vm-neutral-200)' }}>
                Transform your business with intelligent voice agents that understand, respond, and convert customers 24/7.
              </p>
              <p className="text-sm" style={{ color: 'var(--vm-neutral-400)' }}>
                © 2024 Voice Matrix. All rights reserved.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4" style={{ color: 'var(--vm-primary-light)' }}>Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="transition-colors hover:text-purple-400" style={{ color: 'var(--vm-neutral-200)' }}>Features</a></li>
                <li><a href="#pricing" className="transition-colors hover:text-purple-400" style={{ color: 'var(--vm-neutral-200)' }}>Pricing</a></li>
                <li><a href="/dashboard" className="transition-colors hover:text-purple-400" style={{ color: 'var(--vm-neutral-200)' }}>Dashboard</a></li>
                <li><a href="/docs" className="transition-colors hover:text-purple-400" style={{ color: 'var(--vm-neutral-200)' }}>Documentation</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4" style={{ color: 'var(--vm-primary-light)' }}>Company</h4>
              <ul className="space-y-2">
                <li><a href="/about" className="transition-colors hover:text-purple-400" style={{ color: 'var(--vm-neutral-200)' }}>About</a></li>
                <li><a href="/careers" className="transition-colors hover:text-purple-400" style={{ color: 'var(--vm-neutral-200)' }}>Careers</a></li>
                <li><a href="/contact" className="transition-colors hover:text-purple-400" style={{ color: 'var(--vm-neutral-200)' }}>Contact</a></li>
                <li><a href="/privacy" className="transition-colors hover:text-purple-400" style={{ color: 'var(--vm-neutral-200)' }}>Privacy</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}