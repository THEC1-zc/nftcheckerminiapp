// /api/chickens.js
// Vercel Serverless Function - Proxy per NFTScan API

export default async function handler(req, res) {
// CORS headers
res.setHeader(‘Access-Control-Allow-Origin’, ‘*’);
res.setHeader(‘Access-Control-Allow-Methods’, ‘GET, OPTIONS’);

```
if (req.method === 'OPTIONS') {
    return res.status(200).end();
}

const NFTSCAN_API_KEY = process.env.NFTSCAN_API_KEY;
const CHICKENS_CONTRACT = '0x84eea2be67b17698b0e09b57eeeda47aa921bbf0';

// Check if API key exists
if (!NFTSCAN_API_KEY) {
    return res.status(500).json({ 
        success: false, 
        error: 'NFTSCAN_API_KEY not configured' 
    });
}

try {
    // Test: Fetch collection info from NFTScan
    const url = `https://baseapi.nftscan.com/api/v2/collections/${CHICKENS_CONTRACT}`;
    
    const response = await fetch(url, {
        headers: {
            'X-API-KEY': NFTSCAN_API_KEY,
            'Accept': 'application/json'
        }
    });

    const data = await response.json();

    // Return raw response for debugging
    return res.status(200).json({
        success: true,
        api_status: response.status,
        data: data
    });

} catch (error) {
    return res.status(500).json({
        success: false,
        error: error.message
    });
}
```

}