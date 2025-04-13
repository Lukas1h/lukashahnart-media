import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { encode } from 'blurhash';

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
    let results = [];

    for (const entry of entries) {
        const entryPath = path.join(dir, entry.name);
        const relativePath = path.join(basePath, entry.name);

        if (entry.isDirectory()) {
            const nested = await generateJson(entryPath, relativePath);
            results = results.concat(nested);
        } else if (entry.name.endsWith('.webp')) {
            const buffer = await fs.readFile(entryPath);
            const image = sharp(buffer);
            const { data, info } = await image.raw().ensureAlpha().resize(32, 32).toBuffer({ resolveWithObject: true });

            const blurhash = encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4);

            results.push({
                url: `${repoUrl}/${relativePath.replace(/\\/g, '/')}`,
                blurhash
            });
        }
    }

    return results;
}

await convertToWebpAndDeleteOriginals(imagesDir);
const urls = await generateJson(imagesDir);
await fs.writeFile(outputFile, JSON.stringify(urls, null, 2));

console.log('✅ Converted images and updated images.json');