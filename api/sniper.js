export default async function handler(req, res) {
  // 1. Configurazione
  const COLLECTION = "0x84eea2be67b17698b0e09b57eeeda47aa921bbf0";
  const RESERVOIR_API = "https://api-base.reservoir.tools/tokens/v6";
  
  // Usiamo la demo key pubblica server-side (più stabile dei proxy)
  const API_KEY = "demo-api-key"; 

  try {
    // 2. Scarica i 100 listing più economici in assoluto
    // Questo è il "Pool" dove cerchiamo le gemme
    const url = `${RESERVOIR_API}?collection=${COLLECTION}&sortBy=floorAskPrice&limit=100&includeAttributes=true`;
    
    const response = await fetch(url, {
      headers: {
        'x-api-key': API_KEY,
        'accept': '*/*'
      }
    });
    
    if (!response.ok) throw new Error(`Reservoir Error: ${response.status}`);
    const data = await response.json();
    const tokens = data.tokens || [];

    // 3. I Contenitori per i risultati (Livelli 1-5)
    const bestDeals = { 1: null, 2: null, 3: null, 4: null, 5: null };
    
    // 4. IL FILTRO "GOLDEN EGG"
    for (const item of tokens) {
      // A. Check: è listato?
      const price = item.market?.floorAsk?.price?.amount?.native;
      if (!price) continue;

      // B. Estrai i Tratti
      const attrs = item.token.attributes || [];
      let level = -1;
      let neynarScore = 0; // Default basso
      let maxChickenLevel = 0; // Default basso

      for (const a of attrs) {
        const key = (a.key || "").toLowerCase();
        const val = parseFloat(a.value); // Converti valore in numero
        
        if (key === 'level') level = val;
        // Nota: uso 'includes' per flessibilità sui nomi dei tratti
        if (key.includes('neynar score')) neynarScore = val;
        if (key.includes('max chicken level')) maxChickenLevel = val;
      }

      // C. Ignora se il livello non è 1-5
      if (level < 1 || level > 5) continue;

      // D. LOGICA DI ESCLUSIONE (Il Cuore della richiesta)
      // "Escludere se Score < 0.69... A MENO CHE MaxLevel >= 3"
      // Quindi: Tieni se (Score >= 0.69) OPPURE (MaxLevel >= 3)
      const isSafe = (neynarScore >= 0.69) || (maxChickenLevel >= 3);

      if (!isSafe) continue; // Scartato!

      // E. Salva se è il primo (quindi il più economico) che troviamo per questo livello
      if (!bestDeals[level]) {
        bestDeals[level] = {
          id: item.token.tokenId,
          name: item.token.name,
          image: item.token.image,
          priceEth: price,
          priceUsd: item.market.floorAsk.price.amount.usd,
          score: neynarScore,
          maxLvl: maxChickenLevel
        };
      }
      
      // Se abbiamo riempito tutti i 5 livelli, possiamo fermarci (opzionale, per velocità)
      if (bestDeals[1] && bestDeals[2] && bestDeals[3] && bestDeals[4] && bestDeals[5]) break;
    }

    // 5. Rispondi al Frontend
    return res.status(200).json(bestDeals);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to snipe chickens' });
  }
}
