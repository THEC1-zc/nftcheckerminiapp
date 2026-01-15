export default async function handler(req, res) {
    const COLLECTION = "0x84eea2be67b17698b0e09b57eeeda47aa921bbf0";
    const RESERVOIR_API = "https://api-base.reservoir.tools/tokens/v6";

    try {
        // 1. SCARICA I DATI (Stealth Mode)
        // Chiediamo i 50 token più economici, con attributi
        const url = `${RESERVOIR_API}?collection=${COLLECTION}&sortBy=floorAskPrice&limit=50&includeAttributes=true`;
        
        const response = await fetch(url, {
            headers: {
                // TRUCCO: Non usiamo 'x-api-key' (che spesso è bloccata su Vercel se è 'demo')
                // Invece, fingiamo di essere un browser
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Origin': 'https://opensea.io', // A volte aiuta
                'Referer': 'https://opensea.io/'
            }
        });

        if (!response.ok) {
            // Leggiamo il testo dell'errore per capire cosa succede
            const errText = await response.text();
            console.error(`Reservoir Error Payload: ${errText}`);
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        const tokens = data.tokens || [];

        // 2. IL SETACCIO (Tua logica esatta)
        const bestDeals = {}; 

        for (const item of tokens) {
            // A. Check Prezzo
            const price = item.market?.floorAsk?.price?.amount?.native;
            if (!price) continue;

            // B. Estrai Tratti
            const attrs = item.token.attributes || [];
            let level = -1;
            let neynarScore = 0;
            let maxChickenLevel = 0;

            for (const a of attrs) {
                const key = (a.key || "").toLowerCase();
                const val = parseFloat(a.value); 

                if (key === 'level') level = val;
                if (key.includes('neynar') && key.includes('score')) neynarScore = val;
                if (key.includes('max') && key.includes('chicken')) maxChickenLevel = val;
            }

            // C. Ignora livelli fuori target
            if (level < 1 || level > 5) continue;

            // D. GOLDEN EGG LOGIC
            // Score >= 0.69 OPPURE MaxLevel >= 3
            const isSafe = (neynarScore >= 0.69) || (maxChickenLevel >= 3);

            if (!isSafe) continue; // SCARTA

            // E. Salva il Primo (il più economico) per ogni livello
            if (!bestDeals[level]) {
                bestDeals[level] = {
                    id: item.token.tokenId,
                    price: price, // Prezzo in ETH
                    reason: (neynarScore >= 0.69) ? `Score ${neynarScore}` : `Whale (Lvl ${maxChickenLevel})`,
                    image: item.token.image
                };
            }
            
            if (Object.keys(bestDeals).length === 5) break;
        }

        return res.status(200).json(bestDeals);

    } catch (error) {
        console.error("Backend Failure:", error);
        // Restituisce l'errore al frontend così lo vediamo
        return res.status(500).json({ error: error.message || "Unknown Server Error" });
    }
}
