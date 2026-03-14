const sharp = require('sharp');

async function createIcons() {
    try {
        console.log('Generating 192x192 icon...');
        await sharp('public/logo.png')
            .resize(192, 192, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .png()
            .toFile('public/icon-192.png');

        console.log('Generating 512x512 icon...');
        await sharp('public/logo.png')
            .resize(512, 512, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .png()
            .toFile('public/icon-512.png');

        console.log('Done generating icons!');
    } catch (err) {
        console.error('Error generating icons:', err);
    }
}

createIcons();
