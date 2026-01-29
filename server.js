#!/usr/bin/env node
/**
 * CV Editor Server
 * Express server for the CV editor interface
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { renderHTML, generatePDFBuffer } = require('./generate_cv_lib');

const app = express();
const PORT = process.env.PORT || 3000;

// Base directory for CV files
const BASE_DIR = __dirname;
const DATA_FILE = path.join(BASE_DIR, 'cv_data.json');
const TEMPLATE_FILE = path.join(BASE_DIR, 'templates', 'cv_template.html');
const PHOTOS_DIR = path.join(BASE_DIR, 'fotos');

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from editor directory
app.use('/editor', express.static(path.join(BASE_DIR, 'editor')));

// Serve photos directory
app.use('/fotos', express.static(PHOTOS_DIR));

// Configure multer for photo uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(PHOTOS_DIR)) {
            fs.mkdirSync(PHOTOS_DIR, { recursive: true });
        }
        cb(null, PHOTOS_DIR);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const filename = `portrait_${Date.now()}${ext}`;
        cb(null, filename);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

// Redirect root to editor
app.get('/', (req, res) => {
    res.redirect('/editor');
});

// Serve editor index.html
app.get('/editor', (req, res) => {
    res.sendFile(path.join(BASE_DIR, 'editor', 'index.html'));
});

// API: Get CV data
app.get('/api/data', (req, res) => {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            return res.status(404).json({ error: 'Data file not found' });
        }
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        res.json(data);
    } catch (err) {
        console.error('Error reading data:', err);
        res.status(500).json({ error: 'Failed to read data file' });
    }
});

// API: Save CV data
app.post('/api/data', (req, res) => {
    try {
        const data = req.body;

        // Create backup
        if (fs.existsSync(DATA_FILE)) {
            const backupPath = DATA_FILE.replace('.json', `_backup_${Date.now()}.json`);
            fs.copyFileSync(DATA_FILE, backupPath);

            // Keep only last 5 backups
            const backupPattern = /cv_data_backup_\d+\.json$/;
            const backups = fs.readdirSync(BASE_DIR)
                .filter(f => backupPattern.test(f))
                .sort()
                .reverse();

            backups.slice(5).forEach(backup => {
                fs.unlinkSync(path.join(BASE_DIR, backup));
            });
        }

        // Save new data
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
        res.json({ success: true, message: 'Data saved successfully' });
    } catch (err) {
        console.error('Error saving data:', err);
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// API: Render HTML preview
app.post('/api/preview', (req, res) => {
    try {
        const { data, lang } = req.body;

        if (!data || !lang) {
            return res.status(400).json({ error: 'Missing data or lang parameter' });
        }

        const html = renderHTML(data, TEMPLATE_FILE, lang, BASE_DIR);
        res.send(html);
    } catch (err) {
        console.error('Error rendering preview:', err);
        res.status(500).json({ error: 'Failed to render preview: ' + err.message });
    }
});

// API: Generate PDF
app.post('/api/generate-pdf', async (req, res) => {
    try {
        const { data, lang } = req.body;

        if (!data || !lang) {
            return res.status(400).json({ error: 'Missing data or lang parameter' });
        }

        console.log('Generating PDF for language:', lang);
        const html = renderHTML(data, TEMPLATE_FILE, lang, BASE_DIR);
        console.log('HTML rendered, generating PDF...');
        const pdfBuffer = await generatePDFBuffer(html, BASE_DIR);
        console.log('PDF generated, size:', pdfBuffer.length, 'bytes');

        const name = (data.personal?.name || 'cv').toLowerCase().replace(/\s+/g, '_');
        const filename = `cv_${name}_${lang}.pdf`;

        // Ensure we send as proper binary
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', pdfBuffer.length);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.end(Buffer.from(pdfBuffer));
    } catch (err) {
        console.error('Error generating PDF:', err);
        res.status(500).json({ error: 'Failed to generate PDF: ' + err.message });
    }
});

// API: Upload photo
app.post('/api/upload-photo', upload.single('photo'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const photoPath = `fotos/${req.file.filename}`;
        res.json({
            success: true,
            path: photoPath,
            message: 'Photo uploaded successfully'
        });
    } catch (err) {
        console.error('Error uploading photo:', err);
        res.status(500).json({ error: 'Failed to upload photo' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════╗
║          CV Editor Server Started                   ║
╠════════════════════════════════════════════════════╣
║  Editor:  http://localhost:${PORT}/editor              ║
║  API:     http://localhost:${PORT}/api                 ║
╚════════════════════════════════════════════════════╝
    `);
});
