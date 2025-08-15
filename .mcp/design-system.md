# Voice Matrix Design System

## 🎨 Visual Identity

### Brand Personality
- **Modern & Professional**: Clean interfaces with subtle animations
- **Voice-Centric**: Audio waveforms and sound visualization elements
- **Trustworthy**: Consistent patterns and reliable interactions
- **Innovative**: Cutting-edge AI technology representation

## 🎭 Color System

### Primary Palette
```css
--vm-purple-600: #8B5CF6;
--vm-purple-700: #7C3AED;
--vm-blue-600: #3B82F6;
--vm-blue-700: #2563EB;
```

### Gradients
```css
--vm-gradient-primary: linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%);
--vm-gradient-secondary: linear-gradient(135deg, #7C3AED 0%, #EC4899 100%);
--vm-gradient-accent: linear-gradient(135deg, #3B82F6 0%, #14B8A6 100%);
```

### Semantic Colors
```css
--vm-success: #10B981;
--vm-warning: #F59E0B;
--vm-error: #EF4444;
--vm-info: #3B82F6;
```

### Dark Theme
```css
--vm-background: #0F0F14;
--vm-surface: #1A1A24;
--vm-surface-light: #252534;
--vm-border: rgba(139, 92, 246, 0.2);
```

## 📐 Typography

### Font Stack
```css
--vm-font-sans: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
--vm-font-mono: 'JetBrains Mono', 'SF Mono', Monaco, monospace;
```

### Type Scale
```css
--vm-text-xs: 0.75rem;    /* 12px */
--vm-text-sm: 0.875rem;   /* 14px */
--vm-text-base: 1rem;     /* 16px */
--vm-text-lg: 1.125rem;   /* 18px */
--vm-text-xl: 1.25rem;    /* 20px */
--vm-text-2xl: 1.5rem;    /* 24px */
--vm-text-3xl: 1.875rem;  /* 30px */
--vm-text-4xl: 2.25rem;   /* 36px */
```

### Font Weights
```css
--vm-font-normal: 400;
--vm-font-medium: 500;
--vm-font-semibold: 600;
--vm-font-bold: 700;
```

## 🎯 Component Patterns

### Cards
```tsx
<motion.div
  className="
    relative overflow-hidden
    rounded-2xl
    bg-gradient-to-br from-purple-600/10 to-blue-600/10
    backdrop-blur-xl
    border border-purple-500/20
    shadow-xl shadow-purple-500/10
    p-6
  "
  whileHover={{ 
    scale: 1.02,
    y: -4,
    boxShadow: '0 20px 40px rgba(139, 92, 246, 0.2)'
  }}
  transition={{ type: "spring", stiffness: 300 }}
>
  {/* Card content */}
</motion.div>
```

### Buttons

#### Primary Button
```tsx
<button className="
  relative overflow-hidden
  px-6 py-3
  bg-gradient-to-r from-purple-600 to-blue-600
  text-white font-semibold
  rounded-xl
  shadow-lg shadow-purple-500/25
  hover:shadow-xl hover:shadow-purple-500/30
  transform transition-all duration-200
  hover:scale-105
  active:scale-95
">
  <span className="relative z-10">Click Me</span>
  <div className="absolute inset-0 bg-white/20 opacity-0 hover:opacity-100 transition-opacity" />
</button>
```

#### Secondary Button
```tsx
<button className="
  px-6 py-3
  border-2 border-purple-500/50
  text-purple-400
  rounded-xl
  backdrop-blur-sm
  hover:bg-purple-500/10
  hover:border-purple-500
  hover:text-purple-300
  transition-all duration-200
">
  Secondary Action
</button>
```

### Input Fields
```tsx
<div className="relative">
  <input
    className="
      w-full px-4 py-3
      bg-gray-900/50
      border border-purple-500/30
      rounded-xl
      text-white
      placeholder-gray-500
      focus:border-purple-500
      focus:bg-gray-900/70
      focus:outline-none
      focus:ring-2 focus:ring-purple-500/20
      transition-all duration-200
    "
    placeholder="Enter text..."
  />
  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600/0 via-purple-600/5 to-purple-600/0 pointer-events-none" />
</div>
```

## 🎬 Animation Patterns

### Page Transitions
```tsx
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: { duration: 0.3 }
  }
};
```

### Stagger Children
```tsx
const containerVariants = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3
    }
  }
};

const itemVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: { type: "spring", stiffness: 100 }
  }
};
```

### Voice Wave Animation
```tsx
const waveVariants = {
  animate: {
    d: [
      "M0,50 Q25,30 50,50 T100,50",
      "M0,50 Q25,70 50,50 T100,50",
      "M0,50 Q25,30 50,50 T100,50"
    ],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};
```

## 📊 Data Visualization

### Chart Colors
```javascript
const chartColors = {
  primary: ["#8B5CF6", "#7C3AED", "#6D28D9"],
  secondary: ["#3B82F6", "#2563EB", "#1D4ED8"],
  accent: ["#14B8A6", "#10B981", "#059669"],
  gradient: {
    purple: { offset: "0%", color: "#8B5CF6" },
    blue: { offset: "100%", color: "#3B82F6" }
  }
};
```

### Metric Cards
```tsx
<div className="relative p-6 rounded-xl bg-gradient-to-br from-purple-600/10 to-transparent">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm text-gray-400">Total Calls</p>
      <p className="text-3xl font-bold text-white">1,234</p>
      <p className="text-xs text-green-400 mt-1">↑ 12% from last month</p>
    </div>
    <div className="p-3 rounded-xl bg-purple-600/20">
      <Phone className="h-6 w-6 text-purple-400" />
    </div>
  </div>
  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-b-xl" />
</div>
```

## 🎤 Voice-Specific Elements

### Voice Activity Indicator
```tsx
<div className="flex items-center gap-1">
  {[...Array(5)].map((_, i) => (
    <motion.div
      key={i}
      className="w-1 bg-gradient-to-t from-purple-600 to-blue-400 rounded-full"
      animate={{
        height: ["12px", "24px", "12px"],
      }}
      transition={{
        duration: 1,
        repeat: Infinity,
        delay: i * 0.1,
      }}
    />
  ))}
</div>
```

### Call Status Badge
```tsx
const statusStyles = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30"
};

<span className={`
  px-3 py-1 
  rounded-full 
  text-xs font-medium 
  border 
  ${statusStyles[status]}
`}>
  {status}
</span>
```

## 🔄 Loading States

### Skeleton Loader
```tsx
<div className="animate-pulse">
  <div className="h-4 bg-purple-600/20 rounded w-3/4 mb-2" />
  <div className="h-4 bg-purple-600/20 rounded w-1/2" />
</div>
```

### Spinner
```tsx
<div className="relative">
  <div className="h-12 w-12 rounded-full border-4 border-purple-600/20" />
  <div className="absolute top-0 h-12 w-12 rounded-full border-4 border-purple-600 border-t-transparent animate-spin" />
</div>
```

## 📱 Responsive Breakpoints

```css
--vm-screen-sm: 640px;   /* Mobile landscape */
--vm-screen-md: 768px;   /* Tablet */
--vm-screen-lg: 1024px;  /* Desktop */
--vm-screen-xl: 1280px;  /* Large desktop */
--vm-screen-2xl: 1536px; /* Extra large */
```

## ⚡ Performance Guidelines

1. **Use CSS transforms** for animations (not width/height)
2. **Implement lazy loading** for images and heavy components
3. **Use `will-change` sparingly** for predictable animations
4. **Debounce user inputs** (search, filters)
5. **Virtualize long lists** (>50 items)
6. **Code split** by route
7. **Optimize images** (WebP, lazy loading, responsive sizes)

## 🎯 Accessibility Standards

1. **Color Contrast**: Minimum 4.5:1 for normal text, 3:1 for large text
2. **Focus Indicators**: Visible focus rings on all interactive elements
3. **Keyboard Navigation**: Full keyboard support
4. **ARIA Labels**: Descriptive labels for screen readers
5. **Motion Preferences**: Respect `prefers-reduced-motion`

## 🚀 Future Enhancements

### Planned Components
- [ ] Voice waveform visualizer
- [ ] Real-time call monitor
- [ ] Advanced data tables
- [ ] Notification system
- [ ] Command palette (⌘K)
- [ ] Theme switcher (dark/light/auto)

### Design Improvements
- [ ] 3D card effects
- [ ] Glassmorphism enhancements
- [ ] Particle effects for voice activity
- [ ] Advanced chart interactions
- [ ] Micro-interactions library
- [ ] Custom cursor effects

### Voice-Specific Features
- [ ] Voice command UI
- [ ] Audio level meters
- [ ] Call quality indicators
- [ ] Sentiment visualization
- [ ] Conversation flow diagrams