import { describe, it, expect } from 'vitest';
import { inflateRawSync } from 'node:zlib';
import { createZip, crc32 } from '../src/data/zip.js';

describe('crc32', () => {
  it('matches the reference check value', () => {
    // Standard CRC-32 check: crc32("123456789") = 0xCBF43926
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });
});

describe('createZip', () => {
  const read = (buf, at) => new DataView(buf.buffer, buf.byteOffset).getUint32(at, true);
  const read16 = (buf, at) => new DataView(buf.buffer, buf.byteOffset).getUint16(at, true);

  it('produces a well-formed archive whose entries round-trip', async () => {
    const text = 'insert into posts values (1);\n'.repeat(50);
    const zip = await createZip([
      { name: '1-roles.sql', text: 'create role "x";\n' },
      { name: '2-schema.sql', text },
    ]);

    // Local header of the first entry.
    expect(read(zip, 0)).toBe(0x04034b50);

    // End of central directory: signature + entry count.
    const eocd = zip.length - 22;
    expect(read(zip, eocd)).toBe(0x06054b50);
    expect(read16(zip, eocd + 10)).toBe(2);

    // Walk to the second entry and round-trip its content.
    const name1Len = read16(zip, 26);
    const comp1Len = read(zip, 18);
    const entry2 = 30 + name1Len + comp1Len;
    expect(read(zip, entry2)).toBe(0x04034b50);
    const method = read16(zip, entry2 + 8);
    const compLen = read(zip, entry2 + 18);
    const nameLen = read16(zip, entry2 + 26);
    const name = new TextDecoder().decode(zip.slice(entry2 + 30, entry2 + 30 + nameLen));
    expect(name).toBe('2-schema.sql');

    const dataStart = entry2 + 30 + nameLen;
    const raw = zip.slice(dataStart, dataStart + compLen);
    const restored = method === 8 ? inflateRawSync(raw) : Buffer.from(raw);
    expect(restored.toString('utf8')).toBe(text);

    // Stored CRC matches the original content.
    expect(read(zip, entry2 + 14)).toBe(crc32(new TextEncoder().encode(text)));
  });

  it('compresses repetitive sql when CompressionStream is available', async () => {
    const text = 'insert into posts values (1);\n'.repeat(1000);
    const zip = await createZip([{ name: 'data.sql', text }]);
    if (typeof CompressionStream !== 'undefined') {
      expect(zip.length).toBeLessThan(text.length / 2);
    }
  });
});
