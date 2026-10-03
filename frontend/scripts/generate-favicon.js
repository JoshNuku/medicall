const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none">
  <!-- Clean white squircle container with crisp subtle border for dark and light tabs -->
  <rect width="128" height="128" rx="28" fill="#FFFFFF"/>
  <rect x="0.75" y="0.75" width="126.5" height="126.5" rx="27.25" stroke="#E2E8F0" stroke-width="1.5"/>
  
  <!-- Top Capsule (Royal Blue) -->
  <path d="M 52,52 L 52,22 A 12,12 0 0,1 76,22 L 76,52 Z" fill="#0062D2"/>
  
  <!-- Bottom Capsule (Royal Blue) -->
  <path d="M 52,76 L 76,76 L 76,106 A 12,12 0 0,1 52,106 Z" fill="#0062D2"/>
  
  <!-- Left Capsule (Emerald Green) -->
  <path d="M 52,52 L 22,52 A 12,12 0 0,0 22,76 L 52,76 Z" fill="#00A859"/>
  
  <!-- Right Capsule (Emerald Green) -->
  <path d="M 76,52 L 76,76 L 106,76 A 12,12 0 0,0 106,52 Z" fill="#00A859"/>
  
  <!-- Central Junction Square -->
  <rect x="52" y="52" width="24" height="24" fill="#FFFFFF"/>
</svg>`;

async function run() {
  const root = path.join(__dirname, '..');
  const svgBuffer = Buffer.from(svg);

  // Write vector SVG formats
  fs.writeFileSync(path.join(root, 'public/favicon.svg'), svg);
  fs.writeFileSync(path.join(root, 'public/icon.svg'), svg);
  fs.writeFileSync(path.join(root, 'src/app/icon.svg'), svg);

  // Render raster resolutions
  const png16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer();
  const png32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  const png48 = await sharp(svgBuffer).resize(48, 48).png().toBuffer();
  const png180 = await sharp(svgBuffer).resize(180, 180).png().toBuffer();
  const png512 = await sharp(svgBuffer).resize(512, 512).png().toBuffer();

  fs.writeFileSync(path.join(root, 'public/apple-icon.png'), png180);
  fs.writeFileSync(path.join(root, 'src/app/apple-icon.png'), png180);
  fs.writeFileSync(path.join(root, 'public/icon-512.png'), png512);

  // Build standard multi-size .ico (16, 32, 48)
  const images = [
    { size: 16, buffer: png16 },
    { size: 32, buffer: png32 },
    { size: 48, buffer: png48 }
  ];

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(images.length, 4); // image count

  let offset = 6 + (16 * images.length);
  const entryBuffers = [];
  const dataBuffers = [];

  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.size, 0);
    entry.writeUInt8(img.size, 1);
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(img.buffer.length, 8); // size
    entry.writeUInt32LE(offset, 12); // offset
    entryBuffers.push(entry);
    dataBuffers.push(img.buffer);
    offset += img.buffer.length;
  }

  const icoBuffer = Buffer.concat([header, ...entryBuffers, ...dataBuffers]);
  fs.writeFileSync(path.join(root, 'public/favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(root, 'src/app/favicon.ico'), icoBuffer);

  console.log('✅ Generated crisp vector SVG, Apple Touch Icon, and multi-size favicon.ico!');
}

run().catch(console.error);
