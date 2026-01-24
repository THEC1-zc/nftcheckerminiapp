// /api/chickens.js
// Vercel Serverless Function - Proxy per NFTScan API
// Nasconde la API key dal frontend

const NFTSCAN_API_KEY = process.env.NFTSCAN_API_KEY;
const CHICKENS_CONTRACT = ‘0x84eea2be67b17698b0e09b57eeeda47aa921bbf0’;
const BASE_URL = ‘https://baseapi.nftscan.com/api/v2’;

export default async function handler(req, res) {
// CORS headers
res.setHeader(‘Access-Control-Allow-Origin’, ‘*’);
res.setHeader(‘Access-Control-Allow-Methods’, ‘GET, OPTIONS’);
res.setHeader(‘Access-Control-Allow-Headers’, ‘Content-Type’);

```
if (req.method === 'OPTIONS') {
    return res.status(200).end();
}

if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
}

try {
    // 1. Fetch listings attivi dal Marketplace API
    const listingsUrl = `${BASE_URL}/market/collection/${CHICKENS_CONTRACT}?order_type=listing&limit=100`;
    
    const listingsRes = await fetch(listingsUrl, {
        headers: {
            'X-API-KEY': NFTSCAN_API_KEY,
            'Accept': 'application/json'
        }
    });

    if (!listingsRes.ok) {
        throw new Error(`NFTScan API error: ${listingsRes.status}`);
    }

    const listingsData = await listingsRes.json();

    // 2. Se non ci sono listings nel marketplace, prova a prendere gli asset con attributes
    let items = listingsData.data || [];
    
    // Se il marketplace API non restituisce dati, usiamo l'assets API
    if (items.length === 0) {
        const assetsUrl = `${BASE_URL}/assets/${CHICKENS_CONTRACT}?limit=100&show_attribute=true`;
        
        const assetsRes = await fetch(assetsUrl, {
            headers: {
                'X-API-KEY': NFTSCAN_API_KEY,
                'Accept': 'application/json'
            }
        });

        if (assetsRes.ok) {
            const assetsData = await assetsRes.json();
            items = assetsData.data?.content || [];
        }
    }

    // 3. Processa e filtra i dati
    const processedItems = items.map(item => {
        // Estrai attributes
        const attributes = item.attributes || [];
        const getAttr = (name) => {
            const attr = attributes.find(a => 
                a.attribute_name?.toLowerCase() === name.toLowerCase() ||
                a.trait_type?.toLowerCase() === name.toLowerCase()
            );
            return attr?.attribute_value || attr?.value || null;
        };

        const level = parseInt(getAttr('Level')) || 0;
        const neynarScore = parseFloat(getAttr('Owner Neynar Score')) || 0;
        const maxChicken = parseInt(getAttr('Owner Max Chicken')) || 0;

        // Determina se è "Safe"
        const isSafe = neynarScore > 0.69 || maxChicken >= 3;

        return {
            token_id: item.token_id,
            name: item.name || `Chicken #${item.token_id}`,
            image: item.image_uri || item.content_uri,
            price_eth: item.price ? parseFloat(item.price) : null,
            price_wei: item.price_wei || null,
            seller: item.owner || item.maker,
            level,
            neynar_score: neynarScore,
            max_chicken: maxChicken,
            is_safe: isSafe,
            marketplace: item.exchange_name || 'opensea',
            listing_time: item.listing_time || item.create_time
        };
    });

    // 4. Filtra solo i Safe e con prezzo (listati)
    const safeListings = processedItems.filter(item => item.is_safe && item.price_eth);

    // 5. Raggruppa per Level e trova floor
    const floorByLevel = {};
    
    for (let lvl = 1; lvl <= 5; lvl++) {
        const levelItems = safeListings.filter(item => item.level === lvl);
        
        if (levelItems.length > 0) {
            // Ordina per prezzo e prendi il più basso
            levelItems.sort((a, b) => a.price_eth - b.price_eth);
            floorByLevel[lvl] = {
                floor_eth: levelItems[0].price_eth,
                token_id: levelItems[0].token_id,
                name: levelItems[0].name,
                image: levelItems[0].image,
                seller: levelItems[0].seller,
                neynar_score: levelItems[0].neynar_score,
                max_chicken: levelItems[0].max_chicken,
                count: levelItems.length
            };
        } else {
            floorByLevel[lvl] = null;
        }
    }

    // 6. Fetch ETH price
    let ethPrice = 2500; // Fallback
    try {
        const priceRes = await fetch('https://api.coinbase.com/v2/prices/ETH-USD/spot');
        const priceData = await priceRes.json();
        ethPrice = parseFloat(priceData.data.amount);
    } catch (e) {
        console.error('ETH price fetch error:', e);
    }

    // 7. Response
    return res.status(200).json({
        success: true,
        eth_price: ethPrice,
        contract: CHICKENS_CONTRACT,
        total_listings: safeListings.length,
        floor_by_level: floorByLevel,
        timestamp: new Date().toISOString()
    });

} catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
        success: false,
        error: error.message
    });
}
```

}
