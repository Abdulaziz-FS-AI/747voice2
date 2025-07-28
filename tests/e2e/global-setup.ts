/**
 * Global setup for Playwright E2E tests
 * Sets up test database, mock services, and test users
 */

import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up E2E test environment...')

  const browser = await chromium.launch()
  const page = await browser.newPage()

  try {
    // 1. Set up test database
    await setupTestDatabase()

    // 2. Create test users and teams
    await createTestUsers()

    // 3. Set up mock services
    await setupMockServices()

    // 4. Seed test data
    await seedTestData()

    // 5. Verify application is ready
    await verifyApplicationReady(page)

    console.log('✅ E2E test environment setup complete')

  } catch (error) {
    console.error('❌ Failed to set up E2E test environment:', error)
    throw error
  } finally {
    await browser.close()
  }
}

async function setupTestDatabase() {
  console.log('Setting up test database...')
  
  // In a real implementation, this would:
  // 1. Create/reset test database
  // 2. Run migrations
  // 3. Set up test data isolation
  
  // Mock implementation
  process.env.SUPABASE_URL = process.env.TEST_SUPABASE_URL || 'https://test.supabase.co'
  process.env.SUPABASE_ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY || 'test-anon-key'
}

async function createTestUsers() {
  console.log('Creating test users...')
  
  // Test users that will be used across tests
  const testUsers = [
    {
      id: 'test-user-1',
      email: 'test@example.com',
      password: 'TestPassword123!',
      team_id: 'test-team-1',
      role: 'admin',
    },
    {
      id: 'test-admin',
      email: 'abdulaziz.fs.ai@gmail.com',
      password: 'AdminPassword123!',
      is_system_admin: true,
    },
    {
      id: 'test-paid-user',
      email: 'paid-user@example.com',
      password: 'PaidPassword123!',
      team_id: 'test-team-paid',
      subscription_status: 'active',
    },
  ]

  // In real implementation, would create these users in test database
  for (const user of testUsers) {
    console.log(`  Creating test user: ${user.email}`)
  }
}

async function setupMockServices() {
  console.log('Setting up mock services...')
  
  // Set up mock environment variables
  process.env.STRIPE_SECRET_KEY = 'sk_test_mock'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_mock'
  process.env.VAPI_API_KEY = 'vapi_test_mock'
  process.env.VAPI_WEBHOOK_SECRET = 'vapi_webhook_test_mock'
  
  // In real implementation:
  // 1. Start mock Stripe server
  // 2. Start mock VAPI server
  // 3. Configure webhook endpoints
}

async function seedTestData() {
  console.log('Seeding test data...')
  
  // Seed pricing plans
  const pricingPlans = [
    {
      id: 'plan-starter',
      name: 'starter',
      display_name: 'Starter Plan',
      price_monthly: 0,
      price_yearly: 0,
      max_assistants: 1,
      max_phone_numbers: 1,
      is_active: true,
    },
    {
      id: 'plan-professional',
      name: 'professional',
      display_name: 'Professional Plan',
      price_monthly: 79,
      price_yearly: 790,
      max_assistants: 5,
      max_phone_numbers: 3,
      is_active: true,
    },
    {
      id: 'plan-enterprise',
      name: 'enterprise',
      display_name: 'Enterprise Plan',
      price_monthly: 199,
      price_yearly: 1990,
      max_assistants: -1, // unlimited
      max_phone_numbers: 10,
      is_active: true,
    },
  ]

  // In real implementation, would insert into test database
  for (const plan of pricingPlans) {
    console.log(`  Seeding pricing plan: ${plan.display_name}`)
  }

  // Seed sample assistants, calls, leads, etc.
  console.log('  Seeding sample assistants...')
  console.log('  Seeding sample calls...')
  console.log('  Seeding sample leads...')
}

async function verifyApplicationReady(page: any) {
  console.log('Verifying application is ready...')
  
  try {
    // Check if the application loads
    await page.goto(process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000')
    
    // Wait for the landing page to load
    await page.waitForSelector('h1', { timeout: 30000 })
    
    // Verify critical pages are accessible
    await page.goto('/pricing')
    await page.waitForSelector('text=Choose Your Voice Matrix Plan', { timeout: 10000 })
    
    await page.goto('/auth/signin')
    await page.waitForSelector('text=Sign In', { timeout: 10000 })
    
    console.log('  Application is ready for testing')
    
  } catch (error) {
    console.error('  Application readiness check failed:', error)
    throw new Error('Application is not ready for testing')
  }
}

export default globalSetup