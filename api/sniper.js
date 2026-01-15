export default async function handler(req, res) {
    const COLLECTION = "0x84eea2be67b17698b0e09b57eeeda47aa921bbf0";
    const RESERVOIR_API = "https://api-base.reservoir.tools/tokens/v6";
    
    // Se hai una tua key di Reservoir, mettila qui al posto di 'demo-api-key'
    const API_KEY = "demo-api-key"; 

    try {
        // 1. Scarica i 100 listing più economici
        const url = `${RESERVOIR_API}?collection=${COLLECTION}&sortBy=floorAskPrice&limit=100&includeAttributes=true`;
        
        const response = await fetch(url, {
            headers: {
                'x-api-key': API_KEY,
                'accept': '*/*'
            }
        });

        if (!response.ok) {
            throw new Error(`Reservoir API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const tokens = data.tokens || [];

        // 2. Filtra (Logica Golden Egg)
        const bestDeals = {}; 

        for (const item of tokens) {
            // Check prezzo
            const price = item.market?.floorAsk?.price?.amount?.native;
            if (!price) continue;

            // Estrai tratti
            const attrs = item.token.attributes || [];
            let level = -1;
            let neynarScore = 0;
            let maxChickenLevel = 0;

            for (const a of attrs) {
                const key = (a.key || "").toLowerCase();
                const val = parseFloat(a.value); // Converte "3" o "0.8" in numero

                if (key === 'level') level = val;
                if (key.includes('neynar') && key.includes('score')) neynarScore = val;
                if (key.includes('max') && key.includes('chicken')) maxChickenLevel = val;
            }

            // Filtra solo livelli 1-5
            if (level < 1 || level > 5) continue;

            // --- IL FILTRO SICUREZZA ---
            // Accettiamo se Score è alto OPPURE se è una Whale (MaxLvl alto)
            const isSafe = (neynarScore >= 0.69) || (maxChickenLevel >= 3);

            if (!isSafe) continue; // Scartato

            // Salva il primo trovato per livello (essendo ordinati per prezzo, è il best deal)
            if (!bestDeals[level]) {
                bestDeals[level] = {
                    id: item.token.tokenId,
                    name: item.token.name,
                    image: item.token.image,
                    priceEth: price,
                    priceUsd: item.market.floorAsk.price.amount.usd,
                    reason: (neynarScore >= 0.69) ? `Score ${neynarScore}` : `Whale (MaxLvl ${maxChickenLevel})`
                };
            }
        }

        // Restituisce i risultati
        return res.status(200).json(bestDeals);

    } catch (error) {
        console.error("Backend Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
