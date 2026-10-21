// Minimal pg mock to avoid CJS require in SSR tests
export class Client {
	constructor() {}
	connect = async () => {};
	end = async () => {};
	query = async () => ({ rows: [], rowCount: 0 });
}

export class Pool {
	constructor() {}
	connect = async () => {
		return {
			query: async () => ({ rows: [], rowCount: 0 }),
			release: () => {}
		};
	};
	end = async () => {};
}

export const defaults = {};
export default { Client, Pool, defaults };
