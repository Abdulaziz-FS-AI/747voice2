'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion'
import { ArrowRight, Play, Check, Star, MessageSquare, Phone, BarChart3, Users, Shield, Zap, Volume2, Mic, Brain, Sparkles, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth-context'

// Mouse tracking hook
const useMousePosition = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener('mousemove', updateMousePosition)
    return () => window.removeEventListener('mousemove', updateMousePosition)
  }, [])

  return mousePosition
}

// Particle system component
const ParticleSystem = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Particle properties
    const particles: Array<{
      x: number
      y: number
      vx: number
      vy: number
      opacity: number
      size: number
    }> = []

    // Create particles
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.2,
        size: Math.random() * 2 + 1
      })
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((particle, index) => {
        // Update position
        particle.x += particle.vx
        particle.y += particle.vy

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width
        if (particle.x > canvas.width) particle.x = 0
        if (particle.y < 0) particle.y = canvas.height
        if (particle.y > canvas.height) particle.y = 0

        // Draw particle
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 107, 53, ${particle.opacity})`
        ctx.fill()

        // Draw connections
        particles.slice(index + 1).forEach(otherParticle => {
          const dx = particle.x - otherParticle.x
          const dy = particle.y - otherParticle.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 120) {
            ctx.beginPath()
            ctx.moveTo(particle.x, particle.y)
            ctx.lineTo(otherParticle.x, otherParticle.y)
            ctx.strokeStyle = `rgba(255, 107, 53, ${0.1 * (1 - distance / 120)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        })
      })

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  )
}

// Animated waveform component
const AnimatedWaveform = () => {
  return (
    <div className="flex items-center justify-center h-32 gap-1">
      {Array.from({ length: 40 }).map((_, i) => (
        <motion.div
          key={i}
          className="w-1 bg-gradient-to-t from-orange-600 to-orange-400 rounded-full"
          animate={{
            height: [
              Math.random() * 60 + 20,
              Math.random() * 80 + 40,
              Math.random() * 40 + 10,
              Math.random() * 70 + 30
            ]
          }}
          transition={{
            duration: 1.5 + Math.random(),
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.05
          }}
        />
      ))}
    </div>
  )
}

// Mouse follower component
const MouseFollower = () => {
  const mousePosition = useMousePosition()

  return (
    <motion.div
      className="fixed pointer-events-none z-50"
      animate={{
        x: mousePosition.x - 20,
        y: mousePosition.y - 20
      }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 30
      }}
    >
      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 opacity-20 blur-sm" />
    </motion.div>
  )
}

function HomeContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '50%'])

  useEffect(() => {
    if (!loading && user) {
      console.log('User authenticated, redirecting to dashboard:', user.email)
      router.push('/dashboard')
    }
  }, [user, loading, router])

  useEffect(() => {
    const error = searchParams.get('error')
    if (error) {
      console.error('Auth error from URL:', error)
    }
  }, [searchParams])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center vm-neural-grid" style={{ background: 'var(--vm-void)' }}>
        <div className="text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="vm-text-display mb-8 vm-text-gradient"
          >
            Voice Matrix
          </motion.h1>
          <motion.div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-2 border-t-transparent rounded-full mx-auto vm-glow-pulse"
              style={{ borderColor: 'var(--vm-orange-primary)', borderTopColor: 'transparent' }}
            />
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 w-12 h-12 rounded-full mx-auto"
              style={{ background: 'var(--vm-gradient-glow)' }}
            />
          </motion.div>
        </div>
      </div>
    )
  }

  const features = [
    {
      icon: Brain,
      title: "Neural AI Processing",
      description: "Advanced neural networks that understand context, emotion, and intent with human-like precision",
      color: "var(--vm-violet)"
    },
    {
      icon: Mic,
      title: "24/7 Voice Intelligence", 
      description: "Round-the-clock AI assistants with natural speech patterns and real-time conversation adaptation",
      color: "var(--vm-cyan)"
    },
    {
      icon: BarChart3,
      title: "Predictive Analytics",
      description: "AI-powered insights that predict lead quality, conversion probability, and optimal follow-up timing",
      color: "var(--vm-emerald)"
    },
    {
      icon: Users,
      title: "Smart Lead Scoring",
      description: "Automatic qualification using advanced conversation analysis and behavioral pattern recognition",
      color: "var(--vm-warning)"
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Military-grade encryption with SOC 2 compliance and zero-trust architecture",
      color: "var(--vm-error)"
    },
    {
      icon: Sparkles,
      title: "One-Click Deployment",
      description: "Deploy sophisticated AI assistants instantly with our revolutionary template system",
      color: "var(--vm-orange-primary)"
    }
  ]

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "CEO & Founder",
      company: "Prime Properties Group",
      content: "Voice Matrix didn't just improve our lead generation—it revolutionized our entire sales process. We're capturing 15x more qualified leads.",
      rating: 5,
      avatar: "👩‍💼"
    },
    {
      name: "Michael Chen", 
      role: "VP of Sales",
      company: "Growth Realty Network",
      content: "The AI's ability to understand and qualify leads is honestly better than our top human agents. It's like having a sales genius working 24/7.",
      rating: 5,
      avatar: "👨‍💼"
    },
    {
      name: "Lisa Rodriguez",
      role: "Operations Director",
      company: "Metro Homes International",
      content: "Implementation was seamless. Our AI assistant was handling complex conversations within minutes. The ROI has been extraordinary.",
      rating: 5,
      avatar: "👩‍🚀"
    }
  ]

  const stats = [
    { value: "15x", label: "Lead Conversion Increase", prefix: "+" },
    { value: "24/7", label: "Intelligent Availability", prefix: "" },
    { value: "97%", label: "Accuracy Rate", prefix: "" },
    { value: "<60s", label: "Setup Time", prefix: "" }
  ]

  return (
    <div className="min-h-screen vm-neural-grid" style={{ background: 'var(--vm-void)' }}>
      <MouseFollower />
      <ParticleSystem />
      
      {/* Neural Matrix Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-0 w-full z-40 vm-glass"
        style={{ 
          background: 'rgba(0, 0, 0, 0.9)',
          borderBottom: '1px solid var(--vm-border-subtle)',
          backdropFilter: 'blur(20px)'
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-3"
            >
              <motion.div 
                className="w-12 h-12 rounded-xl flex items-center justify-center vm-energy-pulse" 
                style={{ background: 'var(--vm-gradient-brand)' }}
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                <Radio className="w-7 h-7 text-white" />
              </motion.div>
              <h1 className="text-2xl font-bold vm-text-gradient font-display">
                Voice Matrix
              </h1>
            </motion.div>
            
            <div className="flex items-center gap-4">
              {user ? (
                <Link href="/dashboard">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button className="vm-button-primary">
                      Dashboard
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </motion.div>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button className="vm-button-secondary">Sign In</Button>
                    </motion.div>
                  </Link>
                  <Link href="/signup">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button className="vm-button-primary">Get Started</Button>
                    </motion.div>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.header>

      {/* Hero Section with Advanced Animations */}
      <section className="relative pt-32 pb-20 px-6 lg:px-8 overflow-hidden">
        <motion.div
          style={{ y }}
          className="absolute inset-0 opacity-10"
        >
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full opacity-30" 
               style={{ background: 'radial-gradient(circle, var(--vm-orange-primary) 0%, transparent 70%)' }} />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full opacity-20"
               style={{ background: 'radial-gradient(circle, var(--vm-violet) 0%, transparent 70%)' }} />
        </motion.div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <Badge className="mb-8 vm-badge text-sm px-4 py-2">
                <Sparkles className="w-4 h-4 mr-2" />
                Next-Generation AI Voice Technology
              </Badge>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="vm-text-hero mb-12"
            >
              Transform Every Call Into
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="block vm-text-gradient vm-float"
              >
                Qualified Revenue
              </motion.span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl mb-12 max-w-4xl mx-auto leading-relaxed vm-text-secondary"
            >
              Revolutionary AI voice assistants that understand, engage, and convert prospects with human-like intelligence. 
              Never miss a lead with our 24/7 neural-powered conversation platform.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-6 justify-center mb-16"
            >
              {user ? (
                <Link href="/dashboard">
                  <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                    <Button size="lg" className="vm-button-primary text-lg px-10 py-6 h-14">
                      Launch Dashboard
                      <ArrowRight className="ml-3 h-5 w-5" />
                    </Button>
                  </motion.div>
                </Link>
              ) : (
                <Link href="/signup">
                  <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                    <Button size="lg" className="vm-button-primary text-lg px-10 py-6 h-14">
                      Start Free Trial
                      <ArrowRight className="ml-3 h-5 w-5" />
                    </Button>
                  </motion.div>
                </Link>
              )}
              
              <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="lg"
                  className="vm-button-secondary text-lg px-10 py-6 h-14"
                  onClick={() => {/* Demo functionality */}}
                >
                  <Play className="mr-3 h-5 w-5" />
                  Watch Demo
                </Button>
              </motion.div>
            </motion.div>

            {/* Animated Waveform Visualization */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.8 }}
              className="mb-16"
            >
              <AnimatedWaveform />
            </motion.div>

            {/* Enhanced Stats with Animations */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="text-center p-6 rounded-2xl"
                  style={{ 
                    background: 'var(--vm-gradient-surface)',
                    border: '1px solid var(--vm-border-subtle)'
                  }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.6, delay: 1.2 + index * 0.1 }}
                    className="text-4xl font-bold mb-2 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent"
                  >
                    {stat.prefix}{stat.value}
                  </motion.div>
                  <div className="text-sm font-medium" style={{ color: 'var(--vm-gray-400)' }}>
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section with Advanced Animations */}
      <section className="py-32 px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-6" style={{ color: 'var(--vm-pure)' }}>
              Revolutionary AI Technology
            </h2>
            <p className="text-xl max-w-3xl mx-auto leading-relaxed" style={{ color: 'var(--vm-gray-300)' }}>
              Experience the future of conversational AI with our enterprise-grade voice intelligence platform
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="vm-card-feature p-8 group cursor-pointer"
              >
                <motion.div
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.6 }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg"
                  style={{ 
                    background: `linear-gradient(135deg, ${feature.color}, ${feature.color}90)`,
                  }}
                >
                  <feature.icon className="w-8 h-8 text-white" />
                </motion.div>
                
                <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--vm-pure)' }}>
                  {feature.title}
                </h3>
                <p className="leading-relaxed" style={{ color: 'var(--vm-gray-300)' }}>
                  {feature.description}
                </p>

                <motion.div
                  initial={{ width: 0 }}
                  whileHover={{ width: "100%" }}
                  transition={{ duration: 0.3 }}
                  className="h-0.5 mt-6 rounded-full"
                  style={{ background: feature.color }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Voice Preview Section */}
      <section className="py-32 px-6 lg:px-8 relative">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-6" style={{ color: 'var(--vm-pure)' }}>
              Experience the Voice Difference
            </h2>
            <p className="text-xl max-w-3xl mx-auto leading-relaxed" style={{ color: 'var(--vm-gray-300)' }}>
              Listen to our AI assistants handle real conversations with natural, engaging responses
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="vm-card p-12 max-w-2xl mx-auto"
          >
            <div className="flex items-center justify-center mb-8">
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-24 h-24 rounded-full flex items-center justify-center cursor-pointer shadow-2xl"
                style={{ background: 'var(--vm-gradient-brand)' }}
              >
                <Play className="w-10 h-10 text-white ml-1" />
              </motion.div>
            </div>
            
            <h3 className="text-2xl font-semibold mb-4" style={{ color: 'var(--vm-pure)' }}>
              Real Estate Lead Qualification Demo
            </h3>
            <p className="mb-6" style={{ color: 'var(--vm-gray-300)' }}>
              Hear how our AI handles a complex lead qualification call with natural conversation flow
            </p>
            
            <div className="flex items-center justify-center gap-4">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-3 h-3 rounded-full"
                style={{ background: 'var(--vm-orange-primary)' }}
              />
              <span className="text-sm" style={{ color: 'var(--vm-gray-400)' }}>
                2:34 Duration
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-32 px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-6" style={{ color: 'var(--vm-pure)' }}>
              Trusted by Industry Leaders
            </h2>
            <p className="text-xl max-w-3xl mx-auto leading-relaxed" style={{ color: 'var(--vm-gray-300)' }}>
              Join thousands of professionals who've transformed their business with Voice Matrix
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="vm-card p-8 relative"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  transition={{ duration: 0.4, delay: index * 0.1 + 0.3 }}
                  viewport={{ once: true }}
                  className="flex mb-6"
                >
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.1 + 0.4 + i * 0.1 }}
                      viewport={{ once: true }}
                    >
                      <Star className="w-5 h-5 fill-current" style={{ color: 'var(--vm-warning)' }} />
                    </motion.div>
                  ))}
                </motion.div>
                
                <blockquote className="text-lg mb-8 leading-relaxed italic" style={{ color: 'var(--vm-gray-100)' }}>
                  "{testimonial.content}"
                </blockquote>
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" 
                       style={{ background: 'var(--vm-gradient-brand)' }}>
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold" style={{ color: 'var(--vm-pure)' }}>
                      {testimonial.name}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--vm-gray-400)' }}>
                      {testimonial.role}
                    </div>
                    <div className="text-sm font-medium" style={{ color: 'var(--vm-orange-light)' }}>
                      {testimonial.company}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section with Magnetic Effects */}
      <section className="py-32 px-6 lg:px-8 relative overflow-hidden">
        <motion.div
          className="absolute inset-0 opacity-5"
          animate={{ 
            background: [
              'radial-gradient(circle at 20% 50%, var(--vm-orange-primary) 0%, transparent 50%)',
              'radial-gradient(circle at 80% 50%, var(--vm-violet) 0%, transparent 50%)',
              'radial-gradient(circle at 20% 50%, var(--vm-orange-primary) 0%, transparent 50%)'
            ]
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl sm:text-6xl font-bold mb-8" style={{ color: 'var(--vm-pure)' }}>
              Ready to Transform Your
              <span className="block bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                Business Growth?
              </span>
            </h2>
            
            <p className="text-xl mb-12 max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--vm-gray-300)' }}>
              Join thousands of professionals who never miss a lead with our revolutionary AI voice assistants
            </p>
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              viewport={{ once: true }}
              className="flex flex-col sm:flex-row gap-6 justify-center mb-12"
            >
              {user ? (
                <Link href="/dashboard">
                  <motion.div 
                    whileHover={{ scale: 1.05, y: -3 }} 
                    whileTap={{ scale: 0.95 }}
                    className="group"
                  >
                    <Button size="lg" className="vm-button-primary text-lg px-12 py-6 h-16 shadow-2xl">
                      <motion.span
                        whileHover={{ x: -5 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        Launch Dashboard
                      </motion.span>
                      <motion.div
                        whileHover={{ x: 5 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <ArrowRight className="ml-3 h-6 w-6" />
                      </motion.div>
                    </Button>
                  </motion.div>
                </Link>
              ) : (
                <Link href="/signup">
                  <motion.div 
                    whileHover={{ scale: 1.05, y: -3 }} 
                    whileTap={{ scale: 0.95 }}
                    className="group"
                  >
                    <Button size="lg" className="vm-button-primary text-lg px-12 py-6 h-16 shadow-2xl">
                      <motion.span
                        whileHover={{ x: -5 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        Start Free Trial
                      </motion.span>
                      <motion.div
                        whileHover={{ x: 5 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <ArrowRight className="ml-3 h-6 w-6" />
                      </motion.div>
                    </Button>
                  </motion.div>
                </Link>
              )}
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              viewport={{ once: true }}
              className="text-sm"
              style={{ color: 'var(--vm-gray-400)' }}
            >
              ⚡ Instant setup • 🔒 Enterprise security • 💰 No credit card required
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Premium Footer */}
      <footer className="py-20 px-6 lg:px-8 relative" style={{ 
        background: 'var(--vm-surface)',
        borderTop: '1px solid var(--vm-border-subtle)' 
      }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="md:col-span-1"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--vm-gradient-brand)' }}>
                  <Radio className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold" style={{ color: 'var(--vm-pure)' }}>
                  Voice Matrix
                </h3>
              </div>
              <p className="leading-relaxed" style={{ color: 'var(--vm-gray-400)' }}>
                Revolutionary AI voice assistants for the future of business communication.
              </p>
            </motion.div>
            
            {[
              {
                title: "Product", 
                links: ["Features", "Pricing", "Integrations", "API Documentation"]
              },
              {
                title: "Company",
                links: ["About Us", "Careers", "Press", "Contact"]
              },
              {
                title: "Support",
                links: ["Help Center", "Documentation", "Status", "Security"]
              }
            ].map((column, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <h4 className="font-semibold mb-6" style={{ color: 'var(--vm-pure)' }}>
                  {column.title}
                </h4>
                <ul className="space-y-4">
                  {column.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <motion.a
                        href="#"
                        whileHover={{ x: 5 }}
                        className="transition-colors hover:text-orange-400"
                        style={{ color: 'var(--vm-gray-400)' }}
                      >
                        {link}
                      </motion.a>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
          
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
            className="border-t pt-12 mt-16 text-center"
            style={{ borderColor: 'var(--vm-border-subtle)' }}
          >
            <p style={{ color: 'var(--vm-gray-400)' }}>
              © 2024 Voice Matrix. All rights reserved. Built with ❤️ for the future of AI.
            </p>
          </motion.div>
        </div>
      </footer>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--vm-void)' }}>
        <div className="text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold mb-4"
            style={{ color: 'var(--vm-orange-primary)' }}
          >
            Voice Matrix
          </motion.h1>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-t-transparent rounded-full mx-auto"
            style={{ borderColor: 'var(--vm-orange-primary)', borderTopColor: 'transparent' }}
          />
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}
