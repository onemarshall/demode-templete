import { describe, it, expect, beforeEach } from 'vitest';
import {
	getClientIp,
	isPrivateIp,
	isValidIp,
	isValidIPv4,
	isValidIPv6,
	fastHash,
	hashString,
	generateToken,
	generateShortId,
	parseWindowToSeconds,
	formatDuration,
	toRad,
	clamp,
	shouldProcessPath,
	getBrowserFamily,
	getOsFamily,
	getIdentifier,
	setTrustProxy
} from '../../core/helpers';

describe('IP Extraction', () => {
	beforeEach(() => {
		// Trust all proxy headers so tests can verify extraction from any header
		setTrustProxy('proxy');
	});

	it('extracts IP from CF-Connecting-IP header', () => {
		const request = new Request('http://localhost', {
			headers: { 'cf-connecting-ip': '1.2.3.4' }
		});
		expect(getClientIp(request)).toBe('1.2.3.4');
	});

	it('extracts first IP from X-Forwarded-For header', () => {
		const request = new Request('http://localhost', {
			headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8, 9.10.11.12' }
		});
		expect(getClientIp(request)).toBe('1.2.3.4');
	});

	it('extracts IP from X-Real-IP header', () => {
		const request = new Request('http://localhost', {
			headers: { 'x-real-ip': '1.2.3.4' }
		});
		expect(getClientIp(request)).toBe('1.2.3.4');
	});

	it('returns fallback when no IP headers present', () => {
		const request = new Request('http://localhost');
		expect(getClientIp(request)).toBe('0.0.0.0');
	});

	it('uses custom fallback', () => {
		const request = new Request('http://localhost');
		expect(getClientIp(request, { fallback: '127.0.0.1' })).toBe('127.0.0.1');
	});

	it('normalizes IP with port', () => {
		const request = new Request('http://localhost', {
			headers: { 'x-real-ip': '1.2.3.4:8080' }
		});
		expect(getClientIp(request)).toBe('1.2.3.4');
	});
});

describe('IP Validation', () => {
	describe('isPrivateIp', () => {
		it('detects localhost', () => {
			expect(isPrivateIp('127.0.0.1')).toBe(true);
			expect(isPrivateIp('::1')).toBe(true);
			expect(isPrivateIp('0.0.0.0')).toBe(true);
		});

		it('detects private ranges', () => {
			expect(isPrivateIp('10.0.0.1')).toBe(true);
			expect(isPrivateIp('192.168.1.1')).toBe(true);
			expect(isPrivateIp('172.16.0.1')).toBe(true);
			expect(isPrivateIp('172.31.255.255')).toBe(true);
		});

		it('detects public IPs', () => {
			expect(isPrivateIp('8.8.8.8')).toBe(false);
			expect(isPrivateIp('1.2.3.4')).toBe(false);
		});
	});

	describe('isValidIPv4', () => {
		it('validates correct IPv4', () => {
			expect(isValidIPv4('1.2.3.4')).toBe(true);
			expect(isValidIPv4('255.255.255.255')).toBe(true);
			expect(isValidIPv4('0.0.0.0')).toBe(true);
		});

		it('rejects invalid IPv4', () => {
			expect(isValidIPv4('256.1.1.1')).toBe(false);
			expect(isValidIPv4('1.2.3')).toBe(false);
			expect(isValidIPv4('1.2.3.4.5')).toBe(false);
			expect(isValidIPv4('abc.def.ghi.jkl')).toBe(false);
		});
	});

	describe('isValidIPv6', () => {
		it('validates localhost', () => {
			expect(isValidIPv6('::1')).toBe(true);
		});

		it('validates full IPv6', () => {
			expect(isValidIPv6('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
		});
	});

	describe('isValidIp', () => {
		it('validates both v4 and v6', () => {
			expect(isValidIp('1.2.3.4')).toBe(true);
			expect(isValidIp('::1')).toBe(true);
		});
	});
});

describe('Hashing', () => {
	it('fastHash returns consistent results', () => {
		expect(fastHash('test')).toBe(fastHash('test'));
		expect(fastHash('test')).not.toBe(fastHash('test2'));
	});

	it('hashString returns hex string', () => {
		const hash = hashString('test');
		expect(typeof hash).toBe('string');
		expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
	});
});

describe('Token Generation', () => {
	it('generateToken creates hex string of correct length', () => {
		const token = generateToken(16);
		expect(token.length).toBe(32); // 16 bytes = 32 hex chars
		expect(/^[0-9a-f]+$/.test(token)).toBe(true);
	});

	it('generateShortId creates 8 char string', () => {
		const id = generateShortId();
		expect(id.length).toBe(8);
	});

	it('generates unique tokens', () => {
		const tokens = new Set(Array.from({ length: 100 }, () => generateToken()));
		expect(tokens.size).toBe(100);
	});
});

describe('Time Utilities', () => {
	describe('parseWindowToSeconds', () => {
		it('returns number as-is', () => {
			expect(parseWindowToSeconds(60)).toBe(60);
		});

		it('parses seconds', () => {
			expect(parseWindowToSeconds('30s')).toBe(30);
		});

		it('parses minutes', () => {
			expect(parseWindowToSeconds('5m')).toBe(300);
		});

		it('parses hours', () => {
			expect(parseWindowToSeconds('2h')).toBe(7200);
		});

		it('parses days', () => {
			expect(parseWindowToSeconds('1d')).toBe(86400);
		});

		it('returns default for invalid format', () => {
			expect(parseWindowToSeconds('invalid')).toBe(60);
		});
	});

	describe('formatDuration', () => {
		it('formats seconds', () => {
			expect(formatDuration(30)).toBe('30s');
		});

		it('formats minutes', () => {
			expect(formatDuration(120)).toBe('2m');
		});

		it('formats hours', () => {
			expect(formatDuration(7200)).toBe('2h');
		});

		it('formats days', () => {
			expect(formatDuration(172800)).toBe('2d');
		});
	});
});

describe('Math Utilities', () => {
	it('toRad converts degrees to radians', () => {
		expect(toRad(180)).toBeCloseTo(Math.PI);
		expect(toRad(90)).toBeCloseTo(Math.PI / 2);
	});

	it('clamp restricts value to range', () => {
		expect(clamp(50, 0, 100)).toBe(50);
		expect(clamp(-10, 0, 100)).toBe(0);
		expect(clamp(150, 0, 100)).toBe(100);
	});
});

describe('Path Matching', () => {
	const config = {
		includePaths: ['/api/auth/', '/auth/'],
		excludePaths: ['/api/auth/health', '/auth/callback']
	};

	it('includes matching paths', () => {
		expect(shouldProcessPath('/api/auth/sign-in', config)).toBe(true);
		expect(shouldProcessPath('/auth/login', config)).toBe(true);
	});

	it('excludes matching paths', () => {
		expect(shouldProcessPath('/api/auth/health', config)).toBe(false);
		expect(shouldProcessPath('/auth/callback', config)).toBe(false);
	});

	it('excludes non-matching paths', () => {
		expect(shouldProcessPath('/api/users', config)).toBe(false);
	});

	it('includes all when includePaths is empty', () => {
		expect(shouldProcessPath('/anything', { includePaths: [], excludePaths: [] })).toBe(true);
	});
});

describe('Browser/OS Detection', () => {
	it('detects Chrome', () => {
		expect(getBrowserFamily('Mozilla/5.0 Chrome/120.0.0.0')).toBe('Chrome');
	});

	it('detects Firefox', () => {
		expect(getBrowserFamily('Mozilla/5.0 Firefox/120.0')).toBe('Firefox');
	});

	it('detects Windows', () => {
		expect(getOsFamily('Mozilla/5.0 (Windows NT 10.0)')).toBe('Windows');
	});

	it('detects macOS', () => {
		expect(getOsFamily('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe('macOS');
	});
});

describe('Identifier Generation', () => {
	beforeEach(() => {
		setTrustProxy('proxy');
	});

	it('uses user ID when authenticated', () => {
		const request = new Request('http://localhost');
		expect(getIdentifier(request, 'user123')).toBe('user:user123');
	});

	it('uses IP + UA hash when anonymous', () => {
		const request = new Request('http://localhost', {
			headers: {
				'x-forwarded-for': '1.2.3.4',
				'user-agent': 'Mozilla/5.0'
			}
		});
		const id = getIdentifier(request);
		expect(id.startsWith('anon:1.2.3.4:')).toBe(true);
	});
});
