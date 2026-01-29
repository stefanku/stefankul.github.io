#!/usr/bin/env node
/**
 * Portfolio Static Site Generator
 * Generates a static portfolio site from cv_data.json
 */

const fs = require('fs');
const path = require('path');
const nunjucks = require('nunjucks');
const { localizeData, generatePDF, renderHTML } = require('./generate_cv_lib');

// Configuration
const BASE_DIR = __dirname;
const DATA_FILE = path.join(BASE_DIR, 'cv_data.json');
const TEMPLATES_DIR = path.join(BASE_DIR, 'templates');
const OUTPUT_DIR = path.join(BASE_DIR, 'docs');
const CV_TEMPLATE = path.join(TEMPLATES_DIR, 'cv_template.html');

// Languages to generate
const LANGUAGES = ['en', 'nl'];

/**
 * Ensure directory exists
 */
function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/**
 * Copy file to destination
 */
function copyFile(src, dest) {
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
}

/**
 * Copy directory recursively
 */
function copyDir(src, dest) {
    ensureDir(dest);
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            copyFile(srcPath, destPath);
        }
    }
}

/**
 * Configure Nunjucks environment
 */
function setupNunjucks() {
    const env = nunjucks.configure(TEMPLATES_DIR, {
        autoescape: true,
        trimBlocks: true,
        lstripBlocks: true,
    });

    // Add custom filters
    env.addFilter('join', (arr, sep) => Array.isArray(arr) ? arr.join(sep) : arr);

    return env;
}

/**
 * Render a portfolio template
 */
function renderTemplate(env, templateName, data, lang) {
    const localized = localizeData(data, lang);
    localized.t = data.translations[lang] || data.translations.en;
    localized.lang = lang;
    localized.visibility = data.sectionVisibility || {};
    localized.basePath = lang === 'en' ? '' : '..';
    localized.altLang = lang === 'en' ? 'nl' : 'en';
    localized.altLangLabel = lang === 'en' ? 'Nederlands' : 'English';

    // Group presentations by year
    if (localized.presentations) {
        const grouped = {};
        for (const pres of localized.presentations) {
            if (pres.visible === false) continue;
            // Extract year from date (e.g., "September 2025" -> "2025", "2024" -> "2024")
            const yearMatch = pres.date ? pres.date.match(/\d{4}/) : null;
            const year = yearMatch ? yearMatch[0] : 'Other';
            if (!grouped[year]) grouped[year] = [];
            grouped[year].push(pres);
        }
        // Convert to array sorted by year descending
        localized.presentationsByYear = Object.keys(grouped)
            .sort((a, b) => b - a)
            .map(year => ({ year, items: grouped[year] }));
    }

    // Sort publications by year (descending) within each category
    if (localized.publications) {
        const sortByYear = (a, b) => parseInt(b.year || 0) - parseInt(a.year || 0);
        if (localized.publications.books) {
            localized.publications.books = [...localized.publications.books].sort(sortByYear);
        }
        if (localized.publications.book_chapters) {
            localized.publications.book_chapters = [...localized.publications.book_chapters].sort(sortByYear);
        }
        if (localized.publications.articles) {
            localized.publications.articles = [...localized.publications.articles].sort(sortByYear);
        }
    }

    return env.render(templateName, localized);
}

/**
 * Generate all portfolio pages
 */
async function generatePortfolio() {
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║       Portfolio Static Site Generator              ║');
    console.log('╚════════════════════════════════════════════════════╝\n');

    // Load CV data
    console.log('Loading cv_data.json...');
    if (!fs.existsSync(DATA_FILE)) {
        console.error('Error: cv_data.json not found');
        process.exit(1);
    }
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    console.log('  ✓ Data loaded\n');

    // Setup Nunjucks
    const env = setupNunjucks();

    // Clean and create output directory
    console.log('Preparing output directory...');
    if (fs.existsSync(OUTPUT_DIR)) {
        fs.rmSync(OUTPUT_DIR, { recursive: true });
    }
    ensureDir(OUTPUT_DIR);
    ensureDir(path.join(OUTPUT_DIR, 'nl'));
    ensureDir(path.join(OUTPUT_DIR, 'cv'));
    ensureDir(path.join(OUTPUT_DIR, 'publications'));
    ensureDir(path.join(OUTPUT_DIR, 'presentations'));
    ensureDir(path.join(OUTPUT_DIR, 'assets', 'css'));
    ensureDir(path.join(OUTPUT_DIR, 'assets', 'js'));
    ensureDir(path.join(OUTPUT_DIR, 'assets', 'images'));
    console.log('  ✓ Output directories created\n');

    // Copy assets
    console.log('Copying assets...');

    // Copy photo
    const photoPath = path.join(BASE_DIR, data.personal.photo);
    if (fs.existsSync(photoPath)) {
        copyFile(photoPath, path.join(OUTPUT_DIR, 'assets', 'images', 'portrait.jpeg'));
        console.log('  ✓ Portrait photo copied');
    }

    // Copy CSS and JS
    const cssSource = path.join(TEMPLATES_DIR, 'portfolio.css');
    const jsSource = path.join(TEMPLATES_DIR, 'portfolio.js');
    if (fs.existsSync(cssSource)) {
        copyFile(cssSource, path.join(OUTPUT_DIR, 'assets', 'css', 'portfolio.css'));
        console.log('  ✓ CSS copied');
    }
    if (fs.existsSync(jsSource)) {
        copyFile(jsSource, path.join(OUTPUT_DIR, 'assets', 'js', 'portfolio.js'));
        console.log('  ✓ JavaScript copied');
    }
    console.log('');

    // Generate pages for each language
    console.log('Generating pages...');

    for (const lang of LANGUAGES) {
        const prefix = lang === 'en' ? '' : `${lang}/`;

        // Home page
        const homeHtml = renderTemplate(env, 'portfolio_home.html', data, lang);
        const homePath = lang === 'en'
            ? path.join(OUTPUT_DIR, 'index.html')
            : path.join(OUTPUT_DIR, lang, 'index.html');
        fs.writeFileSync(homePath, homeHtml);
        console.log(`  ✓ Home (${lang.toUpperCase()}): ${prefix}index.html`);

        // CV page
        const cvHtml = renderTemplate(env, 'portfolio_cv.html', data, lang);
        const cvPagePath = lang === 'en'
            ? path.join(OUTPUT_DIR, 'cv', 'index.html')
            : path.join(OUTPUT_DIR, 'cv', `${lang}.html`);
        fs.writeFileSync(cvPagePath, cvHtml);
        console.log(`  ✓ CV (${lang.toUpperCase()}): cv/${lang === 'en' ? 'index' : lang}.html`);

        // Publications page
        const pubsHtml = renderTemplate(env, 'portfolio_publications.html', data, lang);
        const pubsPath = lang === 'en'
            ? path.join(OUTPUT_DIR, 'publications', 'index.html')
            : path.join(OUTPUT_DIR, 'publications', `${lang}.html`);
        fs.writeFileSync(pubsPath, pubsHtml);
        console.log(`  ✓ Publications (${lang.toUpperCase()}): publications/${lang === 'en' ? 'index' : lang}.html`);

        // Presentations page
        const presHtml = renderTemplate(env, 'portfolio_presentations.html', data, lang);
        const presPath = lang === 'en'
            ? path.join(OUTPUT_DIR, 'presentations', 'index.html')
            : path.join(OUTPUT_DIR, 'presentations', `${lang}.html`);
        fs.writeFileSync(presPath, presHtml);
        console.log(`  ✓ Presentations (${lang.toUpperCase()}): presentations/${lang === 'en' ? 'index' : lang}.html`);
    }
    console.log('');

    // PDF generation disabled

    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║  Build complete! Preview with: npm run preview     ║');
    console.log('╚════════════════════════════════════════════════════╝');
}

// Run generator
generatePortfolio().catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
});
