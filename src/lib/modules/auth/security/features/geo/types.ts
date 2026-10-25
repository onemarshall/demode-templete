/**
 * Geo Intelligence Feature Types
 */

export interface GeoLocation {
	country: string;
	countryCode: string;
	region?: string;
	regionCode?: string;
	city?: string;
	postalCode?: string;
	latitude?: number;
	longitude?: number;
	timezone?: string;
	isp?: string;
	organization?: string;
	asn?: number;
	asName?: string;
	confidence?: 'high' | 'medium' | 'low';
}

export interface IPReputation {
	ip: string;
	trustScore: number;
	riskScore: number;
	isVpn: boolean;
	isTor: boolean;
	isProxy: boolean;
	isMalicious: boolean;
	isDatacenter: boolean;
	isResidential: boolean;
	isMobile: boolean;
	isCrawler: boolean;
	hostingLikelihood?: number;
	threatTypes: string[];
	abuseConfidence?: number;
	reportCount?: number;
	source: string;
}

export interface GeoIntelligence {
	ip: string;
	location: GeoLocation | null;
	reputation: IPReputation;
	risk: GeoRiskAssessment;
	timestamp: number;
	cached: boolean;
	ttl?: number;
}

export interface GeoRiskAssessment {
	score: number;
	level: 'low' | 'medium' | 'high' | 'critical';
	factors: string[];
	blocked: boolean;
	blockReason?: string;
}

export interface GeoFeatureConfig {
	enabled?: boolean;
	bigDataCloudApiKey?: string;
	blockedCountries?: string[];
	allowedCountries?: string[];
	highRiskCountries?: string[];
	enableGeolocation?: boolean;
	enableReputation?: boolean;
	enableVelocityCheck?: boolean;
	cacheTtlSeconds?: number;
	hostingHighPenalty?: number;
	hostingMediumPenalty?: number;
}

export interface VelocityCheck {
	suspicious: boolean;
	distanceKm?: number;
	timeDiffSeconds?: number;
	speedKmh?: number;
	previousLocation?: GeoLocation;
}
