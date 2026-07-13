/**
 * Minimal ZIP writer — no dependencies, per the project's rules.
 * Entries are deflate-compressed via the native CompressionStream when
 * available (all modern browsers), stored uncompressed otherwise.
 * Writes the classic structure: local headers + central directory + EOCD.
 */

const encoder = new TextEncoder();

/**
 * @param {Array<{name: string, text: string}>} files
 * @returns {Promise<Uint8Array>} the ZIP archive bytes
 */
export async function createZip(files) {
  const { dosTime, dosDate } = dosDateTime(new Date());
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.text);
    const crc = crc32(data);
    const { method, bytes } = await compress(data);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); // local file header signature
    local.setUint16(4, 20, true); // version needed
    local.setUint16(6, 0x0800, true); // UTF-8 names
    local.setUint16(8, method, true);
    local.setUint16(10, dosTime, true);
    local.setUint16(12, dosDate, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, bytes.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    local.setUint16(28, 0, true); // extra field length

    central.push({ name, crc, method, compSize: bytes.length, size: data.length, offset });
    chunks.push(new Uint8Array(local.buffer), name, bytes);
    offset += 30 + name.length + bytes.length;
  }

  const centralStart = offset;
  for (const e of central) {
    const dir = new DataView(new ArrayBuffer(46));
    dir.setUint32(0, 0x02014b50, true); // central directory signature
    dir.setUint16(4, 20, true); // version made by
    dir.setUint16(6, 20, true); // version needed
    dir.setUint16(8, 0x0800, true);
    dir.setUint16(10, e.method, true);
    dir.setUint16(12, dosTime, true);
    dir.setUint16(14, dosDate, true);
    dir.setUint32(16, e.crc, true);
    dir.setUint32(20, e.compSize, true);
    dir.setUint32(24, e.size, true);
    dir.setUint16(28, e.name.length, true);
    // extra/comment/disk/attrs left zero (bytes 30–37)
    dir.setUint32(42, e.offset, true);
    chunks.push(new Uint8Array(dir.buffer), e.name);
    offset += 46 + e.name.length;
  }

  const eocd = new DataView(new ArrayBuffer(22));
  eocd.setUint32(0, 0x06054b50, true); // end of central directory signature
  eocd.setUint16(8, central.length, true);
  eocd.setUint16(10, central.length, true);
  eocd.setUint32(12, offset - centralStart, true);
  eocd.setUint32(16, centralStart, true);
  chunks.push(new Uint8Array(eocd.buffer));

  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}

async function compress(data) {
  if (typeof CompressionStream === 'undefined') return { method: 0, bytes: data };
  try {
    const stream = new Blob([data]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    // Store when deflate doesn't help (tiny files).
    return bytes.length < data.length ? { method: 8, bytes } : { method: 0, bytes: data };
  } catch {
    return { method: 0, bytes: data };
  }
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(d) {
  return {
    dosTime: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    dosDate: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}
