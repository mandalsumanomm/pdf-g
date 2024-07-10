const express = require('express');
const router = express.Router();
const Data = require('../models/Data');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises; 

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

    // Render PDF template with data
    const htmlContent = await req.app.render('template', { data, includeDownloadButton: false });


    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set content and convert to PDF
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Define the PDF path
    const pdfPath = path.join(__dirname, `../public/pdfs/${data._id}.pdf`);

    // directory exists using fs.promises.mkdir
    await fs.mkdir(path.dirname(pdfPath), { recursive: true });

    // Generate PDF
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '40px',
        bottom: '40px',
        left: '40px',
        right: '40px'
      }
    });

    await browser.close();

    // Send PDF file to client
    res.download(pdfPath, (err) => {
      if (err) {
        console.error('Error sending PDF file:', err);
        res.status(500).send('Error sending PDF file');
      }

      // Delete the file after sending
      fs.unlink(pdfPath).catch(err => {
        console.error('Error deleting PDF file:', err);
      });
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).send('Error generating PDF');
  }
});

module.exports = router;
