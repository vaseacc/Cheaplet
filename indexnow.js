/**
 * IndexNow URL Submission Script for Scoralia
 * 
 * This script automatically submits URLs to Bing using the IndexNow protocol.
 * Run this whenever content is added, updated, or deleted.
 * 
 * Usage: node indexnow.js
 * 
 * Requirements:
 * - Node.js installed
 * - Replace 'YOUR_INDEXNOW_KEY' with your actual key (generate at https://www.indexnow.org/)
 */

const https = require('https');

// Configuration
const INDEXNOW_KEY = 'YOUR_INDEXNOW_KEY'; // Generate at https://www.indexnow.org/
const SITE_URL = 'https://scoralia.ca';

// URLs to submit (update these when content changes)
const urlsToSubmit = [
  `${SITE_URL}/`,
  `${SITE_URL}/search`,
  `${SITE_URL}/social`,
  `${SITE_URL}/tag`,
  `${SITE_URL}/verify`,
  `${SITE_URL}/terms`,
  `${SITE_URL}/privacy`,
  `${SITE_URL}/safety`,
  `${SITE_URL}/contact`
];

/**
 * Submit URLs to IndexNow
 */
async function submitToIndexNow() {
  console.log('🚀 Starting IndexNow submission...');
  console.log(`📍 Site: ${SITE_URL}`);
  console.log(`🔑 Key: ${INDEXNOW_KEY.substring(0, 8)}...`);
  console.log(`📄 URLs to submit: ${urlsToSubmit.length}`);
  
  const data = JSON.stringify({
    host: SITE_URL.replace('https://', ''),
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: urlsToSubmit
  });

  const options = {
    hostname: 'api.indexnow.org',
    port: 443,
    path: '/indexnow',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log(`\n✅ Response Status: ${res.statusCode}`);
        console.log(`📦 Response: ${responseData}`);
        
        if (res.statusCode === 200) {
          console.log('\n✨ Success! URLs submitted to Bing IndexNow.');
          resolve(true);
        } else {
          console.error('\n❌ Submission failed. Check your key and URLs.');
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('\n❌ Error submitting URLs:', error.message);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// Generate key file content (save this as /[KEY].txt on your server)
function generateKeyFile() {
  console.log('\n📝 IMPORTANT: Create a file at the following URL with this content:');
  console.log(`${SITE_URL}/${INDEXNOW_KEY}.txt`);
  console.log(`\nFile content should be just: ${INDEX_NOW_KEY}`);
  console.log('\nThis verifies you own the domain.');
}

// Run submission
if (INDEXNOW_KEY === 'YOUR_INDEXNOW_KEY') {
  console.error('❌ ERROR: You must replace YOUR_INDEXNOW_KEY with your actual key!');
  console.error('   Generate a key at: https://www.indexnow.org/');
  process.exit(1);
}

submitToIndexNow()
  .then(() => {
    generateKeyFile();
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
