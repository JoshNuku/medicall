async function syncIcons() {
  const fs = await import('node:fs');
  const path = await import('node:path');

  const root = path.join(__dirname, '..');
  const source = path.join(root, 'public', 'Minimal Blue and Coral Leaf Emblem.png');

  const exactCopies = [
    'public/apple-icon.png',
    'public/icon-512.png',
    'public/kaime-icon.png',
    'src/app/apple-icon.png',
    'src/app/icon.png',
  ];

  for (const relativePath of exactCopies) {
    fs.copyFileSync(source, path.join(root, relativePath));
  }

  const obsoleteGeneratedIcons = [
    'public/favicon.ico',
    'public/favicon.svg',
    'public/icon.svg',
    'src/app/favicon.ico',
    'src/app/icon.svg',
  ];

  for (const relativePath of obsoleteGeneratedIcons) {
    const iconPath = path.join(root, relativePath);
    if (fs.existsSync(iconPath)) {
      fs.unlinkSync(iconPath);
    }
  }

  console.log('Synced Kaime app icons from the supplied emblem.');
}

syncIcons();
