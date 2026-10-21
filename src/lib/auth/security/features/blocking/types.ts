/**
 * Blocking Feature Types
 */

export interface BlockStatus {
	blocked: boolean;
	reason?: string;
	expiresAt?: number;
	expiresIn?: number;
}

export interface BlockingFeatureConfig {
	enabled?: boolean;
	maxFailedAttempts?: number;
	baseDuration?: number;
	maxDuration?: number;
	escalatingBlocks?: boolean;
	keyPrefix?: string;
}

export interface RecordFailureResponse {
	recorded: boolean;
	blockStatus: BlockStatus;
	failedAttempts: number;
}
