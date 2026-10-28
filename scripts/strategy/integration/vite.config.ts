/** Test-only host: constrain Tailwind scanning to app UI, not the 2GB vendor cache. */
import {mergeConfig} from 'vite';import application from '../../../vite.config';
import {resolve} from 'node:path';
const css=resolve('src/app.css');
const config=mergeConfig({plugins:[{name:'strategy-test-style-sources',enforce:'pre',transform(source:string,id:string){
 if(id.split('?')[0]!==css)return;
 return source.replace(/@import ['"]tailwindcss['"];?/, '@import "tailwindcss" source(none);\n@source "./";\n@source not "./lib/modules/strategy/server";');
}}]},application);
config.server={...config.server,fs:{...config.server?.fs,allow:[...(config.server?.fs?.allow??[]),resolve('../bun-cache')]}};
export default config;
