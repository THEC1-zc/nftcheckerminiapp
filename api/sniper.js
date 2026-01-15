// api/sniper.js
export default async function handler(req, res) {
    const COLLECTION = "0x84eea2be67b17698b0e09b57eeeda47aa921bbf0";
    const RESERVOIR_API = "https://api-base.reservoir.tools/tokens/v6";
    
    // Usiamo la chiave pubblica. Se fallisce, servirà una chiave privata.
    const API_KEY = "demo-api-key"; 

    try {
        // 1. SCARICA I DATI GREZZI (I 50 più economici in vendita)
        const url = `${RESERVOIR_API}?collection=${COLLECTION}&sortBy=floorAskPrice&limit=50&includeAttributes=true`;
        
        const response = await fetch(url, {
            headers: {
                'x-api-key': API_KEY,
                'accept': '*/*'
            }
        });

        if (!response.ok) {
            throw new Error(`Reservoir Error: ${response.status}`);
        }

        const data = await response.json();
        const tokens = data.tokens || [];

        // 2. IL SETACCIO (Filtering Logic)
        const bestDeals = {}; 

        for (const item of tokens) {
            // A. Check Prezzo (Deve essere listato)
            const price = item.market?.floorAsk?.price?.amount?.native;
            if (!price) continue;

            // B. Estrai Tratti
            const attrs = item.token.attributes || [];
            let level = -1;
            let neynarScore = 0;
            let maxChickenLevel = 0;

            for (const a of attrs) {
                const key = (a.key || "").toLowerCase();
                const val = parseFloat(a.value); // Converte stringhe in numeri

                if (key === 'level') level = val;
                if (key.includes('neynar') && key.includes('score')) neynarScore = val;
                if (key.includes('max') && key.includes('chicken')) maxChickenLevel = val;
            }

            // C. Ignora livelli fuori target
            if (level < 1 || level > 5) continue;

            // D. GOLDEN EGG LOGIC
            // Tieni se (Score >= 0.69) OPPURE (MaxLevel >= 3)
            const isSafe = (neynarScore >= 0.69) || (maxChickenLevel >= 3);

            if (!isSafe) continue; // SCARTA!

            // E. Salva il Primo (il più economico) per ogni livello
            if (!bestDeals[level]) {
                bestDeals[level] = {
                    id: item.token.tokenId,
                    price: price, // Prezzo in ETH
                    reason: (neynarScore >= 0.69) ? `Score ${neynarScore}` : `Whale (Lvl ${maxChickenLevel})`,
                    image: item.token.image
                };
            }
            
            // Ottimizzazione: Se li abbiamo trovati tutti, fermati.
            if (Object.keys(bestDeals).length === 5) break;
        }

        // 3. Rispondi al Frontend
        res.status(200).json(bestDeals);

    } catch (error) {
        console.error("Sniper Error:", error);
        res.status(500).json({ error: "Failed to scan market" });
    }
}
