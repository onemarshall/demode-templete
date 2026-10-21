// types/bun.d.ts
declare module 'bun:test' {
	export interface TestOptions {
		timeout?: number;
		retry?: number;
		skip?: boolean;
		only?: boolean;
	}

	export function test(name: string, fn: () => void | Promise<void>): void;
	export function test(name: string, options: TestOptions, fn: () => void | Promise<void>): void;
	export function describe(name: string, fn: () => void): void;
	export function beforeEach(fn: () => void | Promise<void>): void;
	export function afterEach(fn: () => void | Promise<void>): void;
	export function beforeAll(fn: () => void | Promise<void>): void;
	export function afterAll(fn: () => void | Promise<void>): void;
	export function mock<T extends (...args: any[]) => any>(fn?: T): jest.MockedFunction<T>;
	export function mock(): jest.MockedFunction<(...args: any[]) => any>;
	export const expect: typeof import('@jest/globals').expect;

	namespace mock {
		function module<T = any>(moduleName: string, factory?: () => T): T;
	}
}
