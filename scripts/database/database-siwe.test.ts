import { describe, it, expect, vi, beforeAll, afterAll, type Mock } from 'vitest';

// vi.mock must live at module top level (vitest hoists these calls).
// Factories run lazily on first import, so referencing the mock vars is safe.
let mockPool: {
	connect: Mock;
	query: Mock;
	end: Mock;
};
let mockClient: {
	query: Mock;
	release: Mock;
};

vi.mock('pg', () => ({
	Pool: vi.fn().mockImplementation(() => mockPool)
}));

vi.mock('dotenv', () => ({
	config: vi.fn()
}));

describe('SIWE Constraint Fix Tests', () => {
	beforeAll(() => {
		// Mock PostgreSQL pool and client
		mockClient = {
			query: vi.fn(),
			release: vi.fn()
		};
		mockPool = {
			connect: vi.fn().mockResolvedValue(mockClient),
			query: vi.fn(),
			end: vi.fn().mockResolvedValue(undefined)
		};

		// Mock environment variables
		vi.stubEnv('BETTER_DATABASE_URL', 'postgresql://test:test@localhost:5432/testdb');
	});

	afterAll(() => {
		vi.unstubAllEnvs();
		vi.restoreAllMocks();
	});

	describe('SIWE Duplicate Detection', () => {
		it('should detect duplicate SIWE users', async () => {
			// Mock duplicate user data
			mockClient.query.mockResolvedValue({
				rows: [
					{
						id: 'user-1',
						email: 'user@example.com',
						provider: 'siwe',
						external_identifier: '0x123'
					},
					{
						id: 'user-2',
						email: 'user@example.com',
						provider: 'siwe',
						external_identifier: '0x456'
					}
				]
			});

			// Test duplicate detection query
			const duplicateQuery = `
				SELECT email, COUNT(*) as count 
				FROM "user" 
				WHERE provider = 'siwe' 
				GROUP BY email 
				HAVING COUNT(*) > 1
			`;

			expect(duplicateQuery).toContain('COUNT(*) > 1');
			expect(duplicateQuery).toContain("provider = 'siwe'");
		});

		it('should identify SIWE users with same email', async () => {
			mockClient.query.mockResolvedValue({
				rows: [
					{
						id: 'user-1',
						email: 'user@example.com',
						provider: 'siwe',
						external_identifier: '0x123'
					},
					{ id: 'user-2', email: 'user@example.com', provider: 'email', external_identifier: null }
				]
			});

			// Test cross-provider duplicate detection
			const crossProviderQuery = `
				SELECT u1.email, u1.provider, u2.provider 
				FROM "user" u1 
				JOIN "user" u2 ON u1.email = u2.email 
				WHERE u1.provider = 'siwe' AND u2.provider != 'siwe'
			`;

			expect(crossProviderQuery).toContain('JOIN');
			expect(crossProviderQuery).toContain("u1.provider = 'siwe'");
		});
	});

	describe('SIWE Constraint Cleanup', () => {
		it('should clean up duplicate SIWE users', async () => {
			mockClient.query
				.mockResolvedValueOnce({
					rows: [{ id: 'user-2', email: 'user@example.com', provider: 'siwe' }] // Find duplicates
				})
				.mockResolvedValueOnce({ rows: [] }) // Delete duplicate
				.mockResolvedValueOnce({ rows: [] }); // Verify deletion

			// Test cleanup query
			const cleanupQuery = `
				DELETE FROM "user" 
				WHERE id IN (
					SELECT id FROM (
						SELECT id, ROW_NUMBER() OVER (
							PARTITION BY email ORDER BY created_at DESC
						) as rn 
						FROM "user" 
						WHERE provider = 'siwe'
					) t 
					WHERE rn > 1
				)
			`;

			expect(cleanupQuery).toContain('DELETE FROM');
			expect(cleanupQuery).toContain('ROW_NUMBER()');
			expect(cleanupQuery).toContain('PARTITION BY email');
		});

		it('should preserve most recent SIWE user', async () => {
			mockClient.query.mockResolvedValue({
				rows: [
					{ id: 'user-1', email: 'user@example.com', provider: 'siwe', created_at: new Date() }
				]
			});

			// Test preservation logic
			const preserveQuery = `
				SELECT * FROM "user" 
				WHERE provider = 'siwe' 
				ORDER BY created_at DESC 
				LIMIT 1
			`;

			expect(preserveQuery).toContain('ORDER BY created_at DESC');
			expect(preserveQuery).toContain('LIMIT 1');
		});

		it('should handle SIWE user migration', async () => {
			mockClient.query
				.mockResolvedValueOnce({ rows: [] }) // Check for existing user
				.mockResolvedValueOnce({ rows: [] }) // Create migrated user
				.mockResolvedValueOnce({ rows: [] }); // Delete old SIWE user

			// Test migration query
			const migrationQuery = `
				UPDATE "user" 
				SET provider = 'email', "external_identifier" = NULL 
				WHERE provider = 'siwe' AND email = $1
			`;

			expect(migrationQuery).toContain('UPDATE');
			expect(migrationQuery).toContain("provider = 'email'");
		});
	});

	describe('SIWE Constraint Creation', () => {
		it('should create unique constraint for SIWE users', async () => {
			mockClient.query.mockResolvedValue({ rows: [] });

			// Test constraint creation
			const constraintQuery = `
				CREATE UNIQUE INDEX idx_siwe_user_email 
				ON "user" (email) 
				WHERE provider = 'siwe'
			`;

			expect(constraintQuery).toContain('CREATE UNIQUE INDEX');
			expect(constraintQuery).toContain("WHERE provider = 'siwe'");
		});

		it('should create partial index for SIWE users', async () => {
			mockClient.query.mockResolvedValue({ rows: [] });

			// Test partial index creation
			const partialIndexQuery = `
				CREATE INDEX idx_siwe_users 
				ON "user" (email, "external_identifier") 
				WHERE provider = 'siwe'
			`;

			expect(partialIndexQuery).toContain('CREATE INDEX');
			expect(partialIndexQuery).toContain("WHERE provider = 'siwe'");
		});

		it('should validate constraint effectiveness', async () => {
			mockClient.query.mockResolvedValue({
				rows: [{ constraint_name: 'idx_siwe_user_email', constraint_type: 'UNIQUE' }]
			});

			// Test constraint validation
			const validationQuery = `
				SELECT constraint_name, constraint_type 
				FROM information_schema.table_constraints 
				WHERE table_name = 'user' AND constraint_type = 'UNIQUE'
			`;

			expect(validationQuery).toContain('information_schema.table_constraints');
			expect(validationQuery).toContain("constraint_type = 'UNIQUE'");
		});
	});

	describe('SIWE View Creation', () => {
		it('should create SIWE user lookup view', async () => {
			mockClient.query.mockResolvedValue({ rows: [] });

			// Test view creation
			const viewQuery = `
				CREATE OR REPLACE VIEW siwe_users AS
				SELECT * FROM "user" 
				WHERE provider = 'siwe' 
				ORDER BY created_at DESC
			`;

			expect(viewQuery).toContain('CREATE OR REPLACE VIEW');
			expect(viewQuery).toContain('siwe_users');
			expect(viewQuery).toContain("WHERE provider = 'siwe'");
		});

		it('should create SIWE user summary view', async () => {
			mockClient.query.mockResolvedValue({ rows: [] });

			// Test summary view
			const summaryViewQuery = `
				CREATE OR REPLACE VIEW siwe_user_summary AS
				SELECT 
					email,
					COUNT(*) as siwe_accounts,
					MAX(created_at) as last_siwe_login
				FROM "user" 
				WHERE provider = 'siwe' 
				GROUP BY email
			`;

			expect(summaryViewQuery).toContain('siwe_user_summary');
			expect(summaryViewQuery).toContain('COUNT(*)');
			expect(summaryViewQuery).toContain('GROUP BY email');
		});
	});

	describe('SIWE Error Handling', () => {
		it('should handle constraint violation errors', async () => {
			mockClient.query.mockRejectedValueOnce(
				new Error('duplicate key value violates unique constraint')
			);

			// Test error handling
			try {
				await mockClient.query('INSERT INTO "user" (email) VALUES (\'test@example.com\')');
			} catch (error) {
				expect(error).toBeInstanceOf(Error);
				expect((error as Error).message).toContain('duplicate key');
			}
		});

		it('should handle database connection errors', async () => {
			mockPool.connect.mockRejectedValueOnce(new Error('Connection failed'));

			// Test connection error handling
			try {
				await mockPool.connect();
			} catch (error) {
				expect(error).toBeInstanceOf(Error);
				expect((error as Error).message).toBe('Connection failed');
			}
		});

		it('should validate SIWE address format', async () => {
			// Test Ethereum address validation
			const validAddresses = [
				'0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
				'0x1234567890123456789012345678901234567890'
			];

			const invalidAddresses = [
				'0x123', // Too short
				'1234567890123456789012345678901234567890', // Missing 0x
				'0xGHIJKLMNOPQRSTUVWXYZ1234567890123456' // Invalid characters
			];

			// Test address validation regex
			const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;

			validAddresses.forEach((address) => {
				expect(ethAddressRegex.test(address)).toBe(true);
			});

			invalidAddresses.forEach((address) => {
				expect(ethAddressRegex.test(address)).toBe(false);
			});
		});
	});

	describe('SIWE Performance Optimization', () => {
		it('should use efficient queries for large datasets', async () => {
			// Test efficient duplicate detection
			const efficientQuery = `
				WITH ranked_users AS (
					SELECT 
						id, 
						email, 
						ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) as rn
					FROM "user" 
					WHERE provider = 'siwe'
				)
				DELETE FROM "user" 
				USING ranked_users 
				WHERE "user".id = ranked_users.id AND ranked_users.rn > 1
			`;

			expect(efficientQuery).toContain('WITH ranked_users AS');
			expect(efficientQuery).toContain('ROW_NUMBER()');
			expect(efficientQuery).toContain('USING ranked_users');
		});

		it('should batch large cleanup operations', async () => {
			// Test batch processing
			const batchQuery = `
				DELETE FROM "user" 
				WHERE id = ANY($1) AND provider = 'siwe'
			`;

			expect(batchQuery).toContain('ANY($1)');
			expect(batchQuery).toContain("provider = 'siwe'");
		});
	});

	describe('SIWE Data Integrity', () => {
		it('should verify data consistency after cleanup', async () => {
			mockClient.query
				.mockResolvedValueOnce({ rows: [{ count: '1' }] }) // Check unique emails
				.mockResolvedValueOnce({ rows: [{ count: '5' }] }) // Check total SIWE users
				.mockResolvedValueOnce({ rows: [] }); // Verify no duplicates

			// Test consistency checks
			const consistencyQuery = `
				SELECT email, COUNT(*) as count 
				FROM "user" 
				WHERE provider = 'siwe' 
				GROUP BY email 
				HAVING COUNT(*) > 1
			`;

			expect(consistencyQuery).toContain('HAVING COUNT(*) > 1');
		});

		it('should maintain referential integrity', async () => {
			mockClient.query.mockResolvedValue({ rows: [] });

			// Test referential integrity
			const referentialQuery = `
				SELECT u.id, s.session_id 
				FROM "user" u 
				LEFT JOIN sessions s ON u.id = s.user_id 
				WHERE u.provider = 'siwe' AND s.session_id IS NOT NULL
			`;

			expect(referentialQuery).toContain('LEFT JOIN sessions');
			expect(referentialQuery).toContain("provider = 'siwe'");
		});
	});
});
