module.exports = (req, res) => {
    const apiKey = process.env.NFTSCAN_API_KEY;
    
    res.status(200).json({
        message: 'Function works!',
        hasApiKey: !!apiKey,
        keyPreview: apiKey ? apiKey.substring(0, 4) + '...' : 'NOT SET'
    });
};
