// api/sniper.js
export default async function handler(req, res) {
    const COLLECTION = "0x84eea2be67b17698b0e09b57eeeda47aa921bbf0";
    
    // Usiamo l'API pubblica di Reservoir (Server-to-Server non ha problemi di CORS)
    const RESERVOIR_URL = "https://api-base.reservoir.tools/tokens/v6";

    try {
        // 1. SCARICA I DATI GREZZI
        // Chiediamo i 100 token più economici in vendita (ordinati per prezzo)
        // Includiamo gli attributi per vedere Score e Max Level
        const url = `${RESERVOIR_URL}?collection=${COLLECTION}&sortBy=floorAskPrice&limit=100&includeAttributes=true`;
        
        const response = await fetch(url, {
            headers: { 
                'accept': '*/*',
                'x-api-key': 'demo-api-key' // Chiave pubblica server-side
            }
        });

        if (!response.ok) throw new Error(`Errore Reservoir: ${response.status}`);
        
        const data = await response.json();
        const tokens = data.tokens || [];

        // 2. PREPARA I CONTENITORI (Solo il migliore per ogni livello)
        // Usiamo un oggetto per tenere traccia del primo (e quindi più economico) trovato per ogni livello
        const bestDeals = {}; 

        // 3. IL FILTRO "GOLDEN EGG" (La tua logica esatta)
        for (const item of tokens) {
            
            // A. È in vendita? (Ha un prezzo?)
            const priceData = item.market?.floorAsk?.price?.amount;
            if (!priceData) continue; // Salta se non è listato

            // B. Estrai i Tratti (Normalizziamo i nomi in minuscolo per sicurezza)
            const attrs = item.token.attributes || [];
            let level = -1;
            let neynarScore = 0; // Default basso (se manca il tratto, vale 0)
            let maxChickenLevel = 0; // Default basso

            for (const a of attrs) {
                const key = (a.key || "").toLowerCase();
                const val = a.value;

                // Cerca "Level"
                if (key === 'level') level = parseInt(val);
                
                // Cerca "Owner Neynar Score" (o simili varianti)
                if (key.includes('neynar') && key.includes('score')) {
                    neynarScore = parseFloat(val);
                }
                
                // Cerca "Owner Max Chicken Level"
                if (key.includes('max') && key.includes('chicken')) {
                    maxChickenLevel = parseInt(val);
                }
            }

            // C. Filtra per Livello (Ci interessano solo 1, 2, 3, 4, 5)
            if (level < 1 || level > 5) continue;

            // D. APPLICA LA TUA REGOLA DI ESCLUSIONE
            // Regola: Tieni se (Score >= 0.69) OPPURE (MaxLevel >= 3)
            // Se Score è basso (<0.69) E MaxLevel è basso (<3) -> SCARTA.
            const isSafe = (neynarScore >= 0.69) || (maxChickenLevel >= 3);

            if (!isSafe) continue; // Scarta elemento "unsafe"

            // E. Salva il risultato (Solo se non abbiamo già trovato un deal migliore per questo livello)
            // Dato che l'API ci dà i token ordinati per prezzo crescente, il primo che troviamo è il migliore.
            if (!bestDeals[level]) {
                bestDeals[level] = {
                    level: level,
                    tokenId: item.token.tokenId,
                    name: item.token.name,
                    image: item.token.image,
                    priceEth: priceData.native,
                    priceUsd: priceData.usd,
                    reason: (neynarScore >= 0.69) ? `Score ${neynarScore}` : `Whale (Lvl ${maxChickenLevel})`,
                    openseaLink: `https://opensea.io/assets/base/${COLLECTION}/${item.token.tokenId}`
                };
            }

            // Ottimizzazione: Se abbiamo trovato tutti e 5 i livelli, fermati.
            if (bestDeals[1] && bestDeals[2] && bestDeals[3] && bestDeals[4] && bestDeals[5]) break;
        }

        // 4. RISPONDI ALLA APP
        // Restituisce un JSON pulito con solo i dati che servono
        return res.status(200).json(bestDeals);

    } catch (error) {
        console.error("Sniper Error:", error);
        return res.status(500).json({ error: "Errore durante la scansione del mercato" });
    }
}
