module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const NFTSCAN_API_KEY = process.env.NFTSCAN_API_KEY;
    const CHICKENS_CONTRACT = '0x84eea2be67b17698b0e09b57eeeda47aa921bbf0';

    const results = {};

    // Test 1: Collection info
    try {
        const url1 = `https://baseapi.nftscan.com/api/v2/collections/${CHICKENS_CONTRACT}`;
        const res1 = await fetch(url1, {
            headers: { 'X-API-KEY': NFTSCAN_API_KEY }
        });
        results.collection = await res1.json();
    } catch (e) {
        results.collection = { error: e.message };
    }

    // Test 2: Assets by contract
    try {
        const url2 = `https://baseapi.nftscan.com/api/v2/assets/${CHICKENS_CONTRACT}?limit=5`;
        const res2 = await fetch(url2, {
            headers: { 'X-API-KEY': NFTSCAN_API_KEY }
        });
        results.assets = await res2.json();
    } catch (e) {
        results.assets = { error: e.message };
    }

    // Test 3: Try with show_attribute
    try {
        const url3 = `https://baseapi.nftscan.com/api/v2/assets/${CHICKENS_CONTRACT}?show_attribute=true&limit=5`;
        const res3 = await fetch(url3, {
            headers: { 'X-API-KEY': NFTSCAN_API_KEY }
        });
        results.assets_with_attrs = await res3.json();
    } catch (e) {
        results.assets_with_attrs = { error: e.message };
    }

    // Test 4: Get single NFT
    try {
        const url4 = `https://baseapi.nftscan.com/api/v2/assets/${CHICKENS_CONTRACT}/1`;
        const res4 = await fetch(url4, {
            headers: { 'X-API-KEY': NFTSCAN_API_KEY }
        });
        results.single_nft = await res4.json();
    } catch (e) {
        results.single_nft = { error: e.message };
    }

    return res.status(200).json(results);
};
