'use client'

import { useEffect, useRef, useState, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion'
import { ArrowRight, Play, Star, Brain, Sparkles, Radio, Zap, Volume2, Mic, Activity, Shield, Users, BarChart3, Cpu, Globe, Headphones } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth-context'

// Advanced mouse tracking with velocity and trail
const useAdvancedMouseTracking = () => {
  const [mouseState, setMouseState] = useState({
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    speed: 0,
    trail: [] as Array<{ x: number, y: number, timestamp: number }>
  })

  useEffect(() => {
    let lastPosition = { x: 0, y: 0 }
    let lastTime = Date.now()

    const updateMouseState = (e: MouseEvent) => {
      const currentTime = Date.now()
      const deltaTime = currentTime - lastTime
      
      if (deltaTime === 0) return
      
      const velocity = {
        x: (e.clientX - lastPosition.x) / deltaTime,
        y: (e.clientY - lastPosition.y) / deltaTime
      }
      
      const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y)
      
      setMouseState(prev => ({
        position: { x: e.clientX, y: e.clientY },
        velocity,
        speed,
        trail: [
          ...prev.trail.slice(-20), // Keep last 20 trail points
          { x: e.clientX, y: e.clientY, timestamp: currentTime }
        ].filter(point => currentTime - point.timestamp < 1000) // Remove old points
      }))
      
      lastPosition = { x: e.clientX, y: e.clientY }
      lastTime = currentTime
    }

    window.addEventListener('mousemove', updateMouseState)
    return () => window.removeEventListener('mousemove', updateMouseState)
  }, [])

  return mouseState
}

// Ultra-vibrant particle system
const UltraVibrantParticleSystem = ({ mouseState }: { mouseState: any }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const particlesRef = useRef<Array<{
    x: number
    y: number
    vx: number
    vy: number
    life: number
    maxLife: number
    size: number
    color: string
    type: 'matrix' | 'neural' | 'voice' | 'energy'
  }>>([])

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

    // Initialize particles
    const colors = {
      matrix: '#00FF41',
      neural: '#00D4FF', 
      voice: '#FF4500',
      energy: '#FF1493'
    }

    // Create initial particle field
    for (let i = 0; i < 300; i++) {
      const types = ['matrix', 'neural', 'voice', 'energy'] as const
      particlesRef.current.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        life: Math.random() * 1000 + 500,
        maxLife: 1000,
        size: Math.random() * 3 + 1,
        color: colors[types[Math.floor(Math.random() * types.length)]],
        type: types[Math.floor(Math.random() * types.length)]
      })
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Update and draw particles
      particlesRef.current.forEach((particle, index) => {
        // Mouse attraction effect
        const mouseDistance = Math.sqrt(
          Math.pow(particle.x - mouseState.position.x, 2) + 
          Math.pow(particle.y - mouseState.position.y, 2)
        )
        
        if (mouseDistance < 200) {
          const attractionForce = (200 - mouseDistance) / 200
          const angle = Math.atan2(
            mouseState.position.y - particle.y,
            mouseState.position.x - particle.x
          )
          particle.vx += Math.cos(angle) * attractionForce * 0.001
          particle.vy += Math.sin(angle) * attractionForce * 0.001
        }
        
        // Update position
        particle.x += particle.vx
        particle.y += particle.vy
        particle.life -= 1
        
        // Boundary wrapping
        if (particle.x < 0) particle.x = canvas.width
        if (particle.x > canvas.width) particle.x = 0
        if (particle.y < 0) particle.y = canvas.height
        if (particle.y > canvas.height) particle.y = 0
        
        // Draw particle with glow effect
        const alpha = particle.life / particle.maxLife
        ctx.save()
        ctx.globalAlpha = alpha
        
        // Glow effect
        ctx.shadowBlur = 20
        ctx.shadowColor = particle.color
        
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fillStyle = particle.color
        ctx.fill()
        
        ctx.restore()
        
        // Remove dead particles
        if (particle.life <= 0) {
          particlesRef.current.splice(index, 1)
        }
      })
      
      // Add new particles near mouse
      if (mouseState.speed > 0.1 && particlesRef.current.length < 500) {
        const types = ['matrix', 'neural', 'voice', 'energy'] as const
        const randomType = types[Math.floor(Math.random() * types.length)]
        
        particlesRef.current.push({
          x: mouseState.position.x + (Math.random() - 0.5) * 50,
          y: mouseState.position.y + (Math.random() - 0.5) * 50,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          life: 1000,
          maxLife: 1000,
          size: Math.random() * 4 + 2,
          color: colors[randomType],
          type: randomType
        })
      }
      
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [mouseState])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-10"
      style={{ background: 'transparent' }}
    />
  )
}

// Neural network visualization
const NeuralNetworkVisualization = ({ mouseState }: { mouseState: any }) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [nodes, setNodes] = useState<Array<{ x: number, y: number, active: boolean, id: number }>>([])

  useEffect(() => {
    // Generate neural network nodes
    const newNodes = []
    for (let i = 0; i < 50; i++) {
      newNodes.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        active: false,
        id: i
      })
    }
    setNodes(newNodes)
  }, [])

  useEffect(() => {
    // Activate nodes near mouse
    setNodes(prev => prev.map(node => {
      const distance = Math.sqrt(
        Math.pow(node.x - mouseState.position.x, 2) + 
        Math.pow(node.y - mouseState.position.y, 2)
      )
      return {
        ...node,
        active: distance < 150
      }
    }))
  }, [mouseState.position])

  return (
    <svg
      ref={svgRef}
      className="fixed inset-0 pointer-events-none z-20"
      width="100%"
      height="100%"
    >
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Neural connections */}
      {nodes.map((node, i) => 
        nodes.slice(i + 1).map((otherNode, j) => {
          const distance = Math.sqrt(
            Math.pow(node.x - otherNode.x, 2) + 
            Math.pow(node.y - otherNode.y, 2)
          )
          if (distance < 200 && (node.active || otherNode.active)) {
            return (
              <line
                key={`${i}-${j}`}
                x1={node.x}
                y1={node.y}
                x2={otherNode.x}
                y2={otherNode.y}
                stroke="var(--vm-ai-consciousness-cyan)"
                strokeWidth="1"
                opacity={0.3}
                filter="url(#glow)"
              />
            )
          }
          return null
        })
      )}
      
      {/* Neural nodes */}
      {nodes.map(node => (
        <circle
          key={node.id}
          cx={node.x}
          cy={node.y}
          r={node.active ? 6 : 3}
          fill={node.active ? "var(--vm-neural-electric-blue)" : "var(--vm-ai-consciousness-cyan)"}
          filter="url(#glow)"
          opacity={node.active ? 1 : 0.6}
        />
      ))}
    </svg>
  )
}

// Mouse trail effect
const MouseTrailEffect = ({ mouseState }: { mouseState: any }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-30">
      {mouseState.trail.map((point: any, index: number) => {
        const age = Date.now() - point.timestamp
        const opacity = Math.max(0, 1 - age / 1000)
        const size = 6 * opacity
        
        return (
          <div
            key={`${point.timestamp}-${index}`}
            className="absolute"
            style={{
              left: point.x - size / 2,
              top: point.y - size / 2,
              width: size,
              height: size,
              background: 'var(--vm-gradient-neural-fire)',
              borderRadius: '50%',
              opacity,
              boxShadow: `0 0 ${size * 2}px var(--vm-neural-electric-blue)`
            }}
          />
        )
      })}
    </div>
  )
}

// Tilt effect hook
const useTiltEffect = () => {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [15, -15]))
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-15, 15]))
  
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    x.set((e.clientX - centerX) / rect.width)
    y.set((e.clientY - centerY) / rect.height)
  }, [x, y])
  
  const handleMouseLeave = useCallback(() => {
    x.set(0)
    y.set(0)
  }, [x, y])
  
  return { rotateX, rotateY, handleMouseMove, handleMouseLeave }
}

function HomeContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '50%'])
  
  const mouseState = useAdvancedMouseTracking()
  const heroTilt = useTiltEffect()
  const featureTilt1 = useTiltEffect()
  const featureTilt2 = useTiltEffect()
  const featureTilt3 = useTiltEffect()

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--vm-void)' }}>
        <div className="text-center">
          <motion.div
            className="relative mb-8"
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 360]
            }}
            transition={{ 
              scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
              rotate: { duration: 4, repeat: Infinity, ease: "linear" }
            }}
          >
            <div 
              className="w-24 h-24 rounded-full flex items-center justify-center mx-auto"
              style={{ 
                background: 'var(--vm-gradient-matrix-flow)',
                boxShadow: 'var(--vm-glow-consciousness)'
              }}
            >
              <Radio className="w-12 h-12 text-white" />
            </div>
            <div 
              className="absolute inset-0 rounded-full animate-ping"
              style={{ 
                border: '2px solid var(--vm-neural-electric-blue)',
                animation: 'vm-energy-pulse-wave 2s ease-out infinite'
              }}
            />
          </motion.div>
          
          <motion.h1
            className="text-4xl font-bold mb-4"
            style={{ 
              background: 'var(--vm-gradient-ai-consciousness)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Neural Matrix Loading...
          </motion.h1>
          
          <div className="flex justify-center space-x-1 mb-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                className="w-1 bg-gradient-to-t from-transparent to-current rounded-full"
                style={{ color: 'var(--vm-voice-spectrum-orange)' }}
                animate={{ 
                  height: [10, 40, 10],
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{ 
                  duration: 1.5, 
                  repeat: Infinity, 
                  delay: i * 0.1,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const features = [
    {
      icon: Brain,
      title: "Neural AI Matrix",
      description: "Revolutionary quantum neural networks that process voice with human-level consciousness and beyond",
      color: "var(--vm-neural-electric-blue)",
      gradient: "var(--vm-gradient-ai-consciousness)"
    },
    {
      icon: Mic,
      title: "Voice Consciousness", 
      description: "24/7 AI entities with advanced emotional intelligence and contextual awareness patterns",
      color: "var(--vm-voice-spectrum-orange)",
      gradient: "var(--vm-gradient-voice-spectrum)"
    },
    {
      icon: Activity,
      title: "Quantum Analytics",
      description: "Predictive intelligence systems that anticipate user needs with 99.9% accuracy rates",
      color: "var(--vm-energy-plasma-pink)",
      gradient: "var(--vm-gradient-energy-plasma)"
    },
    {
      icon: Shield,
      title: "Neural Security",
      description: "Military-grade quantum encryption with self-healing security protocols and threat prediction",
      color: "var(--vm-matrix-neon-green)",
      gradient: "var(--vm-gradient-matrix-flow)"
    },
    {
      icon: Zap,
      title: "Energy Processing",
      description: "Ultra-low latency voice processing with quantum-speed response times under 10ms",
      color: "var(--vm-tech-gold)",
      gradient: "var(--vm-gradient-quantum-field)"
    },
    {
      icon: Sparkles,
      title: "Holographic Interface",
      description: "Next-generation UI that adapts and evolves based on user interaction patterns",  
      color: "var(--vm-hologram-lime)",
      gradient: "var(--vm-gradient-holographic)"
    }
  ]

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--vm-void)' }}>
      {/* Ultra-vibrant particle system */}
      <UltraVibrantParticleSystem mouseState={mouseState} />
      
      {/* Neural network visualization */}
      <NeuralNetworkVisualization mouseState={mouseState} />
      
      {/* Mouse trail effect */}
      <MouseTrailEffect mouseState={mouseState} />
      
      {/* Matrix background grid */}
      <div 
        className="fixed inset-0 opacity-10 pointer-events-none z-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 65, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 65, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />
      
      {/* Revolutionary Header */}
      <motion.header
        className="fixed top-0 w-full z-50 backdrop-blur-xl"
        style={{ 
          background: 'rgba(0, 0, 0, 0.9)',
          borderBottom: '1px solid var(--vm-neural-electric-blue)'
        }}
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <motion.div
              className="flex items-center gap-4"
              whileHover={{ scale: 1.05 }}
            >
              <motion.div 
                className="w-12 h-12 rounded-xl flex items-center justify-center relative"
                style={{ background: 'var(--vm-gradient-matrix-flow)' }}
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <Radio className="w-7 h-7 text-white" />
                <div 
                  className="absolute inset-0 rounded-xl animate-pulse"
                  style={{ boxShadow: 'var(--vm-glow-consciousness)' }}
                />
              </motion.div>
              <div>
                <h1 
                  className="text-2xl font-bold tracking-wide"
                  style={{
                    background: 'var(--vm-gradient-holographic)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                >
                  Voice Matrix
                </h1>
                <p className="text-xs font-medium" style={{ color: 'var(--vm-ai-consciousness-cyan)' }}>
                  Neural AI Consciousness
                </p>
              </div>
            </motion.div>
            
            <div className="flex items-center gap-4">
              {user ? (
                <Link href="/dashboard">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      className="relative overflow-hidden px-6 py-3 rounded-xl font-semibold"
                      style={{ 
                        background: 'var(--vm-gradient-energy-plasma)',
                        border: 'none',
                        boxShadow: 'var(--vm-glow-plasma)'
                      }}
                    >
                      <span className="relative z-10">Neural Dashboard</span>
                      <ArrowRight className="ml-2 h-4 w-4 relative z-10" />
                      <div 
                        className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300"
                        style={{ background: 'var(--vm-gradient-holographic)' }}
                      />
                    </Button>
                  </motion.div>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button 
                        variant="outline"
                        className="border-2 rounded-xl px-6 py-3"
                        style={{ 
                          borderColor: 'var(--vm-neural-electric-blue)',
                          background: 'transparent',
                          color: 'var(--vm-neural-electric-blue)'
                        }}
                      >
                        Neural Access
                      </Button>
                    </motion.div>
                  </Link>
                  <Link href="/signup">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button 
                        className="relative overflow-hidden px-6 py-3 rounded-xl font-semibold"
                        style={{ 
                          background: 'var(--vm-gradient-matrix-flow)',
                          border: 'none',
                          boxShadow: 'var(--vm-glow-matrix)'
                        }}
                      >
                        <span className="relative z-10">Join Matrix</span>
                        <div 
                          className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300"
                          style={{ background: 'var(--vm-gradient-holographic)' }}
                        />
                      </Button>
                    </motion.div>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.header>

      {/* Ultra-vibrant Hero Section */}
      <section className="relative pt-32 pb-20 px-6 lg:px-8 min-h-screen flex items-center">
        <motion.div
          style={{ y }}
          className="absolute inset-0 opacity-20"
        >
          {/* Floating consciousness orbs */}
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 100 + i * 20,
                height: 100 + i * 20,
                background: `var(--vm-gradient-${['matrix-flow', 'voice-spectrum', 'ai-consciousness', 'energy-plasma', 'quantum-field'][i]})`,
                boxShadow: `var(--vm-glow-${['matrix', 'energy', 'neural-blue', 'plasma', 'quantum'][i]})`,
                left: `${20 + i * 15}%`,
                top: `${10 + i * 20}%`
              }}
              animate={{
                x: [0, 50, -30, 0],
                y: [0, -30, 40, 0],
                rotate: [0, 180, 360],
                scale: [1, 1.2, 0.8, 1]
              }}
              transition={{
                duration: 10 + i * 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.5
              }}
            />
          ))}
        </motion.div>

        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            <Badge 
              className="mb-8 px-6 py-3 text-sm rounded-full border-2"
              style={{ 
                background: 'rgba(0, 255, 65, 0.1)',
                borderColor: 'var(--vm-matrix-neon-green)',
                color: 'var(--vm-matrix-neon-green)',
                boxShadow: 'var(--vm-glow-matrix)'
              }}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Revolutionary Neural AI Technology
            </Badge>
          </motion.div>
          
          <motion.div
            className="vm-tilt-effect"
            style={{
              rotateX: heroTilt.rotateX,
              rotateY: heroTilt.rotateY
            }}
            onMouseMove={heroTilt.handleMouseMove}
            onMouseLeave={heroTilt.handleMouseLeave}
          >
            <motion.h1
              className="text-6xl lg:text-8xl font-bold mb-8 leading-tight"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, delay: 0.7 }}
            >
              <span 
                className="block mb-4"
                style={{
                  background: 'var(--vm-gradient-holographic)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 0 20px rgba(0, 255, 255, 0.5))'
                }}
              >
                Voice Matrix
              </span>
              <motion.span
                className="block"
                style={{
                  background: 'var(--vm-gradient-energy-plasma)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 0 30px rgba(255, 20, 147, 0.7))'
                }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                Neural Evolution
              </motion.span>
            </motion.h1>
            
            <motion.p
              className="text-2xl mb-12 max-w-4xl mx-auto leading-relaxed"
              style={{ color: 'var(--vm-ai-consciousness-cyan)' }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1 }}
            >
              Experience the future of AI voice technology with our revolutionary neural consciousness platform. 
              Transform every conversation into an intelligent, emotional connection.
            </motion.p>
          </motion.div>

          <motion.div
            className="flex flex-col sm:flex-row gap-6 justify-center mb-16"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.3 }}
          >
            {user ? (
              <Link href="/dashboard">
                <motion.div 
                  whileHover={{ scale: 1.1, y: -5 }} 
                  whileTap={{ scale: 0.95 }}
                  className="group"
                >
                  <Button 
                    size="lg" 
                    className="relative overflow-hidden px-12 py-6 text-xl font-bold rounded-2xl"
                    style={{ 
                      background: 'var(--vm-gradient-matrix-flow)',
                      border: 'none',
                      boxShadow: 'var(--vm-glow-consciousness)',
                      minWidth: '240px',
                      height: '70px'
                    }}
                  >
                    <span className="relative z-10 flex items-center">
                      Enter Matrix
                      <ArrowRight className="ml-3 h-6 w-6" />
                    </span>
                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ background: 'var(--vm-gradient-holographic)' }}
                    />
                  </Button>
                </motion.div>
              </Link>
            ) : (
              <Link href="/signup">
                <motion.div 
                  whileHover={{ scale: 1.1, y: -5 }} 
                  whileTap={{ scale: 0.95 }}
                  className="group"
                >
                  <Button 
                    size="lg" 
                    className="relative overflow-hidden px-12 py-6 text-xl font-bold rounded-2xl"
                    style={{ 
                      background: 'var(--vm-gradient-energy-plasma)',
                      border: 'none',
                      boxShadow: 'var(--vm-glow-plasma)',
                      minWidth: '240px',
                      height: '70px'
                    }}
                  >
                    <span className="relative z-10 flex items-center">
                      Neural Awakening
                      <Brain className="ml-3 h-6 w-6" />
                    </span>
                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ background: 'var(--vm-gradient-holographic)' }}
                    />
                  </Button>
                </motion.div>
              </Link>
            )}
            
            <motion.div 
              whileHover={{ scale: 1.1, y: -5 }} 
              whileTap={{ scale: 0.95 }}
              className="group"
            >
              <Button
                variant="outline"
                size="lg"
                className="px-12 py-6 text-xl font-bold rounded-2xl border-2"
                style={{ 
                  borderColor: 'var(--vm-neural-electric-blue)',
                  background: 'rgba(0, 212, 255, 0.1)',
                  color: 'var(--vm-neural-electric-blue)',
                  minWidth: '240px',
                  height: '70px',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <Play className="mr-3 h-6 w-6" />
                Experience Demo
              </Button>
            </motion.div>
          </motion.div>

          {/* Voice spectrum visualization */}
          <motion.div
            className="flex justify-center items-end space-x-2 mb-16 h-32"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 1.5 }}
          >
            {Array.from({ length: 40 }).map((_, i) => (
              <motion.div
                key={i}
                className="w-2 rounded-full"
                style={{
                  background: `var(--vm-gradient-${['voice-spectrum', 'energy-plasma', 'ai-consciousness', 'matrix-flow'][i % 4]})`
                }}
                animate={{
                  height: [
                    20 + Math.random() * 40,
                    60 + Math.random() * 60,
                    10 + Math.random() * 30,
                    80 + Math.random() * 40
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
          </motion.div>
        </div>
      </section>

      {/* Revolutionary Features Section */}
      <section className="py-32 px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 
              className="text-5xl sm:text-6xl font-bold mb-8"
              style={{
                background: 'var(--vm-gradient-holographic)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              Neural Capabilities
            </h2>
            <p 
              className="text-2xl max-w-4xl mx-auto leading-relaxed"
              style={{ color: 'var(--vm-ai-consciousness-cyan)' }}
            >
              Revolutionary AI technology that transcends traditional voice processing
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="relative group vm-magnetic-card"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ 
                  y: -15, 
                  scale: 1.05,
                  rotateX: 5,
                  rotateY: 5
                }}
              >
                <div 
                  className="p-8 rounded-3xl relative overflow-hidden backdrop-blur-xl border-2"
                  style={{ 
                    background: `linear-gradient(135deg, ${feature.color}10 0%, transparent 100%)`,
                    borderColor: `${feature.color}30`,
                    boxShadow: `0 20px 40px rgba(0, 0, 0, 0.3)`
                  }}
                >
                  {/* Animated border effect */}
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"
                    style={{ 
                      background: feature.gradient,
                      filter: 'blur(20px)',
                      transform: 'scale(1.1)'
                    }}
                  />
                  
                  <div className="relative z-10">
                    <motion.div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 mx-auto"
                      style={{ 
                        background: feature.gradient,
                        boxShadow: `0 0 30px ${feature.color}60`
                      }}
                      whileHover={{ 
                        rotate: 360,
                        scale: 1.2
                      }}
                      transition={{ duration: 0.6 }}
                    >
                      <feature.icon className="w-10 h-10 text-white" />
                    </motion.div>
                    
                    <h3 
                      className="text-2xl font-bold mb-4 text-center"
                      style={{ color: feature.color }}
                    >
                      {feature.title}
                    </h3>
                    
                    <p 
                      className="text-center leading-relaxed"
                      style={{ color: 'var(--vm-ai-consciousness-cyan)' }}
                    >
                      {feature.description}
                    </p>
                    
                    <motion.div
                      className="mt-6 h-1 rounded-full mx-auto"
                      style={{ background: feature.gradient }}
                      initial={{ width: 0 }}
                      whileInView={{ width: '100%' }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: index * 0.1 + 0.5 }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Neural CTA Section */}
      <section className="py-32 px-6 lg:px-8 relative overflow-hidden">
        <motion.div
          className="absolute inset-0"
          animate={{ 
            background: [
              'radial-gradient(circle at 20% 50%, var(--vm-energy-plasma-pink) 0%, transparent 50%)',
              'radial-gradient(circle at 80% 50%, var(--vm-neural-electric-blue) 0%, transparent 50%)',
              'radial-gradient(circle at 50% 20%, var(--vm-matrix-neon-green) 0%, transparent 50%)',
              'radial-gradient(circle at 20% 50%, var(--vm-energy-plasma-pink) 0%, transparent 50%)'
            ]
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
          >
            <h2 
              className="text-5xl sm:text-7xl font-bold mb-8"
              style={{
                background: 'var(--vm-gradient-holographic)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 0 30px rgba(0, 255, 255, 0.5))'
              }}
            >
              Ready to Evolve?
            </h2>
            
            <p 
              className="text-2xl mb-12 max-w-3xl mx-auto leading-relaxed"
              style={{ color: 'var(--vm-ai-consciousness-cyan)' }}
            >
              Join the neural revolution and experience the future of AI voice technology
            </p>
            
            <motion.div
              whileHover={{ scale: 1.1, y: -10 }}
              whileTap={{ scale: 0.95 }}
              className="group inline-block"
            >
              {user ? (
                <Link href="/dashboard">
                  <Button 
                    size="lg" 
                    className="relative overflow-hidden px-16 py-8 text-2xl font-bold rounded-3xl"
                    style={{ 
                      background: 'var(--vm-gradient-matrix-flow)',
                      border: 'none',
                      boxShadow: 'var(--vm-glow-consciousness)',
                      minWidth: '320px',
                      height: '90px'
                    }}
                  >
                    <span className="relative z-10 flex items-center">
                      Enter Neural Matrix
                      <ArrowRight className="ml-4 h-8 w-8" />
                    </span>
                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ background: 'var(--vm-gradient-holographic)' }}
                    />
                  </Button>
                </Link>
              ) : (
                <Link href="/signup">
                  <Button 
                    size="lg" 
                    className="relative overflow-hidden px-16 py-8 text-2xl font-bold rounded-3xl"
                    style={{ 
                      background: 'var(--vm-gradient-energy-plasma)',
                      border: 'none',
                      boxShadow: 'var(--vm-glow-plasma)',
                      minWidth: '320px',
                      height: '90px'
                    }}
                  >
                    <span className="relative z-10 flex items-center">
                      Begin Neural Evolution
                      <Brain className="ml-4 h-8 w-8" />
                    </span>
                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ background: 'var(--vm-gradient-holographic)' }}
                    />
                  </Button>
                </Link>
              )}
            </motion.div>
            
            <motion.p
              className="text-sm mt-8"
              style={{ color: 'var(--vm-matrix-neon-green)' }}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
            >
              ⚡ Instant neural activation • 🧠 Quantum consciousness • 🔮 Revolutionary experience
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Neural Footer */}
      <footer 
        className="py-20 px-6 lg:px-8 relative"
        style={{ 
          background: 'var(--vm-gradient-void)',
          borderTop: '2px solid var(--vm-neural-electric-blue)'
        }}
      >
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            className="flex items-center justify-center gap-4 mb-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ 
                background: 'var(--vm-gradient-matrix-flow)',
                boxShadow: 'var(--vm-glow-matrix)'
              }}
            >
              <Radio className="w-6 h-6 text-white" />
            </div>
            <h3 
              className="text-3xl font-bold"
              style={{
                background: 'var(--vm-gradient-holographic)', 
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              Voice Matrix
            </h3>
          </motion.div>
          
          <p 
            className="text-xl mb-8"
            style={{ color: 'var(--vm-ai-consciousness-cyan)' }}
          >
            Revolutionary AI voice consciousness for the future of communication
          </p>
          
          <motion.p 
            className="text-sm"
            style={{ color: 'var(--vm-matrix-neon-green)' }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            © 2024 Voice Matrix • Neural AI Technology • Built for the Future
          </motion.p>
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
            className="text-2xl font-bold mb-4"
            style={{ color: 'var(--vm-neural-electric-blue)' }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Neural Matrix Initializing...
          </motion.h1>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}