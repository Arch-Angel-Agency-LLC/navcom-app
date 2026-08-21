import { parseDirectory, parseDirectoryOrThrow } from '../src/index.js';
const head = 'id,name,type,address,phone,hours,notes,last_verified,verified_by';
const probes: [string, string][] = [
  ['BOM at the start',      '﻿' + head + '\nx,Shelter,shelter,,,,,2026-08-01,Wren'],
  ['CRLF line endings',     head.replace(/,/g,',') + '\r\nx,Shelter,shelter,,,,,2026-08-01,Wren\r\n'],
  ['quoted comma in name',  head + '\n"x","A, B",shelter,,,,,2026-08-01,Wren'],
  ['embedded newline',      head + '\n"x","A\nB",shelter,,,,,2026-08-01,Wren'],
  ['trailing blank lines',  head + '\nx,Shelter,shelter,,,,,2026-08-01,Wren\n\n\n'],
  ['no rows at all',        head],
  ['ragged short row',      head + '\nx,Shelter,shelter'],
  ['ragged long row',       head + '\nx,Shelter,shelter,,,,,2026-08-01,Wren,EXTRA,MORE'],
  ['duplicate header col',  head + ',name\nx,Shelter,shelter,,,,,2026-08-01,Wren,Other'],
];
for (const [label, csv] of probes) {
  try {
    const out = parseDirectoryOrThrow(csv);
    console.log(String(label).padEnd(22), '->', out.length, 'rec', out[0] ? JSON.stringify(out[0].name) : '');
  } catch (e) {
    console.log(String(label).padEnd(22), '-> THROWS:', (e as Error).message.slice(0, 90));
  }
}
