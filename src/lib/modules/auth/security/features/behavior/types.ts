/**
 * Behavior Feature Types
 */

export interface BehaviorAnalysis {
	isHuman: boolean;
	humanScore: number;
	mouseMovements?: number;
	keystrokes?: number;
	clickPattern?: string;
	scrollBehavior?: string;
	timingPattern?: number[];
	interactionRate?: number;
	sessionDuration?: number;
	pageViews?: number;
}

export interface BehaviorFeatureConfig {
	enabled?: boolean;
	enableBotDetection?: boolean;
	enablePatternAnalysis?: boolean;
	humanScoreThreshold?: number;
	suspiciousHeaderPenalty?: number;
}

export interface SuspiciousHeaderCheck {
	suspicious: boolean;
	reasons: string[];
	score: number;
}
