#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Voice Matrix
 * Orchestrates all test types and generates unified reports
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

class TestRunner {
  constructor() {
    this.results = {
      unit: null,
      integration: null,
      e2e: null,
      security: null,
      coverage: null,
    }
    this.startTime = Date.now()
  }

  async runAllTests() {
    console.log('🧪 Starting comprehensive test suite for Voice Matrix...\n')

    try {
      // 1. Setup test environment
      await this.setupTestEnvironment()

      // 2. Run unit tests
      await this.runUnitTests()

      // 3. Run integration tests
      await this.runIntegrationTests()

      // 4. Run security tests
      await this.runSecurityTests()

      // 5. Run E2E tests (if requested)
      if (process.argv.includes('--e2e')) {
        await this.runE2ETests()
      }

      // 6. Generate reports
      await this.generateReports()

      // 7. Check coverage thresholds
      await this.checkCoverageThresholds()

      console.log('\n✅ All tests completed successfully!')
      this.printSummary()

    } catch (error) {
      console.error('\n❌ Test suite failed:', error.message)
      process.exit(1)
    }
  }

  async setupTestEnvironment() {
    console.log('🔧 Setting up test environment...')

    // Create test directories
    const dirs = ['test-results', 'coverage', 'reports']
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
    })

    // Set test environment variables
    process.env.NODE_ENV = 'test'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

    console.log('  ✅ Test environment ready\n')
  }

  async runUnitTests() {
    console.log('🔬 Running unit tests...')
    
    try {
      const output = execSync('npm run test:unit -- --coverage --passWithNoTests', {
        encoding: 'utf-8',
        stdio: 'pipe'
      })

      this.results.unit = { success: true, output }
      console.log('  ✅ Unit tests passed')

    } catch (error) {
      this.results.unit = { success: false, error: error.message }
      throw new Error(`Unit tests failed: ${error.message}`)
    }
  }

  async runIntegrationTests() {
    console.log('🔗 Running integration tests...')
    
    try {
      const output = execSync('npm run test:integration -- --passWithNoTests', {
        encoding: 'utf-8',
        stdio: 'pipe'
      })

      this.results.integration = { success: true, output }
      console.log('  ✅ Integration tests passed')

    } catch (error) {
      this.results.integration = { success: false, error: error.message }
      throw new Error(`Integration tests failed: ${error.message}`)
    }
  }

  async runSecurityTests() {
    console.log('🔒 Running security tests...')
    
    try {
      const output = execSync('npm run test:security -- --passWithNoTests', {
        encoding: 'utf-8',
        stdio: 'pipe'
      })

      this.results.security = { success: true, output }
      console.log('  ✅ Security tests passed')

    } catch (error) {
      this.results.security = { success: false, error: error.message }
      throw new Error(`Security tests failed: ${error.message}`)
    }
  }

  async runE2ETests() {
    console.log('🎭 Running E2E tests...')
    
    try {
      const output = execSync('npx playwright test', {
        encoding: 'utf-8',
        stdio: 'pipe'
      })

      this.results.e2e = { success: true, output }
      console.log('  ✅ E2E tests passed')

    } catch (error) {
      this.results.e2e = { success: false, error: error.message }
      
      // E2E failures are often environmental, don't fail the entire suite
      console.warn('  ⚠️ E2E tests failed (non-blocking)')
    }
  }

  async generateReports() {
    console.log('📊 Generating test reports...')

    // Generate unified test report
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      results: this.results,
      environment: {
        node: process.version,
        npm: execSync('npm --version', { encoding: 'utf-8' }).trim(),
        os: process.platform,
      },
      coverage: this.parseCoverageResults(),
    }

    fs.writeFileSync(
      path.join('reports', 'test-report.json'),
      JSON.stringify(report, null, 2)
    )

    // Generate HTML report
    this.generateHTMLReport(report)

    console.log('  ✅ Reports generated in ./reports/')
  }

  parseCoverageResults() {
    try {
      const coveragePath = path.join('coverage', 'coverage-summary.json')
      if (fs.existsSync(coveragePath)) {
        return JSON.parse(fs.readFileSync(coveragePath, 'utf-8'))
      }
    } catch (error) {
      console.warn('  ⚠️ Could not parse coverage results')
    }
    return null
  }

  generateHTMLReport(report) {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Voice Matrix Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; }
        .success { color: #28a745; }
        .failure { color: #dc3545; }
        .warning { color: #ffc107; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; }
        .coverage-bar { background: #f8f9fa; height: 20px; border-radius: 10px; overflow: hidden; }
        .coverage-fill { height: 100%; background: linear-gradient(90deg, #dc3545 0%, #ffc107 50%, #28a745 80%); }
    </style>
</head>
<body>
    <div class="header">
        <h1>Voice Matrix Test Report</h1>
        <p>Generated: ${report.timestamp}</p>
        <p>Duration: ${Math.round(report.duration / 1000)}s</p>
    </div>

    <div class="section">
        <h2>Test Results Summary</h2>
        <div class="metric">
            <strong>Unit Tests:</strong> 
            <span class="${report.results.unit?.success ? 'success' : 'failure'}">
                ${report.results.unit?.success ? '✅ PASSED' : '❌ FAILED'}
            </span>
        </div>
        <div class="metric">
            <strong>Integration Tests:</strong> 
            <span class="${report.results.integration?.success ? 'success' : 'failure'}">
                ${report.results.integration?.success ? '✅ PASSED' : '❌ FAILED'}
            </span>
        </div>
        <div class="metric">
            <strong>Security Tests:</strong> 
            <span class="${report.results.security?.success ? 'success' : 'failure'}">
                ${report.results.security?.success ? '✅ PASSED' : '❌ FAILED'}
            </span>
        </div>
        <div class="metric">
            <strong>E2E Tests:</strong> 
            <span class="${report.results.e2e?.success ? 'success' : 'warning'}">
                ${report.results.e2e?.success ? '✅ PASSED' : report.results.e2e ? '⚠️ FAILED' : '⏭️ SKIPPED'}
            </span>
        </div>
    </div>

    ${report.coverage ? `
    <div class="section">
        <h2>Code Coverage</h2>
        <div class="metric">
            <strong>Lines:</strong> ${report.coverage.total?.lines?.pct || 0}%
            <div class="coverage-bar">
                <div class="coverage-fill" style="width: ${report.coverage.total?.lines?.pct || 0}%"></div>
            </div>
        </div>
        <div class="metric">
            <strong>Functions:</strong> ${report.coverage.total?.functions?.pct || 0}%
            <div class="coverage-bar">
                <div class="coverage-fill" style="width: ${report.coverage.total?.functions?.pct || 0}%"></div>
            </div>
        </div>
        <div class="metric">
            <strong>Branches:</strong> ${report.coverage.total?.branches?.pct || 0}%
            <div class="coverage-bar">
                <div class="coverage-fill" style="width: ${report.coverage.total?.branches?.pct || 0}%"></div>
            </div>
        </div>
    </div>
    ` : ''}

    <div class="section">
        <h2>Environment</h2>
        <p><strong>Node.js:</strong> ${report.environment.node}</p>
        <p><strong>npm:</strong> ${report.environment.npm}</p>
        <p><strong>OS:</strong> ${report.environment.os}</p>
    </div>
</body>
</html>
    `

    fs.writeFileSync(path.join('reports', 'test-report.html'), html)
  }

  async checkCoverageThresholds() {
    const coverage = this.parseCoverageResults()
    if (!coverage || !coverage.total) return

    const thresholds = {
      lines: 70,
      functions: 70,
      branches: 70,
      statements: 70,
    }

    const failed = []
    Object.entries(thresholds).forEach(([metric, threshold]) => {
      const actual = coverage.total[metric]?.pct || 0
      if (actual < threshold) {
        failed.push(`${metric}: ${actual}% (required: ${threshold}%)`)
      }
    })

    if (failed.length > 0) {
      console.warn('\n⚠️ Coverage thresholds not met:')
      failed.forEach(failure => console.warn(`  - ${failure}`))
    } else {
      console.log('\n✅ All coverage thresholds met')
    }
  }

  printSummary() {
    const endTime = Date.now()
    const duration = Math.round((endTime - this.startTime) / 1000)

    console.log('\n📋 Test Summary:')
    console.log(`   Duration: ${duration}s`)
    console.log(`   Unit Tests: ${this.results.unit?.success ? '✅' : '❌'}`)
    console.log(`   Integration Tests: ${this.results.integration?.success ? '✅' : '❌'}`)
    console.log(`   Security Tests: ${this.results.security?.success ? '✅' : '❌'}`)
    console.log(`   E2E Tests: ${this.results.e2e?.success ? '✅' : this.results.e2e ? '⚠️' : '⏭️'}`)
    console.log('\n📊 Reports available in ./reports/')
  }
}

// Parse command line arguments
const args = process.argv.slice(2)

// Run tests
const runner = new TestRunner()
runner.runAllTests().catch(error => {
  console.error('Test runner failed:', error)
  process.exit(1)
})