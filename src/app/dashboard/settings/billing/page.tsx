'use client'

import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/dashboard/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import UsageIndicator from '@/components/usage/usage-indicator';
import { 
  Settings,
  User,
  Clock,
  Users,
  Info
} from 'lucide-react';

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl font-bold" style={{ color: 'var(--vm-text-primary)' }}>
            Account Settings
          </h1>
          <p className="text-lg mt-2" style={{ color: 'var(--vm-text-muted)' }}>
            Manage your account preferences and view usage limits
          </p>
        </motion.div>

        {/* Usage Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <UsageIndicator variant="detailed" />
        </motion.div>

        {/* Account Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card style={{ 
            backgroundColor: 'var(--vm-primary-surface)',
            borderColor: 'var(--vm-border-default)'
          }}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
                  <User className="h-5 w-5" style={{ color: 'var(--vm-secondary-purple)' }} />
                </div>
                <div>
                  <CardTitle style={{ color: 'var(--vm-text-primary)' }}>
                    Account Information
                  </CardTitle>
                  <CardDescription style={{ color: 'var(--vm-text-muted)' }}>
                    Your Voice Matrix account details
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--vm-text-muted)' }}>
                    Account Type
                  </h4>
                  <p className="text-lg font-semibold" style={{ color: 'var(--vm-text-primary)' }}>
                    Voice Matrix User
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--vm-text-muted)' }}>
                    Status
                  </h4>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--vm-success-green)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--vm-success-green)' }}>
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Usage Limits Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card style={{ 
            backgroundColor: 'var(--vm-primary-surface)',
            borderColor: 'var(--vm-border-default)'
          }}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(0, 212, 255, 0.1)' }}>
                  <Info className="h-5 w-5" style={{ color: 'var(--vm-cyan)' }} />
                </div>
                <div>
                  <CardTitle style={{ color: 'var(--vm-text-primary)' }}>
                    Usage Limits
                  </CardTitle>
                  <CardDescription style={{ color: 'var(--vm-text-muted)' }}>
                    Your account includes the following limits
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="flex items-center gap-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--vm-neutral-800)' }}>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(255, 107, 53, 0.1)' }}>
                    <Clock className="h-6 w-6" style={{ color: 'var(--vm-orange)' }} />
                  </div>
                  <div>
                    <h4 className="font-semibold" style={{ color: 'var(--vm-text-primary)' }}>
                      10 Minutes
                    </h4>
                    <p className="text-sm" style={{ color: 'var(--vm-text-muted)' }}>
                      Call time per month
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--vm-neutral-800)' }}>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                    <Users className="h-6 w-6" style={{ color: 'var(--vm-emerald)' }} />
                  </div>
                  <div>
                    <h4 className="font-semibold" style={{ color: 'var(--vm-text-primary)' }}>
                      3 Assistants
                    </h4>
                    <p className="text-sm" style={{ color: 'var(--vm-text-muted)' }}>
                      AI voice agents
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 mt-0.5" style={{ color: 'var(--vm-secondary-purple)' }} />
                  <div>
                    <h4 className="font-medium mb-1" style={{ color: 'var(--vm-text-primary)' }}>
                      About Your Limits
                    </h4>
                    <p className="text-sm" style={{ color: 'var(--vm-text-muted)' }}>
                      These limits reset monthly and allow you to use Voice Matrix for personal and small business needs. 
                      Your usage resets on the first day of each month.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}