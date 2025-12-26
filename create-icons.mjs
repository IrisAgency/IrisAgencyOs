import sharp from 'sharp';

async function createIcon(size) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#4f46e5;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${size/4}" fill="url(#grad)"/>
      <text x="50%" y="50%" 
            font-family="Arial, sans-serif" 
            font-size="${size * 0.35}" 
            font-weight="bold"
            fill="white" 
            text-anchor="middle" 
            dominant-baseline="central">IO</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(`public/icon-${size}x${size}.png`);
  
  console.log(`Created icon-${size}x${size}.png`);
}

Promise.all([
  createIcon(192),
  createIcon(512)
]).then(() => console.log('All icons created successfully!'));
