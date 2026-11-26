import {test,expect} from '@playwright/test';
import {apiDisplayMessage} from '../src/lib/api';
import fixtures from './fixtures/profile-update-errors.json';
const te='చర్యను పూర్తి చేయలేకపోయాం. మళ్లీ ప్రయత్నించండి.';
const en='Could not complete the action. Please try again.';
for(const [key,payload] of Object.entries(fixtures))test(`real backend locale fields ${key}`,()=>{
 expect(apiDisplayMessage(payload,true,te)).toBe(payload.detail_te);
 expect(apiDisplayMessage(payload,false,en)).toBe(payload.detail_en);
 expect(apiDisplayMessage({detail:payload.detail},true,te)).toBe(te);
});
for(const payload of [
 {detail:'Profile changes could not be saved safely. Please try again.'},
 {detail:'Request failed (HTTP 502).'}, {detail:'The server returned an unreadable response.'},
 {message:'Internal server error'}, {error:'not_found'}, 'Service unavailable',
 {detail:{en:'English nested reason'}}, {message_te:'English mislabeled'},
 {detail_te:42,detail:{te:[],en:'English reason'}}, {detail_te:'',detail:fixtures.groom400.detail},
])test(`Telugu never falls through to English ${JSON.stringify(payload)}`,()=>expect(apiDisplayMessage(payload,true,te)).toBe(te));
test('nested languages and candidates are independently validated',()=>{
 expect(apiDisplayMessage({detail:{te:'ఫోటోను మళ్లీ పంపండి.',en:'Send the photo again.'}},true,te)).toBe('ఫోటోను మళ్లీ పంపండి.');
 expect(apiDisplayMessage({detail_te:'wrong language',message:'వివరాలను సరిచూడండి.'},true,te)).toBe('వివరాలను సరిచూడండి.');
 expect(apiDisplayMessage({detail_te:'QR కోడ్‌ను మళ్లీ తెరవండి.'},true,te)).toBe('QR కోడ్‌ను మళ్లీ తెరవండి.');
 expect(apiDisplayMessage({detail_en:'తెలుగు',detail:'English reason'},false,en)).toBe('English reason');
 expect(apiDisplayMessage({detail:{en:'English reason',te:'తెలుగు'}},false,en)).toBe('English reason');
 expect(apiDisplayMessage({detail:'English reason'},false,en)).toBe('English reason');
 expect(apiDisplayMessage({},true,'')).toBe('');
});
