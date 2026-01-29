/**
 * CV Generator Library - Shared functions for CV generation
 * Used by both generate_cv.js CLI and server.js
 */

const fs = require('fs');
const path = require('path');
const nunjucks = require('nunjucks');

/**
 * Recursively localize all values in an object
 * Extracts language-specific values from {en: ..., nl: ...} objects
 */
function localizeData(data, lang) {
    if (Array.isArray(data)) {
        return data.map(item => localizeData(item, lang));
    }
    if (data !== null && typeof data === 'object') {
        // Check if this is a language object itself (has lang key with string/array value)
        if (data[lang] !== undefined && (typeof data[lang] === 'string' || Array.isArray(data[lang]))) {
            return data[lang];
        }
        // Otherwise recurse into the object
        const result = {};
        for (const [key, value] of Object.entries(data)) {
            result[key] = localizeData(value, lang);
        }
        return result;
    }
    return data;
}

/**
 * Convert image to base64 data URL
 */
function imageToBase64(imagePath) {
    if (!fs.existsSync(imagePath)) {
        console.warn(`  Warning: Image not found: ${imagePath}`);
        return null;
    }
    const imageBuffer = fs.readFileSync(imagePath);
    const ext = path.extname(imagePath).toLowerCase().slice(1);
    const mimeType = ext === 'jpg' ? 'jpeg' : ext;
    return `data:image/${mimeType};base64,${imageBuffer.toString('base64')}`;
}

/**
 * Render HTML from template and data
 */
function renderHTML(rawData, templatePath, lang, baseDir) {
    // Configure nunjucks
    const env = nunjucks.configure(path.dirname(templatePath), {
        autoescape: false,
        trimBlocks: true,
        lstripBlocks: true,
    });

    // Localize all data for this language
    const data = localizeData(rawData, lang);

    // Add translations object as 't' for template access
    data.t = rawData.translations[lang] || rawData.translations.en;
    data.lang = lang;

    // Add visibility settings (default all to true if not present)
    data.visibility = rawData.sectionVisibility || {
        profile: true,
        experience: true,
        education: true,
        teaching: true,
        publications: true,
        media_summary: true,
        languages: true,
        hobbies: true,
        references: true
    };

    // Convert photo to base64 if exists
    if (data.personal && data.personal.photo && !data.personal.photo.startsWith('data:')) {
        const photoPath = path.join(baseDir, data.personal.photo);
        const base64Photo = imageToBase64(photoPath);
        if (base64Photo) {
            data.personal.photo = base64Photo;
        }
    }

    // Render template with nunjucks
    const templateName = path.basename(templatePath);
    return env.render(templateName, data);
}

/**
 * Generate PDF from HTML content
 */
async function generatePDF(htmlContent, outputPath, baseDir) {
    let puppeteer;
    try {
        puppeteer = require('puppeteer');
    } catch (e) {
        throw new Error('puppeteer not installed. Run: npm install puppeteer');
    }

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set viewport for consistent rendering
    await page.setViewport({ width: 794, height: 1123 }); // A4 at 96 DPI

    // Set base URL for relative paths (like images)
    await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
        baseURL: `file://${baseDir}/`
    });

    // Wait for fonts to load
    await page.evaluateHandle('document.fonts.ready');

    // Small delay to ensure rendering is complete
    await new Promise(resolve => setTimeout(resolve, 500));

    const pdfBuffer = await page.pdf({
        path: outputPath,
        format: 'A4',
        margin: { top: '12mm', right: '14mm', bottom: '12mm', left: '14mm' },
        printBackground: true,
    });

    await browser.close();
    return pdfBuffer;
}

/**
 * Generate PDF and return as buffer (for streaming)
 */
async function generatePDFBuffer(htmlContent, baseDir) {
    let puppeteer;
    try {
        puppeteer = require('puppeteer');
    } catch (e) {
        throw new Error('puppeteer not installed. Run: npm install puppeteer');
    }

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    await page.setViewport({ width: 794, height: 1123 });

    await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
        baseURL: `file://${baseDir}/`
    });

    await page.evaluateHandle('document.fonts.ready');
    await new Promise(resolve => setTimeout(resolve, 500));

    const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: { top: '12mm', right: '14mm', bottom: '12mm', left: '14mm' },
        printBackground: true,
    });

    await browser.close();
    return pdfBuffer;
}

module.exports = {
    localizeData,
    imageToBase64,
    renderHTML,
    generatePDF,
    generatePDFBuffer
};
