module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const NFTSCAN_API_KEY = process.env.NFTSCAN_API_KEY;
    const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || '46kIRKE_HvuVkuRbPNRbh';
    const BITQUERY_API_KEY = process.env.BITQUERY_API_KEY;
    const CHICKENS_CONTRACT = '0x84eea2be67b17698b0e09b57eeeda47aa921bbf0';

    const results = {
        timestamp: new Date().toISOString(),
        contract: CHICKENS_CONTRACT,
        eth_price: 2500,
        methods_tried: [],
        success: false,
        data: null
    };

    // Get ETH price
    try {
        const priceRes = await fetch('https://api.coinbase.com/v2/prices/ETH-USD/spot');
        const priceData = await priceRes.json();
        results.eth_price = parseFloat(priceData.data.amount);
    } catch (e) {
        results.eth_price_error = e.message;
    }

    // ========================================
    // METHOD 1: NFTScan (Assets + Attributes)
    // ========================================
    if (NFTSCAN_API_KEY) {
        try {
            const nftscanResult = await tryNFTScan(NFTSCAN_API_KEY, CHICKENS_CONTRACT);
            results.methods_tried.push({
                method: 'nftscan',
                success: nftscanResult.success,
                error: nftscanResult.error || null,
                sample_count: nftscanResult.total || 0
            });
            
            if (nftscanResult.success && nftscanResult.total > 0) {
                results.success = true;
                results.source = 'nftscan';
                results.data = nftscanResult;
            }
        } catch (e) {
            results.methods_tried.push({
                method: 'nftscan',
                success: false,
                error: e.message
            });
        }
    } else {
        results.methods_tried.push({
            method: 'nftscan',
            success: false,
            error: 'No API key configured'
        });
    }

    // ========================================
    // METHOD 2: Alchemy + Bitquery Hybrid
    // ========================================
    if (!results.success) {
        try {
            const hybridResult = await tryAlchemyBitquery(
                ALCHEMY_API_KEY, 
                BITQUERY_API_KEY, 
                CHICKENS_CONTRACT,
                results.eth_price
            );
            results.methods_tried.push({
                method: 'alchemy_bitquery_hybrid',
                success: hybridResult.success,
                error: hybridResult.error || null,
                alchemy_count: hybridResult.alchemy_count || 0,
                bitquery_count: hybridResult.bitquery_count || 0
            });
            
            if (hybridResult.success) {
                results.success = true;
                results.source = 'alchemy_bitquery_hybrid';
                results.data = hybridResult;
            }
        } catch (e) {
            results.methods_tried.push({
                method: 'alchemy_bitquery_hybrid',
                success: false,
                error: e.message
            });
        }
    }

    // Return results
    return res.status(results.success ? 200 : 500).json(results);
};

// ========================================
// NFTScan: Get assets with attributes
// ========================================
async function tryNFTScan(apiKey, contract) {
    const url = `https://baseapi.nftscan.com/api/v2/assets/${contract}?show_attribute=true&sort_field=token_id&sort_direction=asc&limit=100`;
    
    const response = await fetch(url, {
        headers: {
            'X-API-KEY': apiKey,
            'Accept': 'application/json'
        }
    });

    const data = await response.json();
    
    // Check for rate limit error
    if (data.code === 403 || data.code === '403') {
        return { 
            success: false, 
            error: data.msg || 'Rate limit exceeded'
        };
    }

    if (data.code !== 200 && data.code !== '200') {
        return { 
            success: false, 
            error: data.msg || `API error code: ${data.code}`
        };
    }

    const assets = data.data?.content || [];
    
    if (assets.length === 0) {
        return { success: false, error: 'No assets returned' };
    }

    // Process assets - extract traits
    const processed = assets.map(item => {
        const attrs = item.attributes || [];
        const getAttr = (name) => {
            const attr = attrs.find(a => 
                (a.attribute_name || a.trait_type || '').toLowerCase().includes(name.toLowerCase())
            );
            return attr?.attribute_value || attr?.value || null;
        };

        const level = parseInt(getAttr('level')) || 0;
        const neynarScore = parseFloat(getAttr('neynar')) || 0;
        const maxChicken = parseInt(getAttr('max chicken')) || 0;
        
        // Safe = Neynar > 0.69 OR MaxChicken >= 3
        const isSafe = neynarScore > 0.69 || maxChicken >= 3;

        return {
            token_id: item.token_id,
            name: item.name,
            owner: item.owner,
            level,
            neynar_score: neynarScore,
            max_chicken: maxChicken,
            is_safe: isSafe,
            attributes: attrs.slice(0, 5) // First 5 for debug
        };
    });

    // Count by level
    const statsByLevel = {};
    for (let lvl = 1; lvl <= 5; lvl++) {
        const levelItems = processed.filter(p => p.level === lvl);
        const safeItems = levelItems.filter(p => p.is_safe);
        statsByLevel[lvl] = {
            total: levelItems.length,
            safe: safeItems.length
        };
    }

    return {
        success: true,
        total: assets.length,
        stats_by_level: statsByLevel,
        sample: processed.slice(0, 5),
        raw_sample: assets.slice(0, 2) // Raw for debugging
    };
}

// ========================================
// Alchemy + Bitquery Hybrid Approach
// ========================================
async function tryAlchemyBitquery(alchemyKey, bitqueryKey, contract, ethPrice) {
    const result = {
        success: false,
        alchemy_count: 0,
        bitquery_count: 0,
        stats_by_level: {}
    };

    // Step 1: Get NFTs from Alchemy with metadata
    const alchemyUrl = `https://base-mainnet.g.alchemy.com/nft/v3/${alchemyKey}/getNFTsForContract?contractAddress=${contract}&withMetadata=true&limit=100`;
    
    const alchemyRes = await fetch(alchemyUrl);
    const alchemyData = await alchemyRes.json();
    
    if (alchemyData.error) {
        result.error = `Alchemy error: ${alchemyData.error.message}`;
        return result;
    }

    const nfts = alchemyData.nfts || [];
    result.alchemy_count = nfts.length;

    if (nfts.length === 0) {
        result.error = 'No NFTs returned from Alchemy';
        return result;
    }

    // Process Alchemy NFTs - extract traits from metadata
    const nftsByTokenId = {};
    for (const nft of nfts) {
        const tokenId = nft.tokenId;
        const attrs = nft.raw?.metadata?.attributes || [];
        
        const getAttr = (name) => {
            const attr = attrs.find(a => 
                (a.trait_type || '').toLowerCase().includes(name.toLowerCase())
            );
            return attr?.value || null;
        };

        const level = parseInt(getAttr('level')) || 0;
        const neynarScore = parseFloat(getAttr('neynar')) || 0;
        const maxChicken = parseInt(getAttr('max chicken')) || 0;
        const isSafe = neynarScore > 0.69 || maxChicken >= 3;

        nftsByTokenId[tokenId] = {
            token_id: tokenId,
            name: nft.name || `Chicken #${tokenId}`,
            level,
            neynar_score: neynarScore,
            max_chicken: maxChicken,
            is_safe: isSafe,
            last_sale_eth: null,
            last_sale_usd: null
        };
    }

    // Step 2: Get recent trades from Bitquery
    if (bitqueryKey) {
        const bitqueryQuery = `
        {
          EVM(dataset: combined, network: base) {
            DEXTrades(
              where: {
                Trade: {
                  Buy: {
                    Currency: {
                      SmartContract: {
                        is: "${contract}"
                      }
                    }
                  }
                }
              }
              limit: {count: 100}
              orderBy: {descending: Block_Time}
            ) {
              Trade {
                Buy {
                  Price
                  PriceInUSD
                  Ids
                }
              }
            }
          }
        }
        `;

        try {
            const bitqueryRes = await fetch('https://streaming.bitquery.io/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${bitqueryKey}`
                },
                body: JSON.stringify({ query: bitqueryQuery })
            });

            const bitqueryData = await bitqueryRes.json();
            const trades = bitqueryData.data?.EVM?.DEXTrades || [];
            result.bitquery_count = trades.length;

            // Map prices to token IDs (use most recent trade per token)
            const priceByTokenId = {};
            for (const trade of trades) {
                const ids = trade.Trade?.Buy?.Ids || [];
                const priceEth = trade.Trade?.Buy?.Price || 0;
                const priceUsd = trade.Trade?.Buy?.PriceInUSD || 0;
                
                for (const id of ids) {
                    if (!priceByTokenId[id]) {
                        priceByTokenId[id] = { eth: priceEth, usd: priceUsd };
                    }
                }
            }

            // Merge prices into NFT data
            for (const tokenId in priceByTokenId) {
                if (nftsByTokenId[tokenId]) {
                    nftsByTokenId[tokenId].last_sale_eth = priceByTokenId[tokenId].eth;
                    nftsByTokenId[tokenId].last_sale_usd = priceByTokenId[tokenId].usd;
                }
            }
        } catch (e) {
            result.bitquery_error = e.message;
        }
    }

    // Calculate stats by level
    const allNfts = Object.values(nftsByTokenId);
    for (let lvl = 1; lvl <= 5; lvl++) {
        const levelItems = allNfts.filter(n => n.level === lvl);
        const safeItems = levelItems.filter(n => n.is_safe);
        const withPrices = levelItems.filter(n => n.last_sale_eth !== null);
        const safeWithPrices = safeItems.filter(n => n.last_sale_eth !== null);
        
        // Find lowest last sale price (floor proxy)
        let floorEth = null;
        let floorUsd = null;
        if (safeWithPrices.length > 0) {
            const sorted = safeWithPrices.sort((a, b) => a.last_sale_eth - b.last_sale_eth);
            floorEth = sorted[0].last_sale_eth;
            floorUsd = sorted[0].last_sale_usd;
        }

        result.stats_by_level[lvl] = {
            total: levelItems.length,
            safe: safeItems.length,
            with_recent_sale: withPrices.length,
            safe_with_sale: safeWithPrices.length,
            lowest_recent_sale_eth: floorEth,
            lowest_recent_sale_usd: floorUsd
        };
    }

    result.success = true;
    result.sample = allNfts.slice(0, 5);
    
    return result;
}
