module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const NFTSCAN_API_KEY = process.env.NFTSCAN_API_KEY;
    const CHICKENS_CONTRACT = '0x84eea2be67b17698b0e09b57eeeda47aa921bbf0';

    if (!NFTSCAN_API_KEY) {
        return res.status(500).json({ success: false, error: 'API key not configured' });
    }

    try {
        // 1. Fetch assets with attributes from NFTScan
        const url = `https://baseapi.nftscan.com/api/v2/assets/${CHICKENS_CONTRACT}?show_attribute=true&limit=200`;
        
        const response = await fetch(url, {
            headers: {
                'X-API-KEY': NFTSCAN_API_KEY,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            return res.status(500).json({ 
                success: false, 
                error: `NFTScan error: ${response.status}` 
            });
        }

        const data = await response.json();
        const assets = data.data?.content || [];

        // 2. Get ETH price
        let ethPrice = 2500;
        try {
            const priceRes = await fetch('https://api.coinbase.com/v2/prices/ETH-USD/spot');
            const priceData = await priceRes.json();
            ethPrice = parseFloat(priceData.data.amount);
        } catch (e) {}

        // 3. Process assets - extract traits
        const processed = assets.map(item => {
            const attrs = item.attributes || [];
            const getAttr = (name) => {
                const attr = attrs.find(a => 
                    (a.attribute_name || '').toLowerCase() === name.toLowerCase() ||
                    (a.trait_type || '').toLowerCase() === name.toLowerCase()
                );
                return attr?.attribute_value || attr?.value || null;
            };

            const level = parseInt(getAttr('Level')) || 0;
            const neynarScore = parseFloat(getAttr('Owner Neynar Score')) || 0;
            const maxChicken = parseInt(getAttr('Owner Max Chicken')) || 0;
            
            // Safe = Neynar > 0.69 OR MaxChicken >= 3
            const isSafe = neynarScore > 0.69 || maxChicken >= 3;

            return {
                token_id: item.token_id,
                name: item.name || `Chicken #${item.token_id}`,
                level,
                neynar_score: neynarScore,
                max_chicken: maxChicken,
                is_safe: isSafe
            };
        });

        // 4. Count by level (for now, just stats - prices need marketplace API)
        const statsByLevel = {};
        for (let lvl = 1; lvl <= 5; lvl++) {
            const levelItems = processed.filter(p => p.level === lvl);
            const safeItems = levelItems.filter(p => p.is_safe);
            statsByLevel[lvl] = {
                total: levelItems.length,
                safe: safeItems.length,
                floor_eth: null,
                floor_usd: null
            };
        }

        return res.status(200).json({
            success: true,
            eth_price: ethPrice,
            contract: CHICKENS_CONTRACT,
            total_assets: assets.length,
            stats_by_level: statsByLevel,
            sample: processed.slice(0, 5),
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
