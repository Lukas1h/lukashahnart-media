

// Replace this with your actual repo raw URL
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { encode } from 'blurhash';

const __dirname = path.resolve();
const imagesDir = path.join(__dirname, 'images');
const jsonPath = path.join(__dirname, 'images.json');

// Replace this with your actual repo raw URL
const repoUrl = 'https://raw.githubusercontent.com/lukas1h/lukashahnart-media/main';

/**
 * Convert supported images to .webp and delete originals
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
 * Generate images.json grouped by category (folder)
 */
async function generateJson(rootDir) {
    const categories = await fs.readdir(rootDir, { withFileTypes: true });
    const results = [];

    for (const category of categories) {
        if (!category.isDirectory()) continue;

        const categoryName = category.name;
        const categoryPath = path.join(rootDir, categoryName);
        const images = [];

        const files = await fs.readdir(categoryPath);
        for (const file of files) {
            if (!file.endsWith('.webp')) continue;

            const fullPath = path.join(categoryPath, file);
            const buffer = await fs.readFile(fullPath);
            const image = sharp(buffer);
            const { data, info } = await image.raw().ensureAlpha().resize(32, 32).toBuffer({ resolveWithObject: true });
            const blurhash = encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4);

            images.push({
                url: `${repoUrl}/images/${categoryName}/${file}`,
                blurhash
            });
        }

        results.push({ category: categoryName, images });
    }

    return results;
}

/**
 * Run full update: convert and generate JSON
 */
async function main() {
    await convertImagesToWebp(imagesDir);
    const json = await generateJson(imagesDir);
    await fs.writeFile(jsonPath, JSON.stringify(json, null, 2));
    console.log(`✅ Done! Updated ${jsonPath}`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});