#!/usr/bin/env node
/**
 * CV Generator - Converts JSON data + HTML template to PDF
 * Supports bilingual output (English/Dutch)
 *
 * Usage:
 *   node generate_cv.js                         # Generate English PDF
 *   node generate_cv.js --lang nl               # Generate Dutch PDF
 *   node generate_cv.js --lang en --lang nl     # Generate both languages
 *   node generate_cv.js --output my_cv.pdf      # Custom output filename
 *   node generate_cv.js --html                  # Also output HTML file
 *
 * First time setup:
 *   npm install puppeteer nunjucks
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

async function generatePDF(htmlContent, outputPath, baseDir) {
    let puppeteer;
    try {
        puppeteer = require('puppeteer');
    } catch (e) {
        console.error('Error: puppeteer not installed. Run: npm install puppeteer');
        process.exit(1);
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

    await page.pdf({
        path: outputPath,
        format: 'A4',
        margin: { top: '12mm', right: '14mm', bottom: '12mm', left: '14mm' },
        printBackground: true,
    });

    await browser.close();
    console.log(`  PDF generated: ${outputPath}`);
}

function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        data: null,
        template: null,
        output: null,
        html: false,
        langs: [],
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--data':
            case '-d':
                options.data = args[++i];
                break;
            case '--template':
            case '-t':
                options.template = args[++i];
                break;
            case '--output':
            case '-o':
                options.output = args[++i];
                break;
            case '--html':
                options.html = true;
                break;
            case '--lang':
            case '-l':
                options.langs.push(args[++i]);
                break;
            case '--help':
            case '-h':
                console.log(`
CV Generator - Converts JSON data + HTML template to PDF
Supports bilingual output (English/Dutch)

Usage:
  node generate_cv.js [options]

Options:
  --data, -d <file>      Path to JSON data file (default: cv_data.json)
  --template, -t <file>  Path to HTML template (default: templates/cv_template.html)
  --output, -o <file>    Output PDF filename (default: cv_<name>_<lang>.pdf)
  --lang, -l <code>      Language code: 'en' or 'nl' (can be used multiple times)
  --html                 Also output the rendered HTML file
  --help, -h             Show this help message

Examples:
  node generate_cv.js                    # Generate English PDF
  node generate_cv.js --lang nl          # Generate Dutch PDF
  node generate_cv.js -l en -l nl        # Generate both languages
  node generate_cv.js --html --lang nl   # Dutch PDF + HTML preview
`);
                process.exit(0);
        }
    }

    // Default to English if no language specified
    if (options.langs.length === 0) {
        options.langs = ['en'];
    }

    return options;
}

async function generateForLanguage(rawData, templatePath, lang, options, scriptDir) {
    console.log(`\nGenerating ${lang.toUpperCase()} version...`);

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

    // Convert photo to base64 if exists
    if (data.personal && data.personal.photo) {
        const photoPath = path.join(scriptDir, data.personal.photo);
        const base64Photo = imageToBase64(photoPath);
        if (base64Photo) {
            data.personal.photo = base64Photo;
        }
    }

    // Render template with nunjucks
    const templateName = path.basename(templatePath);
    const htmlContent = env.render(templateName, data);

    // Determine output filename
    let outputPath = options.output;
    if (!outputPath || options.langs.length > 1) {
        const name = (rawData.personal?.name || 'cv').toLowerCase().replace(/\s+/g, '_');
        outputPath = path.join(scriptDir, `cv_${name}_${lang}.pdf`);
    }

    // Optionally save HTML
    if (options.html) {
        const htmlPath = outputPath.replace(/\.pdf$/i, '.html');
        fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
        console.log(`  HTML generated: ${htmlPath}`);
    }

    // Generate PDF
    await generatePDF(htmlContent, outputPath, scriptDir);
}

async function main() {
    const options = parseArgs();
    const scriptDir = __dirname;

    // Set defaults
    const dataPath = options.data || path.join(scriptDir, 'cv_data.json');
    const templatePath = options.template || path.join(scriptDir, 'templates', 'cv_template.html');

    // Validate inputs
    if (!fs.existsSync(dataPath)) {
        console.error(`Error: Data file not found: ${dataPath}`);
        process.exit(1);
    }

    if (!fs.existsSync(templatePath)) {
        console.error(`Error: Template file not found: ${templatePath}`);
        process.exit(1);
    }

    // Load data
    console.log(`Loading data from: ${dataPath}`);
    const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    console.log(`Loading template: ${templatePath}`);

    // Generate for each requested language
    for (const lang of options.langs) {
        if (!['en', 'nl'].includes(lang)) {
            console.warn(`Warning: Unknown language '${lang}', skipping...`);
            continue;
        }
        await generateForLanguage(rawData, templatePath, lang, options, scriptDir);
    }

    console.log('\nDone!');
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
