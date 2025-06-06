const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

puppeteer.use(StealthPlugin());

const run = async (url) => {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: '/usr/bin/google-chrome-stable',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  let result = null;

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    await page.evaluate(() => {
      document.querySelector('button[aria-label*=cookies]')?.click();
    });

    await page.waitForSelector("ytd-video-description-transcript-section-renderer button", {
      timeout: 10000
    });

    await page.evaluate(() => {
      document.querySelector('ytd-video-description-transcript-section-renderer button').click();
    });

    result = await parseTranscript(page);

    await page.close();
    await browser.close();

    return result;
  } catch (error) {
    await page.close();
    await browser.close();
    return `Error: ${error.message}`;
  }
};

const parseTranscript = async (page) => {
  await page.waitForSelector('#segments-container', { timeout: 10000 });
  return page.evaluate(() => {
    return Array.from(document.querySelectorAll('#segments-container yt-formatted-string'))
      .map(element => element.textContent?.trim())
      .join("\n");
  });
};

app.get('/transcript', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('Missing YouTube URL');
  const transcript = await run(url);
  res.send(transcript);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
