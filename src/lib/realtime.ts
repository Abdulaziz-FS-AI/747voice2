'use client';

import { createClientSupabaseClient } from '@/lib/supabase';
import { Database } from '@/types/database';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type Tables = Database['public']['Tables'];

// Realtime event types
export type RealtimeEvent<T = any> = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: T;
  table: string;
  schema: string;
};

// Realtime subscription manager
export class RealtimeManager {
  private supabase = createClientSupabaseClient();
  private channels = new Map<string, RealtimeChannel>();
  private listeners = new Map<string, Set<(event: RealtimeEvent) => void>>();

  // Subscribe to table changes for a specific team
  subscribeToTeamData(
    teamId: string,
    tables: string[],
    callback: (event: RealtimeEvent) => void
  ): () => void {
    const channelName = `team_${teamId}`;
    
    // Create channel if it doesn't exist
    if (!this.channels.has(channelName)) {
      const channel = this.supabase.channel(channelName);
      
      // Subscribe to each table
      tables.forEach(table => {
        channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
            filter: `team_id=eq.${teamId}`,
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            const event: RealtimeEvent = {
              eventType: payload.eventType,
              new: payload.new,
              old: payload.old,
              table: payload.table,
              schema: payload.schema,
            };
            
            // Notify all listeners for this channel
            const channelListeners = this.listeners.get(channelName);
            if (channelListeners) {
              channelListeners.forEach(listener => listener(event));
            }
          }
        );
      });
      
      channel.subscribe();
      this.channels.set(channelName, channel);
      this.listeners.set(channelName, new Set());
    }
    
    // Add callback to listeners
    const channelListeners = this.listeners.get(channelName)!;
    channelListeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      channelListeners.delete(callback);
      
      // Remove channel if no more listeners
      if (channelListeners.size === 0) {
        const channel = this.channels.get(channelName);
        if (channel) {
          this.supabase.removeChannel(channel);
          this.channels.delete(channelName);
          this.listeners.delete(channelName);
        }
      }
    };
  }

  // Subscribe to specific resource changes
  subscribeToResource(
    resourceType: 'call' | 'lead' | 'assistant',
    resourceId: string,
    callback: (event: RealtimeEvent) => void
  ): () => void {
    const channelName = `${resourceType}_${resourceId}`;
    
    if (!this.channels.has(channelName)) {
      const channel = this.supabase.channel(channelName);
      
      const tableName = resourceType === 'assistant' ? 'assistants' : 
                       resourceType === 'call' ? 'calls' : 'leads';
      
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: `id=eq.${resourceId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          const event: RealtimeEvent = {
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
            table: payload.table,
            schema: payload.schema,
          };
          
          const channelListeners = this.listeners.get(channelName);
          if (channelListeners) {
            channelListeners.forEach(listener => listener(event));
          }
        }
      );
      
      channel.subscribe();
      this.channels.set(channelName, channel);
      this.listeners.set(channelName, new Set());
    }
    
    const channelListeners = this.listeners.get(channelName)!;
    channelListeners.add(callback);
    
    return () => {
      channelListeners.delete(callback);
      
      if (channelListeners.size === 0) {
        const channel = this.channels.get(channelName);
        if (channel) {
          this.supabase.removeChannel(channel);
          this.channels.delete(channelName);
          this.listeners.delete(channelName);
        }
      }
    };
  }

  // Subscribe to user-specific notifications
  subscribeToUserNotifications(
    userId: string,
    callback: (event: RealtimeEvent) => void
  ): () => void {
    const channelName = `user_notifications_${userId}`;
    
    if (!this.channels.has(channelName)) {
      const channel = this.supabase.channel(channelName);
      
      // Subscribe to multiple tables that might affect the user
      const userTables = ['calls', 'leads', 'assistants', 'lead_interactions'];
      
      userTables.forEach(table => {
        channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
            filter: `user_id=eq.${userId}`,
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            const event: RealtimeEvent = {
              eventType: payload.eventType,
              new: payload.new,
              old: payload.old,
              table: payload.table,
              schema: payload.schema,
            };
            
            const channelListeners = this.listeners.get(channelName);
            if (channelListeners) {
              channelListeners.forEach(listener => listener(event));
            }
          }
        );
      });
      
      channel.subscribe();
      this.channels.set(channelName, channel);
      this.listeners.set(channelName, new Set());
    }
    
    const channelListeners = this.listeners.get(channelName)!;
    channelListeners.add(callback);
    
    return () => {
      channelListeners.delete(callback);
      
      if (channelListeners.size === 0) {
        const channel = this.channels.get(channelName);
        if (channel) {
          this.supabase.removeChannel(channel);
          this.channels.delete(channelName);
          this.listeners.delete(channelName);
        }
      }
    };
  }

  // Cleanup all subscriptions
  cleanup(): void {
    this.channels.forEach(channel => {
      this.supabase.removeChannel(channel);
    });
    this.channels.clear();
    this.listeners.clear();
  }

  // Get active channel count
  getActiveChannelCount(): number {
    return this.channels.size;
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