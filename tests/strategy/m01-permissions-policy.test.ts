import {test,expect} from 'bun:test';
import {createSecurityHeaders} from '../../csp.config.mjs';
test('microphone remains denied by default, including unrelated pages',()=>{
 expect(createSecurityHeaders()['Permissions-Policy']).toBe('camera=(), microphone=(), geolocation=()');
});
test('the explicitly allowed interview surface permits only same-origin microphone access',()=>{
 expect(createSecurityHeaders({allowMicrophone:true})['Permissions-Policy']).toBe('camera=(), microphone=(self), geolocation=()');
});
