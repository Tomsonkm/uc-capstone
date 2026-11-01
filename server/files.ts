const limit=20*1024*1024;
export function validateUpload(name:string,mime:string,bytes:Uint8Array):string{
 if(!name||/[\\/\x00-\x1f]/.test(name)||name.length>200)return 'Choose a safe filename without directory paths.';
 if(bytes.length<1||bytes.length>limit)return 'Files must be between 1 byte and 20 MiB.';
 const ext=name.split('.').at(-1)?.toLowerCase(),header=new TextDecoder().decode(bytes.slice(0,80));
 const office=['docx','xlsx','pptx'];
 if(ext==='pdf')return mime==='application/pdf'&&header.startsWith('%PDF-')?'':'This file is not a valid PDF.';
 if(ext==='png')return mime==='image/png'&&[137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n)?'':'This file is not a valid PNG.';
 if(ext==='jpg'||ext==='jpeg')return mime==='image/jpeg'&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'':'This file is not a valid JPEG.';
 if(office.includes(ext||'')){const expected:Record<string,string>={docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation'};return mime===expected[ext!]&&bytes[0]===80&&bytes[1]===75?'':'This file is not a valid Office document.';}
 if(ext==='txt'||ext==='csv'){if(!['text/plain','text/csv','application/csv','application/vnd.ms-excel'].includes(mime)||bytes.includes(0)||/^\s*<(?:!doctype|html|script|svg)/i.test(header))return 'The file content does not match a plain text or CSV document.';return '';}
 return 'Use PDF, DOCX, XLSX, PPTX, TXT, CSV, PNG or JPEG files.';
}
