module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const BITQUERY_API_KEY = process.env.BITQUERY_API_KEY;
    const CHICKENS_CONTRACT = '0x84eea2be67b17698b0e09b57eeeda47aa921bbf0';

    if (!BITQUERY_API_KEY) {
        return res.status(500).json({ success: false, error: 'BITQUERY_API_KEY not configured' });
    }

    try {
        // GraphQL query for NFT data on Base
        const query = `
        {
          EVM(dataset: combined, network: base) {
            Transfers(
              where: {
                Transfer: {
                  Currency: {
                    SmartContract: {
                      is: "${CHICKENS_CONTRACT}"
                    }
                  }
                }
              }
              limit: {count: 100}
              orderBy: {descending: Block_Time}
            ) {
              Transfer {
                Currency {
                  Name
                  Symbol
                  SmartContract
                }
                Id
                URI
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
                'Authorization': `Bearer ${BITQUERY_API_KEY}`
            },
            body: JSON.stringify({ query })
        });

        const data = await response.json();

        // Get ETH price
        let ethPrice = 2500;
        try {
            const priceRes = await fetch('https://api.coinbase.com/v2/prices/ETH-USD/spot');
            const priceData = await priceRes.json();
            ethPrice = parseFloat(priceData.data.amount);
        } catch (e) {}

        return res.status(200).json({
            success: true,
            eth_price: ethPrice,
            contract: CHICKENS_CONTRACT,
            bitquery_response: data,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
