module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const BITQUERY_API_KEY = process.env.BITQUERY_API_KEY;
    const NFTSCAN_API_KEY = process.env.NFTSCAN_API_KEY;
    const CHICKENS_CONTRACT = '0x84eea2be67b17698b0e09b57eeeda47aa921bbf0';

    // Get ETH price
    let ethPrice = 2500;
    try {
        const priceRes = await fetch('https://api.coinbase.com/v2/prices/ETH-USD/spot');
        const priceData = await priceRes.json();
        ethPrice = parseFloat(priceData.data.amount);
    } catch (e) {}

    // ========================================
    // TRY BITQUERY FIRST - NFT Trades on Seaport
    // ========================================
    if (BITQUERY_API_KEY) {
        try {
            const bitqueryResult = await tryBitquery(BITQUERY_API_KEY, CHICKENS_CONTRACT, ethPrice);
            if (bitqueryResult.success && bitqueryResult.has_data) {
                return res.status(200).json({
                    ...bitqueryResult,
                    source: 'bitquery',
                    timestamp: new Date().toISOString()
                });
            }
        } catch (e) {
            console.log('Bitquery failed:', e.message);
        }
    }

    // ========================================
    // FALLBACK TO NFTSCAN
    // ========================================
    if (NFTSCAN_API_KEY) {
        try {
            const nftscanResult = await tryNFTScan(NFTSCAN_API_KEY, CHICKENS_CONTRACT, ethPrice);
            if (nftscanResult.success) {
                return res.status(200).json({
                    ...nftscanResult,
                    source: 'nftscan',
                    timestamp: new Date().toISOString()
                });
            }
        } catch (e) {
            console.log('NFTScan failed:', e.message);
        }
    }

    // Both failed
    return res.status(500).json({
        success: false,
        error: 'Both Bitquery and NFTScan failed',
        eth_price: ethPrice,
        timestamp: new Date().toISOString()
    });
};

// ========================================
// BITQUERY - Query NFT Trades
// ========================================
async function tryBitquery(apiKey, contract, ethPrice) {
    // Query for NFT DEX trades (OpenSea/Seaport)
    const query = `
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
          limit: {count: 200}
          orderBy: {descending: Block_Time}
        ) {
          Trade {
            Buy {
              Amount
              Price
              PriceInUSD
              Buyer
              Ids
              URIs
            }
            Sell {
              Amount
              Price
              Currency {
                Symbol
                SmartContract
              }
              Seller
            }
            Dex {
              ProtocolName
              ProtocolFamily
            }
          }
          Block {
            Time
          }
          Transaction {
            Hash
          }
        }
      }
    }
    `;

    const response = await fetch('https://streaming.bitquery.io/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ query })
    });

    const data = await response.json();
    
    if (data.errors) {
        throw new Error(data.errors[0]?.message || 'Bitquery error');
    }

    const trades = data.data?.EVM?.DEXTrades || [];
    
    if (trades.length === 0) {
        return { success: true, has_data: false };
    }

    // Process trades - extract prices
    // Note: For now we return raw data, will process when we see structure
    return {
        success: true,
        has_data: true,
        eth_price: ethPrice,
        contract: contract,
        total_trades: trades.length,
        trades_sample: trades.slice(0, 10),
        stats_by_level: {
            1: { total: 0, safe: 0, floor_eth: null, floor_usd: null },
            2: { total: 0, safe: 0, floor_eth: null, floor_usd: null },
            3: { total: 0, safe: 0, floor_eth: null, floor_usd: null },
            4: { total: 0, safe: 0, floor_eth: null, floor_usd: null },
            5: { total: 0, safe: 0, floor_eth: null, floor_usd: null }
        }
    };
}

// ========================================
// NFTSCAN - Query Assets with Attributes
// ========================================
async function tryNFTScan(apiKey, contract, ethPrice) {
    // First get assets with attributes
    const assetsUrl = `https://baseapi.nftscan.com/api/v2/assets/${contract}?show_attribute=true&limit=200`;
    
    const assetsRes = await fetch(assetsUrl, {
        headers: {
            'X-API-KEY': apiKey,
            'Accept': 'application/json'
        }
    });

    const assetsData = await assetsRes.json();
    
    if (assetsData.code === 403) {
        throw new Error('NFTScan rate limit');
    }

    const assets = assetsData.data?.content || [];

    // Process assets - extract traits and check "safe"
    const processed = assets.map(item => {
        const attrs = item.attributes || [];
        const getAttr = (name) => {
            const attr = attrs.find(a => 
                (a.attribute_name || a.trait_type || '').toLowerCase() === name.toLowerCase()
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
            name: item.name,
            level,
            neynar_score: neynarScore,
            max_chicken: maxChicken,
            is_safe: isSafe
        };
    });

    // Count by level
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

    return {
        success: true,
        has_data: assets.length > 0,
        eth_price: ethPrice,
        contract: contract,
        total_assets: assets.length,
        stats_by_level: statsByLevel,
        sample: processed.slice(0, 5)
    };
}
