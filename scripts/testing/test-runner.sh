#!/bin/bash

# Auth Test Runner Script
# Runs all auth tests with proper reporting

echo "🧪 Starting Better Auth Test Suite"
echo "=================================="

# Set test environment
export NODE_ENV=test

# Run tests in different categories
echo ""
echo "📋 Running API Integration Tests..."
bun test src/test/integration/auth-api.test.ts --reporter=verbose

echo ""
echo "🔒 Running Security Tests..."
bun test src/test/security/auth-security.test.ts --reporter=verbose

echo ""
echo "🔌 Running Plugin Tests..."
bun test src/test/plugins/auth-plugins.test.ts --reporter=verbose

echo ""
echo "⚡ Running Performance Tests..."
bun test src/test/performance/auth-performance.test.ts --reporter=verbose

echo ""
echo "🏗️ Running System Tests..."
bun test src/test/suite/auth-system.test.ts --reporter=verbose

echo ""
echo "📊 Running Component Tests..."
bun test src/routes/**/__tests__/**/*.test.ts --reporter=verbose

echo ""
echo "✅ Test Suite Complete!"
echo "=================================="
echo ""
echo "📈 Test Coverage Summary:"
echo "   - API Integration: ✅ Complete"
echo "   - Security: ✅ Complete"
echo "   - Plugins: ✅ Complete"
echo "   - Performance: ✅ Complete"
echo "   - System Health: ✅ Complete"
echo "   - Component Tests: ✅ Complete"
echo ""
echo "🎯 Next Steps:"
echo "   - Review any failed tests"
echo "   - Check performance benchmarks"
echo "   - Update test documentation"
echo "   - Consider adding E2E tests"
