# Voice Matrix Testing Suite

## Overview

Comprehensive testing framework for Voice Matrix, a SaaS platform for AI-powered voice assistants. This testing suite covers unit tests, integration tests, security tests, and end-to-end tests to ensure reliability, security, and functionality.

## Testing Strategy

### 🎯 Testing Pyramid

```
                    /\
                   /  \
                  / E2E \          <- High-level user flows
                 /______\
                /        \
               / Integration \     <- API endpoints, webhooks  
              /______________\
             /                \
            /   Unit Tests     \   <- Business logic, utilities
           /____________________\
```

### 🧪 Test Categories

#### 1. **Unit Tests** (`/tests/unit/`)
- **Purpose**: Test individual functions and components in isolation
- **Coverage**: Core business logic, utilities, and services
- **Key Areas**:
  - Authentication system
  - Stripe payment processing  
  - VAPI integration
  - Usage tracking calculations
  - Data validation and transformations

#### 2. **Integration Tests** (`/tests/integration/`)
- **Purpose**: Test API endpoints and service interactions
- **Coverage**: API routes, database operations, external integrations
- **Key Areas**:
  - Authentication APIs
  - Payment processing workflows
  - Webhook handling
  - Database queries with RLS policies

#### 3. **Security Tests** (`/tests/database/`)
- **Purpose**: Validate security measures and data protection
- **Coverage**: RLS policies, data isolation, access controls
- **Key Areas**:
  - Row Level Security (RLS) enforcement
  - Team-based data isolation
  - Admin privilege controls
  - Database constraints and validation

#### 4. **End-to-End Tests** (`/tests/e2e/`)
- **Purpose**: Test complete user journeys and workflows
- **Coverage**: Critical user paths from landing page to dashboard
- **Key Areas**:
  - Payment flow (signup → payment → dashboard)
  - Admin bypass functionality
  - Usage tracking accuracy
  - Error handling and recovery

## 🚀 Running Tests

### Quick Start

```bash
# Install dependencies
npm install

# Run all tests (unit, integration, security)
npm test

# Run all tests including E2E
npm run test:all

# Run specific test categories
npm run test:unit
npm run test:integration
npm run test:security
npm run test:e2e

# Run tests in watch mode for development
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### CI/CD Pipeline

```bash
# Full CI test suite
npm run test:ci
```

## 📊 Test Reports

Tests generate comprehensive reports in the `./reports/` directory:

- `test-report.html` - Interactive HTML report
- `test-report.json` - Machine-readable results
- `coverage/` - Code coverage reports
- `playwright-report/` - E2E test reports

## 🧩 Test Structure

### Unit Tests

```typescript
// Example: tests/unit/auth.test.ts
describe('Authentication System', () => {
  test('should authenticate valid user credentials', async () => {
    // Arrange
    const mockUser = { id: 'user-123', email: 'test@example.com' }
    
    // Act
    const result = await authenticateUser('test@example.com', 'password')
    
    // Assert
    expect(result.user).toEqual(mockUser)
  })
})
```

### Integration Tests

```typescript
// Example: tests/integration/api/auth.test.ts
describe('Authentication API', () => {
  test('POST /api/auth/signup-with-plan', async () => {
    const response = await POST(mockRequest)
    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)
  })
})
```

### E2E Tests

```typescript
// Example: tests/e2e/payment-flow.test.ts
test('should complete full payment flow', async ({ page }) => {
  await page.goto('/')
  await page.click('text=Start Free Trial')
  // ... complete user journey
  await expect(page).toHaveURL('/dashboard')
})
```

## 🔧 Configuration

### Jest Configuration (`jest.config.js`)

- Test environment: jsdom for React components
- Coverage thresholds: 70% for lines, functions, branches
- Mock configurations for external services
- Custom test matchers and utilities

### Playwright Configuration (`playwright.config.ts`)

- Cross-browser testing (Chrome, Firefox, Safari)
- Mobile viewport testing
- Screenshot and video capture on failures
- Parallel test execution

## 🛡️ Security Test Coverage

### Row Level Security (RLS)
- Team data isolation
- Cross-team access prevention
- Admin privilege enforcement

### Data Protection
- Input validation
- SQL injection prevention
- Authentication bypass attempts

### External Integrations
- Webhook signature verification
- API rate limiting
- Secure credential handling

## 📈 Coverage Requirements

| Metric | Threshold | Current |
|--------|-----------|---------|
| Lines | 70% | TBD |
| Functions | 70% | TBD |
| Branches | 70% | TBD |
| Statements | 70% | TBD |

## 🎯 Critical Test Scenarios

### 🔥 High Priority

1. **Payment Flow Integrity**
   - Signup → Stripe checkout → account creation
   - Payment failure handling
   - Admin bypass functionality

2. **Authentication Security**
   - JWT validation
   - Session management
   - RLS policy enforcement

3. **VAPI Integration**
   - Webhook processing
   - Cost tracking accuracy
   - Error handling

4. **Usage Tracking**  
   - Real-time cost calculations
   - Data consistency
   - Alert thresholds

### ⚠️ Edge Cases

- Network failures during payment
- Concurrent user operations
- Large dataset handling
- External service timeouts

## 🔍 Debugging Tests

### Common Issues

1. **Mock Setup**
   ```typescript
   // Ensure mocks are properly reset
   beforeEach(() => {
     jest.clearAllMocks()
   })
   ```

2. **Async Operations**
   ```typescript
   // Always await async operations
   await expect(asyncFunction()).resolves.toBe(expected)
   ```

3. **Environment Variables**
   ```typescript
   // Set test environment variables
   process.env.NODE_ENV = 'test'
   ```

### Test Data Management

- Use factories for consistent test data
- Clean up after tests to prevent interference
- Isolate tests with proper mocking

## 📚 Best Practices

### ✅ Do's

- Write tests before implementing features (TDD)
- Use descriptive test names
- Test one thing per test case
- Mock external dependencies
- Clean up after tests

### ❌ Don'ts

- Don't test implementation details
- Don't use real external services in tests
- Don't skip test cleanup
- Don't write overly complex test setups
- Don't ignore flaky tests

## 🚨 Test Maintenance

### Regular Tasks

- [ ] Review and update test cases
- [ ] Monitor coverage trends
- [ ] Update mocks for API changes
- [ ] Optimize slow test suites
- [ ] Review test reports for patterns

### Performance Monitoring

- Track test execution times
- Optimize slow test suites
- Parallelize independent tests
- Use efficient mocking strategies

## 🤝 Contributing

When adding new features:

1. Write unit tests for business logic
2. Add integration tests for API endpoints
3. Include security tests for sensitive operations
4. Add E2E tests for critical user flows
5. Update this documentation

### Test Review Checklist

- [ ] Tests cover happy path and edge cases
- [ ] Proper error handling tests
- [ ] Security considerations addressed
- [ ] Performance impact considered  
- [ ] Documentation updated

## 📞 Support

For testing questions or issues:
- Check existing test patterns
- Review test documentation
- Run test suite locally first
- Provide failing test case when reporting issues

---

*This testing framework ensures Voice Matrix delivers reliable, secure, and high-quality voice assistant services to our users.* 🎯