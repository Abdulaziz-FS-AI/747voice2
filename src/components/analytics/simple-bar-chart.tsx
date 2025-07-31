'use client'

import { motion } from 'framer-motion'

interface BarChartData {
  label: string
  value: number
  color?: string
}

interface SimpleBarChartProps {
  data: BarChartData[]
  height?: number
  showValues?: boolean
  animate?: boolean
}

export function SimpleBarChart({ 
  data, 
  height = 200, 
  showValues = true,
  animate = true 
}: SimpleBarChartProps) {
  // Find max value for scaling
  const maxValue = Math.max(...data.map(d => d.value), 1)
  
  return (
    <div className="w-full" style={{ height: `${height}px` }}>
      <div className="flex items-end justify-between h-full gap-2">
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * 100
          const delay = animate ? index * 0.1 : 0
          
          return (
            <div 
              key={item.label} 
              className="flex-1 flex flex-col items-center justify-end"
            >
              {/* Value label */}
              {showValues && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: delay + 0.3 }}
                  className="text-xs font-medium vm-text-primary mb-2"
                >
                  {item.value}
                </motion.div>
              )}
              
              {/* Bar */}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${barHeight}%` }}
                transition={{ 
                  duration: 0.5, 
                  delay,
                  ease: "easeOut"
                }}
                className="w-full rounded-t-md relative overflow-hidden"
                style={{ 
                  background: item.color || 'var(--vm-gradient-brand)',
                  minHeight: item.value > 0 ? '4px' : '0'
                }}
              >
                {/* Animated gradient overlay */}
                {animate && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.3, 0] }}
                    transition={{
                      duration: 2,
                      delay: delay + 0.5,
                      repeat: Infinity,
                      repeatDelay: 3
                    }}
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(to top, transparent, rgba(255,255,255,0.2))'
                    }}
                  />
                )}
              </motion.div>
              
              {/* Label */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: delay + 0.2 }}
                className="text-xs vm-text-muted mt-2 text-center truncate w-full"
              >
                {item.label}
              </motion.div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Line chart for trends
interface LineChartData {
  date: string
  value: number
}

interface SimpleLineChartProps {
  data: LineChartData[]
  height?: number
  color?: string
  animate?: boolean
}

export function SimpleLineChart({
  data,
  height = 200,
  color = 'var(--vm-orange-primary)',
  animate = true
}: SimpleLineChartProps) {
  if (data.length === 0) return null
  
  const maxValue = Math.max(...data.map(d => d.value), 1)
  const minValue = Math.min(...data.map(d => d.value), 0)
  const range = maxValue - minValue || 1
  
  // Calculate points for SVG path
  const points = data.map((item, index) => {
    const x = (index / (data.length - 1)) * 100
    const y = 100 - ((item.value - minValue) / range) * 100
    return { x, y, value: item.value, date: item.date }
  })
  
  // Create SVG path
  const pathData = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')
    
  return (
    <div className="w-full relative" style={{ height: `${height}px` }}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        {/* Grid lines */}
        <g className="opacity-10">
          {[0, 25, 50, 75, 100].map(y => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="currentColor"
              strokeWidth="0.5"
              className="vm-text-muted"
            />
          ))}
        </g>
        
        {/* Area fill */}
        <motion.path
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.1 }}
          transition={{ duration: 0.5 }}
          d={`${pathData} L 100 100 L 0 100 Z`}
          fill={color}
        />
        
        {/* Line */}
        <motion.path
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        
        {/* Points */}
        {points.map((point, index) => (
          <motion.circle
            key={index}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.05 + 0.5 }}
            cx={point.x}
            cy={point.y}
            r="1.5"
            fill={color}
            className="hover:r-3 transition-all cursor-pointer"
          >
            <title>{`${point.date}: ${point.value}`}</title>
          </motion.circle>
        ))}
      </svg>
      
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs vm-text-muted">
        <span>{maxValue}</span>
        <span>{Math.round((maxValue + minValue) / 2)}</span>
        <span>{minValue}</span>
      </div>
    </div>
  )
}