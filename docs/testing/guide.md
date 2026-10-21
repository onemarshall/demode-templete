# Testing Guide

This guide explains how to use mock providers for testing and development.

## Mock Providers

Mock providers allow you to test your application without making real API calls or storing files.

### Email Mock Provider

The mock email provider logs all emails to memory instead of sending them.

#### Email Provider Setup

```typescript
import { initializeEmail } from '$lib/server/email';
import { MockEmailProvider } from '$lib/server/email/providers/mock';

const email = new MockEmailProvider({
	provider: 'mock',
	fromEmail: 'test@example.com'
});
```

#### Email Provider Usage in Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MockEmailProvider } from '$lib/server/email/providers/mock';

describe('Email Sending', () => {
	let emailProvider: MockEmailProvider;

	beforeEach(() => {
		emailProvider = new MockEmailProvider({
			provider: 'mock',
			fromEmail: 'test@example.com'
		});
	});

	it('should send verification email', async () => {
		await emailProvider.sendVerificationEmail('user@example.com', 'token-123', 'My App');

		const lastEmail = emailProvider.getLastEmail();
		expect(lastEmail).toBeDefined();
		expect(lastEmail?.to).toBe('user@example.com');
		expect(lastEmail?.type).toBe('verification');
		expect(lastEmail?.html).toContain('token-123');
	});

	it('should send OTP email', async () => {
		await emailProvider.sendOTPEmail('user@example.com', '123456', 'My App');

		const lastEmail = emailProvider.getLastEmail();
		expect(lastEmail?.type).toBe('otp');
		expect(lastEmail?.html).toContain('123456');
	});

	it('should track email history', async () => {
		await emailProvider.sendVerificationEmail('user1@example.com', 'token1', 'App');
		await emailProvider.sendOTPEmail('user2@example.com', '123456', 'App');

		const log = emailProvider.getEmailLog();
		expect(log).toHaveLength(2);
		expect(log[0].to).toBe('user1@example.com');
		expect(log[1].to).toBe('user2@example.com');
	});

	it('should find emails by recipient', async () => {
		await emailProvider.sendVerificationEmail('user@example.com', 'token1', 'App');
		await emailProvider.sendVerificationEmail('user@example.com', 'token2', 'App');
		await emailProvider.sendOTPEmail('other@example.com', '123456', 'App');

		const userEmails = emailProvider.getEmailsByRecipient('user@example.com');
		expect(userEmails).toHaveLength(2);
	});

	it('should find emails by type', async () => {
		await emailProvider.sendVerificationEmail('user@example.com', 'token', 'App');
		await emailProvider.sendOTPEmail('user@example.com', '123456', 'App');
		await emailProvider.sendPasswordResetEmail('user@example.com', 'reset-token', 'App');

		const otpEmails = emailProvider.getEmailsByType('otp');
		expect(otpEmails).toHaveLength(1);
	});

	it('should find email with token', async () => {
		const token = 'unique-token-123';
		await emailProvider.sendVerificationEmail('user@example.com', token, 'App');

		const email = emailProvider.findEmailWithToken(token);
		expect(email).toBeDefined();
		expect(email?.html).toContain(token);
	});

	it('should support failure mode for testing error handling', async () => {
		emailProvider.setFailureMode(true);

		await expect(
			emailProvider.sendVerificationEmail('user@example.com', 'token', 'App')
		).rejects.toThrow('Mock email provider configured to fail');
	});

	it('should clear email log', async () => {
		await emailProvider.sendVerificationEmail('user@example.com', 'token', 'App');
		expect(emailProvider.getEmailLog()).toHaveLength(1);

		emailProvider.clearEmailLog();
		expect(emailProvider.getEmailLog()).toHaveLength(0);
	});
});
```

### Storage Mock Provider

The mock storage provider stores files in memory instead of uploading them.

#### Storage Provider Setup

```typescript
import { initializeStorage } from '$lib/server/storage';
import { MockStorageProvider } from '$lib/server/storage/providers/mock';

const storage = new MockStorageProvider({
	provider: 'mock'
});
```

#### File Storage Provider Usage in Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MockStorageProvider } from '$lib/server/storage/providers/mock';

describe('File Storage', () => {
	let storageProvider: MockStorageProvider;

	beforeEach(() => {
		storageProvider = new MockStorageProvider({
			provider: 'mock'
		});
	});

	it('should upload file', async () => {
		const file = new File(['content'], 'test.txt', { type: 'text/plain' });
		const uploaded = await storageProvider.uploadFile(file, 'files/test.txt');

		expect(uploaded.path).toBe('files/test.txt');
		expect(uploaded.size).toBe(7);
		expect(uploaded.type).toBe('text/plain');
	});

	it('should retrieve uploaded file', async () => {
		const file = new File(['content'], 'test.txt');
		await storageProvider.uploadFile(file, 'files/test.txt');

		const retrieved = await storageProvider.getFile('files/test.txt');
		expect(retrieved).toBeDefined();
		expect(retrieved?.path).toBe('files/test.txt');
	});

	it('should delete file', async () => {
		const file = new File(['content'], 'test.txt');
		await storageProvider.uploadFile(file, 'files/test.txt');

		await storageProvider.deleteFile('files/test.txt');

		const retrieved = await storageProvider.getFile('files/test.txt');
		expect(retrieved).toBeNull();
	});

	it('should list files in directory', async () => {
		const file1 = new File(['content1'], 'file1.txt');
		const file2 = new File(['content2'], 'file2.txt');

		await storageProvider.uploadFile(file1, 'avatars/user1.jpg');
		await storageProvider.uploadFile(file2, 'avatars/user2.jpg');

		const files = await storageProvider.listFiles('avatars');
		expect(files).toHaveLength(2);
	});

	it('should get file count', async () => {
		const file = new File(['content'], 'test.txt');
		await storageProvider.uploadFile(file, 'files/test.txt');

		expect(storageProvider.getFileCount()).toBe(1);
	});

	it('should check file existence', async () => {
		const file = new File(['content'], 'test.txt');
		await storageProvider.uploadFile(file, 'files/test.txt');

		expect(storageProvider.fileExists('files/test.txt')).toBe(true);
		expect(storageProvider.fileExists('files/nonexistent.txt')).toBe(false);
	});

	it('should get file content', async () => {
		const file = new File(['test content'], 'test.txt');
		await storageProvider.uploadFile(file, 'files/test.txt');

		const content = storageProvider.getFileContent('files/test.txt');
		expect(content?.toString()).toBe('test content');
	});

	it('should filter files by type', async () => {
		const jpgFile = new File(['jpg'], 'image.jpg', { type: 'image/jpeg' });
		const txtFile = new File(['txt'], 'document.txt', { type: 'text/plain' });

		await storageProvider.uploadFile(jpgFile, 'files/image.jpg');
		await storageProvider.uploadFile(txtFile, 'files/document.txt');

		const jpgFiles = storageProvider.getFilesByType('image/jpeg');
		expect(jpgFiles).toHaveLength(1);
	});

	it('should support failure mode for testing error handling', async () => {
		storageProvider.setFailureMode(true);

		const file = new File(['content'], 'test.txt');
		await expect(storageProvider.uploadFile(file, 'files/test.txt')).rejects.toThrow(
			'Mock storage provider configured to fail'
		);
	});

	it('should clear all files', async () => {
		const file = new File(['content'], 'test.txt');
		await storageProvider.uploadFile(file, 'files/test.txt');

		storageProvider.clearAllFiles();
		expect(storageProvider.getFileCount()).toBe(0);
	});
});
```

## Integration Testing

### Testing Authentication Flow

```typescript
describe('Authentication Flow', () => {
	let emailProvider: MockEmailProvider;
	let storageProvider: MockStorageProvider;

	beforeEach(() => {
		emailProvider = new MockEmailProvider({
			provider: 'mock',
			fromEmail: 'noreply@example.com'
		});
		storageProvider = new MockStorageProvider({
			provider: 'mock'
		});
	});

	it('should complete sign-up flow', async () => {
		// Sign up
		await emailProvider.sendVerificationEmail('user@example.com', 'verify-token', 'App');

		// Check verification email was sent
		const verificationEmail = emailProvider.findEmailWithToken('verify-token');
		expect(verificationEmail).toBeDefined();

		// User uploads avatar
		const avatarFile = new File(['avatar'], 'avatar.jpg', { type: 'image/jpeg' });
		const uploaded = await storageProvider.uploadFile(avatarFile, 'avatars/user-123.jpg');

		// Check avatar was stored
		expect(storageProvider.fileExists('avatars/user-123.jpg')).toBe(true);
		expect(uploaded.url).toContain('user-123.jpg');
	});

	it('should handle 2FA setup', async () => {
		// Send OTP
		await emailProvider.sendOTPEmail('user@example.com', '123456', 'App');

		// Verify OTP email was sent
		const otpEmail = emailProvider.findEmailWithOTP('123456');
		expect(otpEmail).toBeDefined();
		expect(otpEmail?.type).toBe('otp');
	});
});
```

## Environment Configuration

### Development with Mocks

```env
# .env.development
EMAIL_PROVIDER=mock
STORAGE_PROVIDER=mock
```

### Testing

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		setupFiles: ['./src/__tests__/setup.ts']
	}
});
```

### Setup File

```typescript
// src/__tests__/setup.ts
import { beforeEach } from 'vitest';

beforeEach(() => {
	// Reset all mocks before each test
	process.env.EMAIL_PROVIDER = 'mock';
	process.env.STORAGE_PROVIDER = 'mock';
});
```

## Best Practices

1. **Use Mocks in Tests**

   ```typescript
   // ✅ Good
   const email = new MockEmailProvider({ provider: 'mock', fromEmail: 'test@example.com' });
   await email.sendVerificationEmail('user@example.com', 'token', 'App');
   expect(email.getLastEmail()).toBeDefined();

   // ❌ Bad
   // Making real API calls in tests
   ```

2. **Clear State Between Tests**

   ```typescript
   beforeEach(() => {
   	emailProvider.clearEmailLog();
   	storageProvider.clearAllFiles();
   });
   ```

3. **Test Error Handling**

   ```typescript
   it('should handle email sending failure', async () => {
     emailProvider.setFailureMode(true);
     await expect(emailProvider.sendVerificationEmail(...)).rejects.toThrow();
   });
   ```

4. **Verify Side Effects**

   ```typescript
   it('should log email activity', async () => {
   	await emailProvider.sendVerificationEmail('user@example.com', 'token', 'App');
   	expect(emailProvider.getEmailLog()).toHaveLength(1);
   });
   ```

## Running Tests

```bash
# Run all tests
bun run test

# Run specific test file
bun run test src/__tests__/email.test.ts

# Run tests in watch mode
bun run test:watch

# Generate coverage report
bun run test:coverage
```

## Debugging Tests

### View Email Log

```typescript
const log = emailProvider.getEmailLog();
console.log(JSON.stringify(log, null, 2));
```

### View Storage Files

```typescript
const files = storageProvider.getAllFiles();
for (const [path, file] of files.entries()) {
	console.log(`${path}: ${file.size} bytes`);
}
```

### Find Specific Emails

```typescript
const userEmails = emailProvider.getEmailsByRecipient('user@example.com');
const otpEmails = emailProvider.getEmailsByType('otp');
const emailWithToken = emailProvider.findEmailWithToken('token-123');
```

## Conclusion

Mock providers make testing easy and fast. Use them in your test suite to:

- ✅ Test without external dependencies
- ✅ Run tests in parallel
- ✅ Verify side effects
- ✅ Test error handling
- ✅ Keep tests isolated and fast
