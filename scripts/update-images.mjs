import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const repoUrl = 'https://raw.githubusercontent.com/lukas1h/lukashahnart-media/main';
const imagesDir = './images';
const outputFile = './images.json';

const imageExtensions = ['.jpg', '.jpeg', '.png'];

async function convertToWebpAndDeleteOriginals(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            await convertToWebpAndDeleteOriginals(fullPath);
        } else {
            const ext = path.extname(entry.name).toLowerCase();
            if (imageExtensions.includes(ext)) {
                const base = path.basename(entry.name, ext);
                const webpPath = path.join(dir, base + '.webp');

                const buffer = await fs.readFile(fullPath);
                await sharp(buffer).webp({ quality: 80 }).toFile(webpPath);
                await fs.unlink(fullPath);
            }
        }
    }
}

async function generateJson(dir, basePath = 'images') {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    let urls = [];

    for (const entry of entries) {
        const entryPath = path.join(dir, entry.name);
        const relativePath = path.join(basePath, entry.name);

        if (entry.isDirectory()) {
            const nested = await generateJson(entryPath, relativePath);
            urls = urls.concat(nested);
        } else if (entry.name.endsWith('.webp')) {
            urls.push(`${repoUrl}/${relativePath.replace(/\\/g, '/')}`);
        }
    }

    return urls;
}

await convertToWebpAndDeleteOriginals(imagesDir);
const urls = await generateJson(imagesDir);
await fs.writeFile(outputFile, JSON.stringify(urls, null, 2));

console.log('✅ Converted images and updated images.json');