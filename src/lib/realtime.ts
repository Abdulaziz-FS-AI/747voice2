'use client';

import { Database } from '@/types/database-simplified';

type Tables = Database['public']['Tables'];

// Realtime event types
export type RealtimeEvent<T = any> = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: T;
  table: string;
  schema: string;
};

// Mock realtime subscription manager for standalone version
export class RealtimeManager {
  private listeners = new Map<string, Set<(event: RealtimeEvent) => void>>();

  // Mock subscription for standalone version
  subscribeToTeamData(
    teamId: string,
    tables: string[],
    callback: (event: RealtimeEvent) => void
  ): () => void {
    const channelName = `team_${teamId}`;
    
    // Store callback for mock purposes
    if (!this.listeners.has(channelName)) {
      this.listeners.set(channelName, new Set());
    }
    
    const channelListeners = this.listeners.get(channelName)!;
    channelListeners.add(callback);
    
    // Mock: Log subscription for debugging
    console.log(`📡 Mock realtime subscription: ${channelName} for tables:`, tables);
    
    // Return unsubscribe function
    return () => {
      channelListeners.delete(callback);
      
      // Remove channel if no more listeners
      if (channelListeners.size === 0) {
        this.listeners.delete(channelName);
      }
    };
  }

  // Mock subscription to specific resource changes
  subscribeToResource(
    resourceType: 'call' | 'lead' | 'assistant',
    resourceId: string,
    callback: (event: RealtimeEvent) => void
  ): () => void {
    const channelName = `${resourceType}_${resourceId}`;
    
    if (!this.listeners.has(channelName)) {
      this.listeners.set(channelName, new Set());
    }
    
    const channelListeners = this.listeners.get(channelName)!;
    channelListeners.add(callback);
    
    // Mock: Log subscription for debugging
    console.log(`📡 Mock resource subscription: ${channelName}`);
    
    return () => {
      channelListeners.delete(callback);
      
      if (channelListeners.size === 0) {
        this.listeners.delete(channelName);
      }
    };
  }

  // Mock subscription to user-specific notifications
  subscribeToUserNotifications(
    userId: string,
    callback: (event: RealtimeEvent) => void
  ): () => void {
    const channelName = `user_notifications_${userId}`;
    
    if (!this.listeners.has(channelName)) {
      this.listeners.set(channelName, new Set());
    }
    
    const channelListeners = this.listeners.get(channelName)!;
    channelListeners.add(callback);
    
    // Mock: Log subscription for debugging
    console.log(`📡 Mock user notifications subscription: ${channelName}`);
    
    return () => {
      channelListeners.delete(callback);
      
      if (channelListeners.size === 0) {
        this.listeners.delete(channelName);
      }
    };
  }

  // Cleanup all subscriptions (mock version)
  cleanup(): void {
    this.listeners.clear();
    console.log('📡 Mock cleanup: All realtime subscriptions cleared');
  }

  // Get active channel count (mock version)
  getActiveChannelCount(): number {
    return this.listeners.size;
  }
}

// Create global instance
export const realtimeManager = new RealtimeManager();

// React hooks for realtime subscriptions
export function useTeamRealtime(
  teamId: string | null,
  tables: string[] = ['calls', 'leads', 'assistants'],
  onEvent?: (event: RealtimeEvent) => void
) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);

  useEffect(() => {
    if (!teamId) return;

    const handleEvent = (event: RealtimeEvent) => {
      setLastEvent(event);
      onEvent?.(event);
    };

    setIsConnected(true);
    const unsubscribe = realtimeManager.subscribeToTeamData(teamId, tables, handleEvent);

    return () => {
      unsubscribe();
      setIsConnected(false);
    };
  }, [teamId, tables.join(','), onEvent]);

  return { isConnected, lastEvent };
}

export function useCallRealtime(
  callId: string | null,
  onEvent?: (event: RealtimeEvent) => void
) {
  const [isConnected, setIsConnected] = useState(false);
  const [callData, setCallData] = useState<any>(null);

  useEffect(() => {
    if (!callId) return;

    const handleEvent = (event: RealtimeEvent) => {
      if (event.eventType === 'UPDATE' || event.eventType === 'INSERT') {
        setCallData(event.new);
      }
      onEvent?.(event);
    };

    setIsConnected(true);
    const unsubscribe = realtimeManager.subscribeToResource('call', callId, handleEvent);

    return () => {
      unsubscribe();
      setIsConnected(false);
    };
  }, [callId, onEvent]);

  return { isConnected, callData };
}

export function useLeadRealtime(
  leadId: string | null,
  onEvent?: (event: RealtimeEvent) => void
) {
  const [isConnected, setIsConnected] = useState(false);
  const [leadData, setLeadData] = useState<any>(null);

  useEffect(() => {
    if (!leadId) return;

    const handleEvent = (event: RealtimeEvent) => {
      if (event.eventType === 'UPDATE' || event.eventType === 'INSERT') {
        setLeadData(event.new);
      }
      onEvent?.(event);
    };

    setIsConnected(true);
    const unsubscribe = realtimeManager.subscribeToResource('lead', leadId, handleEvent);

    return () => {
      unsubscribe();
      setIsConnected(false);
    };
  }, [leadId, onEvent]);

  return { isConnected, leadData };
}

export function useUserNotifications(
  userId: string | null,
  onNotification?: (event: RealtimeEvent) => void
) {
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<RealtimeEvent[]>([]);

  useEffect(() => {
    if (!userId) return;

    const handleEvent = (event: RealtimeEvent) => {
      // Add to notifications list (keep last 50)
      setNotifications(prev => [event, ...prev].slice(0, 50));
      onNotification?.(event);
    };

    setIsConnected(true);
    const unsubscribe = realtimeManager.subscribeToUserNotifications(userId, handleEvent);

    return () => {
      unsubscribe();
      setIsConnected(false);
    };
  }, [userId, onNotification]);

  const clearNotifications = () => setNotifications([]);

  return { isConnected, notifications, clearNotifications };
}

// Need to import these hooks
import { useState, useEffect } from 'react';