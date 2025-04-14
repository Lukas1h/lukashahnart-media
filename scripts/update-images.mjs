import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { encode } from 'blurhash';

const __dirname = path.resolve();
const imagesDir = path.join(__dirname, 'images');
const categoriesPath = path.join(__dirname, 'categories.json');
const jsonPath = path.join(__dirname, 'images.json');

// Change this to your actual raw content base URL
const repoUrl = 'https://raw.githubusercontent.com/lukas1h/lukashahnart-media/main';

/**
 * Convert all .jpg/.jpeg/.png images in folders to .webp
 */
async function convertImagesToWebp(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const entryPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            await convertImagesToWebp(entryPath);
        } else if (/\.(jpe?g|png)$/i.test(entry.name)) {
            const baseName = entry.name.replace(/\.(jpe?g|png)$/i, '');
            const newFile = `${baseName}.webp`;
            const newPath = path.join(dir, newFile);

            await sharp(entryPath).toFile(newPath);
            await fs.unlink(entryPath);
            console.log(`Converted and removed: ${entry.name}`);
        }
    }
}

/**
 * Generate images.json using the manually defined categories.json
 */
async function generateJsonFromCategories() {
    const categoriesRaw = await fs.readFile(categoriesPath, 'utf8');
    const categories = JSON.parse(categoriesRaw);
    const output = [];

    for (const cat of categories) {
        const folder = path.join(imagesDir, cat.path);
        const entries = await fs.readdir(folder);
        const images = [];

        for (const file of entries) {
            if (!file.endsWith('.webp')) continue;

            const fullPath = path.join(folder, file);
            const buffer = await fs.readFile(fullPath);
            const image = sharp(buffer);
            const { data, info } = await image
                .raw()
                .ensureAlpha()
                .resize(32, 32)
                .toBuffer({ resolveWithObject: true });

            const blurhash = encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4);

            images.push({
                url: `${repoUrl}/images/${cat.path}${file}`,
                blurhash,
            });
        }

        output.push({
            category: cat.name,
            description: cat.description,
            images,
        });
    }

    return output;
}

/**
 * Run all tasks
 */
async function main() {
    await convertImagesToWebp(imagesDir);
    const data = await generateJsonFromCategories();
    await fs.writeFile(jsonPath, JSON.stringify(data, null, 2));
    console.log('✅ images.json updated successfully.');
}

main().catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
});