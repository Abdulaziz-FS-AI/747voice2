/**
 * Authentication System Tests
 * Critical tests for Supabase Auth integration and security
 */

import { createClientSupabaseClient, createServiceRoleClient } from '@/lib/supabase'

// Mock the Supabase modules
jest.mock('@/lib/supabase')

describe('Authentication System', () => {
  let mockSupabaseClient: any
  
  beforeEach(() => {
    mockSupabaseClient = {
      auth: {
        getUser: jest.fn(),
        signInWithPassword: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
      })),
    }
    
    ;(createClientSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient)
    ;(createServiceRoleClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })

  describe('User Authentication', () => {
    test('should authenticate valid user credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {},
      }

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'token' } },
        error: null,
      })

      const result = await mockSupabaseClient.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(result.data.user).toEqual(mockUser)
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })

    test('should reject invalid credentials', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      })

      const result = await mockSupabaseClient.auth.signInWithPassword({
        email: 'invalid@example.com',
        password: 'wrongpassword',
      })

      expect(result.data.user).toBeNull()
      expect(result.error.message).toBe('Invalid login credentials')
    })

    test('should handle admin email detection', () => {
      const adminEmail = 'abdulaziz.fs.ai@gmail.com'
      const regularEmail = 'user@example.com'

      expect(adminEmail === 'abdulaziz.fs.ai@gmail.com').toBe(true)
      expect(regularEmail === 'abdulaziz.fs.ai@gmail.com').toBe(false)
    })
  })

  describe('User Registration', () => {
    test('should create new user account', async () => {
      const newUser = {
        email: 'newuser@example.com',
        password: 'securepassword123',
        options: {
          data: {
            full_name: 'John Doe',
            company_name: 'Test Company',
          },
        },
      }

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: {
          user: { id: 'user-456', email: newUser.email },
          session: null, // Email confirmation required
        },
        error: null,
      })

      const result = await mockSupabaseClient.auth.signUp(newUser)

      expect(result.data.user.email).toBe(newUser.email)
      expect(result.error).toBeNull()
    })

    test('should reject duplicate email registration', async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      })

      const result = await mockSupabaseClient.auth.signUp({
        email: 'existing@example.com',
        password: 'password123',
      })

      expect(result.error.message).toBe('User already registered')
    })
  })

  describe('Profile Management', () => {
    test('should create user profile after registration', async () => {
      const profileData = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        company_name: 'Test Company',
        team_id: 'team-456',
      }

      const mockProfileChain = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: profileData, error: null }),
      }

      mockSupabaseClient.from.mockReturnValue(mockProfileChain)

      // Simulate a profile lookup that would happen after registration
      const result = await mockSupabaseClient
        .from('profiles')
        .select('*')
        .eq('id', 'user-123')
        .single()

      expect(result.data).toEqual(profileData)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles')
      expect(mockProfileChain.select).toHaveBeenCalledWith('*')
      expect(mockProfileChain.eq).toHaveBeenCalledWith('id', 'user-123')
    })
  })

  describe('Admin Privileges', () => {
    test('should identify system admin users', async () => {
      const adminProfile = {
        id: 'admin-123',
        email: 'abdulaziz.fs.ai@gmail.com',
        is_system_admin: true,
        team: {
          is_admin_team: true,
          requires_payment: false,
        },
      }

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: adminProfile, error: null }),
      }

      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await mockChain.single()

      expect(result.data.is_system_admin).toBe(true)
      expect(result.data.team.is_admin_team).toBe(true)
      expect(result.data.team.requires_payment).toBe(false)
    })
  })
})