const express = require('express');
const router = express.Router();
const Data = require('../models/Data');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// GET form page
router.get('/', (req, res) => {
    res.render('form');
});

// POST form submission
router.post('/submit', async (req, res) => {
    try {
        const { name, channel, signature } = req.body;

        // Create new data object
        const newData = new Data({ name, channel, signature });
        await newData.save();

        // Redirect to PDF generation route
        res.redirect(`/generate-pdf/${newData._id}`);
    } catch (error) {
        console.error('Error submitting data:', error);
        res.status(500).send('Error submitting data');
    }
});

// GET generate PDF route
router.get('/generate-pdf/:id', async (req, res) => {
    try {
        const data = await Data.findById(req.params.id);

        // Render PDF template with data, setting a flag to include the download button
        res.render('template', { data, includeDownloadButton: true });
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('Error generating PDF');
    }
});

// GET download PDF route
router.get('/download-pdf/:id', async (req, res) => {
    try {
        const data = await Data.findById(req.params.id);

        // Launch Puppeteer to generate PDF
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // Render the HTML content using EJS without the download button
        const htmlContent = await new Promise((resolve, reject) => {
            res.render('template', { data, includeDownloadButton: false }, (err, html) => {
                if (err) reject(err);
                resolve(html);
            });
        });

        await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

        // Define the PDF path
        const pdfPath = path.join(__dirname, `../public/pdfs/${data._id}.pdf`);

        // Generate PDF
        await page.pdf({ path: pdfPath, format: 'A4' });

        await browser.close();

        // Send PDF file to client
        res.download(pdfPath, (err) => {
            if (err) {
                console.error('Error sending PDF file:', err);
                res.status(500).send('Error sending PDF file');
            }
            // Delete the file after sending
            fs.unlink(pdfPath, (err) => {
                if (err) {
                    console.error('Error deleting PDF file:', err);
                }
            });
        });
    } catch (error) {
        console.error('Error downloading PDF:', error);
        res.status(500).send('Error downloading PDF');
    }
});

module.exports = router;
