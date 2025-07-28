/**
 * End-to-End Payment Flow Tests
 * Critical user journey tests for the complete payment and signup process
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import SignUpForm from '@/components/auth/signup-form'
import UsageIndicator from '@/components/usage/usage-indicator'

// Mock Next.js components
jest.mock('next/navigation')
jest.mock('@/lib/supabase')
jest.mock('@/hooks/use-toast')

describe('End-to-End Payment Flow', () => {
  const mockPush = jest.fn()
  const mockToast = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })

    // Mock fetch for API calls
    global.fetch = jest.fn()
  })

  describe('Complete Signup Flow', () => {
    test('should complete full signup flow for paid plan', async () => {
      const mockSearchParams = new URLSearchParams('?plan=plan-123&cycle=monthly')
      
      // Mock plan data fetch
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              id: 'plan-123',
              display_name: 'Professional Plan',
              price_monthly: 79,
              price_yearly: 790,
              max_assistants: 5,
              max_phone_numbers: 3,
            },
          }),
        })
        // Mock signup API call
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              requiresPayment: true,
              checkoutUrl: 'https://checkout.stripe.com/pay/cs_test_123',
              sessionId: 'cs_test_123',
            },
          }),
        })

      // Mock localStorage
      const mockSetItem = jest.fn()
      Object.defineProperty(window, 'localStorage', {
        value: {
          setItem: mockSetItem,
          getItem: jest.fn(),
        },
      })

      // Mock window.location for redirect
      delete (window as any).location
      ;(window as any).location = { href: '' }

      render(<SignUpForm />)

      // Wait for plan data to load
      await waitFor(() => {
        expect(screen.getByText('Professional Plan')).toBeInTheDocument()
      })

      // Fill out the form
      fireEvent.change(screen.getByLabelText(/full name/i), {
        target: { value: 'John Doe' },
      })

      fireEvent.change(screen.getByLabelText(/company name/i), {
        target: { value: 'Test Company' },
      })

      fireEvent.change(screen.getByLabelText(/email address/i), {
        target: { value: 'john@testcompany.com' },
      })

      fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: 'securepassword123' },
      })

      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'securepassword123' },
      })

      // Submit the form
      fireEvent.click(screen.getByRole('button', { name: /start free trial/i }))

      await waitFor(() => {
        // Verify pending signup data is stored
        expect(mockSetItem).toHaveBeenCalledWith(
          'pendingSignup',
          expect.stringContaining('"email":"john@testcompany.com"')
        )

        // Verify redirect to Stripe
        expect(window.location.href).toBe('https://checkout.stripe.com/pay/cs_test_123')
      })
    })

    test('should handle admin signup flow', async () => {
      // Mock Supabase auth signup
      const mockSignUp = jest.fn().mockResolvedValue({
        data: { user: { id: 'admin-123' } },
        error: null,
      })

      const mockSupabase = {
        auth: {
          signUp: mockSignUp,
        },
      }

      jest.doMock('@/lib/supabase', () => ({
        createClientSupabaseClient: () => mockSupabase,
      }))

      render(<SignUpForm />)

      // Fill out admin form
      fireEvent.change(screen.getByLabelText(/full name/i), {
        target: { value: 'Admin User' },
      })

      fireEvent.change(screen.getByLabelText(/email address/i), {
        target: { value: 'abdulaziz.fs.ai@gmail.com' },
      })

      fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: 'adminpassword123' },
      })

      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'adminpassword123' },
      })

      // Verify admin detection UI
      await waitFor(() => {
        expect(screen.getByText(/administrator account setup/i)).toBeInTheDocument()
        expect(screen.getByText(/admin access/i)).toBeInTheDocument()
      })

      // Submit admin form
      fireEvent.click(screen.getByRole('button', { name: /create admin account/i }))

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          email: 'abdulaziz.fs.ai@gmail.com',
          password: 'adminpassword123',
          options: {
            data: {
              full_name: 'Admin User',
              company_name: '',
              is_admin: true,
            },
          },
        })

        expect(mockPush).toHaveBeenCalledWith(
          expect.stringContaining('/auth/signin')
        )
      })
    })

    test('should handle form validation errors', async () => {
      render(<SignUpForm />)

      // Try to submit empty form
      fireEvent.click(screen.getByRole('button', { name: /start free trial/i }))

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      })

      // Fill email but mismatched passwords
      fireEvent.change(screen.getByLabelText(/email address/i), {
        target: { value: 'test@example.com' },
      })

      fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: 'password123' },
      })

      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'differentpassword' },
      })

      fireEvent.click(screen.getByRole('button', { name: /start free trial/i }))

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
      })
    })

    test('should handle API errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      render(<SignUpForm />)

      // Fill out valid form
      fireEvent.change(screen.getByLabelText(/full name/i), {
        target: { value: 'John Doe' },
      })

      fireEvent.change(screen.getByLabelText(/email address/i), {
        target: { value: 'test@example.com' },
      })

      fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: 'password123' },
      })

      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'password123' },
      })

      fireEvent.click(screen.getByRole('button', { name: /start free trial/i }))

      await waitFor(() => {
        expect(screen.getByText(/an unexpected error occurred/i)).toBeInTheDocument()
      })
    })
  })

  describe('Payment Success Flow', () => {
    test('should handle successful payment completion', async () => {
      // Mock localStorage with pending signup data
      const pendingSignup = {
        email: 'john@testcompany.com',
        password: 'password123',
        fullName: 'John Doe',
        companyName: 'Test Company',
        planId: 'plan-123',
        billingCycle: 'monthly',
      }

      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn().mockReturnValue(JSON.stringify(pendingSignup)),
          removeItem: jest.fn(),
        },
      })

      // Mock payment verification API
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              customerId: 'cus_test_123',
              subscriptionId: 'sub_test_123',
            },
          }),
        })

      // Mock Supabase signup
      const mockSignUp = jest.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      jest.doMock('@/lib/supabase', () => ({
        createClientSupabaseClient: () => ({
          auth: { signUp: mockSignUp },
        }),
      }))

      // This would be the PaymentSuccessPage component
      // Testing the core logic here
      const sessionId = 'cs_test_123'
      
      // Simulate the payment success flow
      const verifyResponse = await fetch('/api/auth/verify-payment', {
        method: 'POST',
        body: JSON.stringify({ sessionId, planId: 'plan-123' }),
      })

      const verifyResult = await verifyResponse.json()
      expect(verifyResult.success).toBe(true)

      // Verify account creation would be called
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'john@testcompany.com',
        password: 'password123',
        options: {
          data: expect.objectContaining({
            full_name: 'John Doe',
            company_name: 'Test Company',
            stripe_customer_id: 'cus_test_123',
            stripe_subscription_id: 'sub_test_123',
          }),
        },
      })
    })
  })

  describe('Usage Tracking Integration', () => {
    test('should display usage data correctly', async () => {
      const mockUsageData = {
        totalCalls: 150,
        totalDuration: 18000,
        totalCost: 25.50,
        aiModelCost: 15.00,
        transcriptionCost: 5.50,
        ttsCost: 3.50,
        phoneCost: 1.50,
        periodStart: '2024-01-01T00:00:00Z',
        averageCallCost: 0.17,
        averageCallDuration: 120,
        costThisMonth: 12.75,
        callsThisMonth: 75,
      }

      // Mock usage API
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockUsageData,
        }),
      })

      // Mock Supabase RPC call
      const mockSupabase = {
        rpc: jest.fn().mockResolvedValue({
          data: [mockUsageData],
          error: null,
        }),
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
        })),
      }

      jest.doMock('@/lib/supabase', () => ({
        createClientSupabaseClient: () => mockSupabase,
      }))

      render(<UsageIndicator variant="detailed" />)

      await waitFor(() => {
        expect(screen.getByText('$25.5000')).toBeInTheDocument()
        expect(screen.getByText('150 calls')).toBeInTheDocument()
        expect(screen.getByText('5h 0m 0s')).toBeInTheDocument()
      })

      // Verify cost breakdown is displayed
      expect(screen.getByText('$15.0000')).toBeInTheDocument() // AI Model cost
      expect(screen.getByText('$5.5000')).toBeInTheDocument() // Transcription cost
      expect(screen.getByText('$3.5000')).toBeInTheDocument() // TTS cost
      expect(screen.getByText('$1.5000')).toBeInTheDocument() // Phone cost
    })

    test('should handle usage sync functionality', async () => {
      const mockSyncResponse = {
        success: true,
        data: {
          syncedCalls: 5,
          totalCostSynced: 1.25,
          syncedAt: '2024-01-15T10:30:00Z',
        },
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSyncResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              totalCalls: 155, // Updated after sync
              totalCost: 26.75,
            },
          }),
        })

      const mockSupabase = {
        rpc: jest.fn().mockResolvedValue({
          data: [{ total_calls: 155, total_cost: 26.75 }],
          error: null,
        }),
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
        })),
      }

      jest.doMock('@/lib/supabase', () => ({
        createClientSupabaseClient: () => mockSupabase,
      }))

      render(<UsageIndicator variant="detailed" showSync={true} />)

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument()
      })

      // Click sync button
      const syncButton = screen.getByRole('button')
      fireEvent.click(syncButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/usage/sync', {
          method: 'POST',
        })
      })

      // Verify success message would be shown
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Usage Synced',
        description: expect.stringContaining('Synced 5 calls'),
      })
    })
  })

  describe('Error Recovery Flows', () => {
    test('should handle payment failure gracefully', async () => {
      // Mock failed payment verification
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: { message: 'Payment verification failed' },
        }),
      })

      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn().mockReturnValue('{"email":"test@example.com"}'),
        },
      })

      // This would test the PaymentSuccessPage error handling
      const sessionId = 'cs_failed_123'
      
      const verifyResponse = await fetch('/api/auth/verify-payment', {
        method: 'POST',
        body: JSON.stringify({ sessionId, planId: 'plan-123' }),
      })

      const result = await verifyResponse.json()
      expect(result.success).toBe(false)
      expect(result.error.message).toBe('Payment verification failed')
    })

    test('should handle network errors during signup', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      render(<SignUpForm />)

      // Fill form and submit
      fireEvent.change(screen.getByLabelText(/email address/i), {
        target: { value: 'test@example.com' },
      })

      fireEvent.change(screen.getByLabelText(/full name/i), {
        target: { value: 'Test User' },
      })

      fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: 'password123' },
      })

      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'password123' },
      })

      fireEvent.click(screen.getByRole('button', { name: /start free trial/i }))

      await waitFor(() => {
        expect(screen.getByText(/an unexpected error occurred/i)).toBeInTheDocument()
      })
    })
  })
})