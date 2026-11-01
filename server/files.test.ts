// @vitest-environment node
import {it,expect} from 'vitest';
import {validateUpload} from './files';
it('rejects executable, unsafe names, spoofed PDF and oversized upload content',()=>{
 expect(validateUpload('run.exe','application/octet-stream',new Uint8Array([77,90]))).not.toBe('');
 expect(validateUpload('../report.pdf','application/pdf',new TextEncoder().encode('%PDF-1.7'))).not.toBe('');
 expect(validateUpload('report.pdf','application/pdf',new TextEncoder().encode('<html>bad</html>'))).not.toBe('');
 expect(validateUpload('big.txt','text/plain',new Uint8Array(20*1024*1024+1))).not.toBe('');
 expect(validateUpload('report.pdf','application/pdf',new TextEncoder().encode('%PDF-1.7\nReport'))).toBe('');
});
