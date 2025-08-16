/**
 * Design Demo Page - Showcase Professional Components
 * Non-AI looking design with human touches
 */

'use client';

import React, { useState } from 'react';
import { ProfessionalCard, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/professional-card';
import { ProfessionalButton } from '@/components/ui/professional-button';
import { ProfessionalInput } from '@/components/ui/professional-input';
import { Bot, User, Search, Download, Settings, Eye, Edit3, Save, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DesignDemoPage() {
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const handleAction = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="min-h-screen bg-vm-background p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto mb-12"
      >
        <h1 className="text-4xl font-bold vm-text-gradient mb-4">
          Voice Matrix Professional Design System
        </h1>
        <p className="text-vm-text-secondary text-lg">
          Clean, professional components that don't look AI-generated
        </p>
      </motion.div>

      <div className="max-w-6xl mx-auto grid gap-8">
        
        {/* Card Variants Demo */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-2xl font-semibold text-vm-text-bright mb-6">Professional Cards</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Glass Card */}
            <ProfessionalCard variant="glass" hover="lift">
              <CardHeader>
                <CardTitle gradient className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-vm-primary" />
                  Alex - Scheduling Bot
                </CardTitle>
                <CardDescription>
                  Books appointments, manages calendar availability, and sends confirmation messages.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-vm-accent" />
                    <span className="text-sm text-vm-text-secondary">Scheduling Assistant</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-vm-primary/10 text-vm-primary px-2 py-1 rounded-sm">
                      Active
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <div className="flex gap-2">
                  <ProfessionalButton size="sm" variant="ghost">
                    <Eye className="h-4 w-4" />
                  </ProfessionalButton>
                  <ProfessionalButton size="sm" variant="outline">
                    <Edit3 className="h-4 w-4" />
                  </ProfessionalButton>
                </div>
              </CardFooter>
            </ProfessionalCard>

            {/* Elevated Card */}
            <ProfessionalCard variant="elevated" hover="glow">
              <CardHeader>
                <CardTitle>Analytics Overview</CardTitle>
                <CardDescription>
                  Real-time performance metrics and insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-vm-text-secondary">Total Calls</span>
                    <span className="font-semibold text-vm-text-bright">1,247</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-vm-text-secondary">Success Rate</span>
                    <span className="font-semibold text-vm-success">94.2%</span>
                  </div>
                  <div className="w-full bg-vm-surface-elevated rounded-full h-2">
                    <div className="bg-vm-primary h-2 rounded-full" style={{ width: '94.2%' }}></div>
                  </div>
                </div>
              </CardContent>
            </ProfessionalCard>

            {/* Minimal Card */}
            <ProfessionalCard variant="minimal" hover="scale">
              <CardHeader>
                <CardTitle>System Status</CardTitle>
                <CardDescription>
                  All systems operational
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-vm-success rounded-full animate-pulse"></div>
                  <span className="text-sm text-vm-text-bright">Online</span>
                </div>
              </CardContent>
            </ProfessionalCard>
          </div>
        </motion.section>

        {/* Button Variants Demo */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-2xl font-semibold text-vm-text-bright mb-6">Professional Buttons</h2>
          <ProfessionalCard variant="glass">
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                {/* Primary Buttons */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-vm-text-secondary">Primary</h3>
                  <ProfessionalButton onClick={handleAction} loading={loading}>
                    Save Changes
                  </ProfessionalButton>
                  <ProfessionalButton variant="gradient" leftIcon={<Download className="h-4 w-4" />}>
                    Export Data
                  </ProfessionalButton>
                </div>

                {/* Secondary Buttons */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-vm-text-secondary">Secondary</h3>
                  <ProfessionalButton variant="outline">
                    Cancel
                  </ProfessionalButton>
                  <ProfessionalButton variant="secondary" rightIcon={<Settings className="h-4 w-4" />}>
                    Settings
                  </ProfessionalButton>
                </div>

                {/* Ghost & Glass */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-vm-text-secondary">Subtle</h3>
                  <ProfessionalButton variant="ghost">
                    Learn More
                  </ProfessionalButton>
                  <ProfessionalButton variant="glass">
                    Preview
                  </ProfessionalButton>
                </div>

                {/* Icon Buttons */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-vm-text-secondary">Icons</h3>
                  <ProfessionalButton variant="outline" size="icon">
                    <Search className="h-4 w-4" />
                  </ProfessionalButton>
                  <ProfessionalButton size="icon">
                    <Save className="h-4 w-4" />
                  </ProfessionalButton>
                </div>
              </div>
            </CardContent>
          </ProfessionalCard>
        </motion.section>

        {/* Input Variants Demo */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-2xl font-semibold text-vm-text-bright mb-6">Professional Inputs</h2>
          <ProfessionalCard variant="glass">
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                
                {/* Standard Inputs */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-vm-text-secondary">Input Variants</h3>
                  
                  <ProfessionalInput
                    placeholder="Standard input"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                  
                  <ProfessionalInput
                    placeholder="Search assistants..."
                    leftIcon={<Search className="h-4 w-4" />}
                    variant="ghost"
                  />
                  
                  <ProfessionalInput
                    placeholder="With validation"
                    success="Looks good!"
                    variant="filled"
                  />
                  
                  <ProfessionalInput
                    placeholder="Error state"
                    error="This field is required"
                    variant="default"
                  />
                </div>

                {/* Glass & Advanced */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-vm-text-secondary">Advanced Styles</h3>
                  
                  <ProfessionalInput
                    placeholder="Glass input"
                    variant="glass"
                    size="lg"
                  />
                  
                  <ProfessionalInput
                    placeholder="API Configuration"
                    leftIcon={<Settings className="h-4 w-4" />}
                    rightIcon={<Eye className="h-4 w-4" />}
                    variant="filled"
                  />
                  
                  <ProfessionalInput
                    placeholder="Warning state"
                    warning="Consider using a stronger password"
                    type="password"
                  />
                </div>
              </div>
            </CardContent>
          </ProfessionalCard>
        </motion.section>

        {/* Theme Showcase */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-2xl font-semibold text-vm-text-bright mb-6">Theme Features</h2>
          <div className="grid md:grid-cols-3 gap-6">
            
            <ProfessionalCard variant="glass" className="text-center">
              <CardContent>
                <div className="w-12 h-12 bg-vm-primary/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Bot className="h-6 w-6 text-vm-primary" />
                </div>
                <h3 className="font-semibold text-vm-text-bright mb-2">Glassmorphism</h3>
                <p className="text-sm text-vm-text-secondary">
                  Subtle backdrop blur and transparency effects
                </p>
              </CardContent>
            </ProfessionalCard>

            <ProfessionalCard variant="glass" className="text-center">
              <CardContent>
                <div className="w-12 h-12 bg-vm-accent/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Settings className="h-6 w-6 text-vm-accent" />
                </div>
                <h3 className="font-semibold text-vm-text-bright mb-2">Micro Animations</h3>
                <p className="text-sm text-vm-text-secondary">
                  Subtle transitions that feel natural
                </p>
              </CardContent>
            </ProfessionalCard>

            <ProfessionalCard variant="glass" className="text-center">
              <CardContent>
                <div className="w-12 h-12 bg-vm-success/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <User className="h-6 w-6 text-vm-success" />
                </div>
                <h3 className="font-semibold text-vm-text-bright mb-2">Human Touches</h3>
                <p className="text-sm text-vm-text-secondary">
                  Asymmetric spacing and organic curves
                </p>
              </CardContent>
            </ProfessionalCard>
          </div>
        </motion.section>

      </div>
    </div>
  );
}