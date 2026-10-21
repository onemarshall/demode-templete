# Email Test Suite

Comprehensive vitest test suite for the email system, covering all aspects of email functionality including providers, templates, security, and integration.

## 📋 Test Files Overview

### 🧪 Core Test Files

#### `test-email-vitest.test.ts`

- **Purpose**: Core email provider functionality tests
- **Coverage**: Provider factory, initialization, basic email operations
- **Tests**: 25+ test cases covering provider creation, email sending, error handling

#### `test-email-templates.test.ts`

- **Purpose**: Email template validation and rendering
- **Coverage**: All email templates (verification, OTP, password reset, welcome, magic link, etc.)
- **Tests**: 30+ test cases covering template generation, security, accessibility, performance

#### `test-email-providers.test.ts`

- **Purpose**: Individual email provider implementation tests
- **Coverage**: Usesend and Resend providers
- **Tests**: 40+ test cases covering provider-specific functionality, error handling, performance

#### `test-email-integration.test.ts`

- **Purpose**: End-to-end integration tests
- **Coverage**: Complete email system workflow
- **Tests**: 20+ test cases covering system integration, security, performance, configuration

## 🚀 Running Tests

### All Email Tests

```bash
bun run test:email
```

### Individual Test Categories

```bash
# Core functionality tests
bun run test:email:unit

# Template tests
bun run test:email:templates

# Provider tests
bun run test:email:providers

# Integration tests
bun run test:email:integration
```

### Watch Mode

```bash
bun run test:email:watch
```

### Coverage Report

```bash
bun run test:email:coverage
```

## 🏗️ Test Architecture

### Test Structure

```text
scripts/email/
├── test-email-vitest.test.ts      # Core provider tests
├── test-email-templates.test.ts   # Template validation tests
├── test-email-providers.test.ts   # Provider-specific tests
├── test-email-integration.test.ts # End-to-end tests
├── vitest.email.config.ts         # Test configuration
└── README.md                       # This file
```

### Configuration

- **Environment**: Node.js (isolated from browser dependencies)
- **Timeout**: 30 seconds for hooks and individual tests
- **Concurrency**: Tests run concurrently for performance
- **Mocking**: Comprehensive fetch mocking for network calls

## 🧪 Test Categories

### 1. Provider Factory Tests

- ✅ Provider creation for different types
- ✅ Configuration validation
- ✅ Error handling for invalid providers
- ✅ Singleton pattern implementation

### 2. Email Template Tests

- ✅ Template generation for all email types
- ✅ Parameter validation
- ✅ HTML sanitization and security
- ✅ Accessibility compliance
- ✅ Performance benchmarks

### 3. Provider Implementation Tests

- ✅ Usesend provider functionality
- ✅ Resend provider functionality
- ✅ API error handling
- ✅ Network error resilience
- ✅ Health check implementation

### 4. Integration Tests

- ✅ End-to-end email workflows
- ✅ Provider switching
- ✅ Configuration management
- ✅ Security validation
- ✅ Performance under load

## 🔧 Test Configuration

### Environment Variables

Tests use mocked environment variables:

```typescript
EMAIL_PROVIDER: 'usesend';
EMAIL_API_KEY: 'test-api-key-12345';
EMAIL_PROVIDER_URL: 'https://test.usesend.com';
EMAIL_FROM: 'noreply@testapp.com';
EMAIL_TO: 'testuser@example.com';
PUBLIC_APP_NAME: 'TestApp';
```

### Mock Configuration

- **Fetch API**: Comprehensive mocking of all network requests
- **Environment**: Isolated Node.js environment
- **Timeouts**: 30-second timeouts for all operations
- **Cleanup**: Automatic cleanup between tests

## 🛡️ Security Testing

### Email Injection Prevention

- Tests for header injection attacks
- Validation of email addresses
- HTML content sanitization
- API key security

### Content Security

- XSS prevention in email content
- URL validation in magic links
- HTML escaping in templates
- Text fallback validation

## ⚡ Performance Testing

### Benchmark Tests

- Email generation performance (< 1 second)
- Batch email operations (< 5 seconds for 10 emails)
- High-volume operations (< 15 seconds for 50 emails)
- Error handling performance

### Load Testing

- Concurrent email sending
- Memory usage validation
- Resource cleanup verification
- Timeout handling

## 🔍 Test Coverage

### Core Functionality

- [x] Provider factory and initialization
- [x] Email sending operations
- [x] Template generation
- [x] Error handling
- [x] Health checks

### Template Coverage

- [x] Verification emails
- [x] OTP emails
- [x] Password reset emails
- [x] Welcome emails
- [x] Magic link emails
- [x] Delete account emails
- [x] Notification emails

### Provider Coverage

- [x] Usesend provider
- [x] Resend provider
- [x] Error handling
- [x] Network resilience
- [x] Configuration validation

### Security Coverage

- [x] Email injection prevention
- [x] XSS protection
- [x] Content sanitization
- [x] API key security
- [x] URL validation

### Integration Coverage

- [x] End-to-end workflows
- [x] Provider switching
- [x] Configuration management
- [x] Performance under load
- [x] Error recovery

## 🚨 Error Scenarios Tested

### API Errors

- 400 Bad Request
- 401 Unauthorized
- 429 Rate Limiting
- 500 Internal Server Error
- 503 Service Unavailable

### Network Errors

- Connection timeouts
- Network unreachable
- DNS resolution failures
- SSL/TLS errors

### Configuration Errors

- Invalid provider types
- Missing API keys
- Invalid email addresses
- Malformed URLs

## 📊 Test Metrics

### Performance Benchmarks

- **Single Email**: < 1 second
- **Batch (10 emails)**: < 5 seconds
- **High Volume (50 emails)**: < 15 seconds
- **Health Check**: < 2 seconds

### Coverage Goals

- **Statement Coverage**: > 95%
- **Branch Coverage**: > 90%
- **Function Coverage**: > 95%
- **Line Coverage**: > 95%

## 🔧 Debugging Tests

### Common Issues

1. **Import Errors**: Ensure all dependencies are installed
2. **Mock Failures**: Check fetch mock configuration
3. **Timeout Issues**: Verify network mocking is working
4. **Environment Variables**: Ensure test environment is properly configured

### Debug Commands

```bash
# Run with verbose output
bun run test:email --reporter=verbose

# Run specific test file
bun run vitest run scripts/email/test-email-vitest.test.ts --reporter=verbose

# Run with coverage
bun run test:email:coverage

# Run in watch mode for debugging
bun run test:email:watch
```

## 📝 Writing New Tests

### Test File Structure

```typescript
describe('Test Category', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Setup test state
	});

	it('should do something specific', async () => {
		// Arrange
		// Act
		// Assert
	});
});
```

### Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up after tests
3. **Mocking**: Mock external dependencies
4. **Assertions**: Be specific with expectations
5. **Error Testing**: Test both success and failure cases

## 🎯 Future Enhancements

### Planned Additions

- [ ] Load testing with realistic volumes
- [ ] Multi-provider failover testing
- [ ] Email delivery tracking tests
- [ ] Template A/B testing framework
- [ ] Performance regression testing

### Integration Opportunities

- [ ] CI/CD pipeline integration
- [ ] Automated performance monitoring
- [ ] Security scanning integration
- [ ] Coverage reporting automation

## 📞 Support

For questions or issues with the email test suite:

1. Check this README first
2. Review existing test files for examples
3. Run tests with verbose output for debugging
4. Check package.json for available test scripts

---

**Note**: This test suite is designed to work with the existing email infrastructure and provides
comprehensive coverage for all email-related functionality in the application.
