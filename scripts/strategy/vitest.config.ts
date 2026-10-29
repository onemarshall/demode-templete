/** Focused server tests with source aliases; no web server, credentials or providers. */
import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
export default defineConfig({
 resolve:{alias:[{find:/^#lib\/(.*)\.js$/,replacement:resolve('src/lib')+'/$1.ts'}]},
 test:{environment:'node',include:['tests/strategy/*-host.test.ts','tests/strategy/*-authority.test.ts','tests/strategy/m02-upstream.test.ts','tests/strategy/method-resources.test.ts']},
});
