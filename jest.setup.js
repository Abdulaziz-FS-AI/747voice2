import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// Polyfill Node.js globals for Next.js
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock Next.js server globals
global.Request = class Request {
  constructor(input, init) {
    this.url = input
    this.method = init?.method || 'GET'
    this.headers = new Headers(init?.headers)
    this.body = init?.body
  }
}

global.Response = class Response {
  constructor(body, init) {
    this.body = body
    this.status = init?.status || 200
    this.headers = new Headers(init?.headers)
  }
  
  static json(data, init) {
    return new Response(JSON.stringify(data), {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers }
    })
  }
}

global.Headers = class Headers {
  constructor(init) {
    this.map = new Map()
    if (init) {
      if (Array.isArray(init)) {
        init.forEach(([key, value]) => this.set(key, value))
      } else if (typeof init === 'object') {
        Object.entries(init).forEach(([key, value]) => this.set(key, value))
      }
    }
  }
  
  set(key, value) { this.map.set(key.toLowerCase(), value) }
  get(key) { return this.map.get(key.toLowerCase()) }
  has(key) { return this.map.has(key.toLowerCase()) }
  delete(key) { return this.map.delete(key.toLowerCase()) }
}

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.VAPI_API_KEY = 'test-vapi-key'
process.env.STRIPE_SECRET_KEY = 'sk_test_mock'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.NEXTAUTH_URL = 'http://localhost:3000'

// Mock fetch globally
global.fetch = jest.fn()

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      order: jest.fn().mockReturnThis(),
    })),
    rpc: jest.fn(),
  })),
}))

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn(),
        retrieve: jest.fn(),
      },
    },
    prices: {
      list: jest.fn(),
      create: jest.fn(),
    },
    products: {
      list: jest.fn(),
      create: jest.fn(),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  }))
})

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/',
}))

// Global test utilities
global.testUtils = {
  mockSupabaseClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ 
        data: { user: { id: 'test-user-id', email: 'test@example.com' } } 
      }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  }),
  
  mockRequest: (body = {}, headers = {}) => ({
    json: jest.fn().mockResolvedValue(body),
    headers: new Headers(headers),
  }),
  
  mockResponse: () => ({
    json: jest.fn(),
    status: jest.fn(),
  }),
}