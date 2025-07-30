"use client"

import * as React from "react"

interface SliderProps {
  value: number[]
  onValueChange: (value: number[]) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  className?: string
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ value, onValueChange, min = 0, max = 100, step = 1, disabled, className }, ref) => {
    const currentValue = value[0] || min
    const percentage = ((currentValue - min) / (max - min)) * 100

    return (
      <div className={`relative w-full ${className || ''}`}>
        <div className="relative h-2 w-full bg-gray-200 rounded-full">
          <div 
            className="absolute h-2 bg-blue-600 rounded-full" 
            style={{ width: `${percentage}%` }}
          />
        </div>
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentValue}
          onChange={(e) => onValueChange([parseInt(e.target.value)])}
          disabled={disabled}
          className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <div 
          className="absolute w-5 h-5 bg-white border-2 border-blue-600 rounded-full -mt-1.5 transform -translate-x-1/2"
          style={{ left: `${percentage}%` }}
        />
      </div>
    )
  }
)

Slider.displayName = "Slider"

export { Slider }