<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chickenfish Sniper</title>
    
    <script type="module">
        import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';
        const run = async () => { await sdk.actions.ready(); };
        run();
    </script>

    <style>
        :root { --bg: #fffbf0; --text: #3e2723; --accent: #FFC107; --card-bg: #ffffff; --green: #2ecc71; --red: #ff7675; }
        
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
            background-color: var(--bg);
            background-image: url('back.png');
            background-size: cover;
            background-position: center;
            background-attachment: fixed;
            color: var(--text); 
            padding: 15px; margin: 0; 
            display: flex; flex-direction: column; align-items: center; 
        }

        .nav-header { width: 100%; max-width: 500px; display: flex; margin-bottom: 20px; }
        .back-btn { text-decoration: none; color: #5d4037; background: white; padding: 8px 15px; border-radius: 20px; font-size: 0.9rem; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }

        .container { width: 100%; max-width: 500px; }
        
        h2 { text-align: center; margin: 0 0 5px 0; font-weight: 900; font-size: 1.8rem; text-shadow: 0 2px 0 rgba(255,255,255,0.5); }
        .subtitle { text-align: center; color: #795548; font-size: 0.8rem; margin-bottom: 20px; font-weight: 600; opacity: 0.8; }

        /* GRID SYSTEM per i 5 Box */
        .sniper-grid { display: flex; flex-direction: column; gap: 15px; }

        .sniper-card {
            background: var(--card-bg); border-radius: 18px; padding: 12px;
            display: flex; gap: 15px; align-items: center;
            box-shadow: 0 4px 15px rgba(62, 39, 35, 0.08);
            position: relative; overflow: hidden;
            transition: transform 0.2s;
        }
        
        /* Badge Livello */
        .level-indicator {
            position: absolute; left: 0; top: 0; bottom: 0; width: 6px;
            background: #ccc; 
        }
        .lvl-1 { background: #bdc3c7; } /* Grey */
        .lvl-2 { background: #2ecc71; } /* Green */
        .lvl-3 { background: #3498db; } /* Blue */
        .lvl-4 { background: #9b59b6; } /* Purple */
        .lvl-5 { background: #f1c40f; } /* Gold */

        .nft-thumb { 
            width: 80px; height: 80px; border-radius: 12px; object-fit: cover; background: #eee; flex-shrink: 0; 
        }

        .card-info { flex-grow: 1; }
        
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
        .nft-name { font-weight: 800; font-size: 0.95rem; color: #222; }
        .nft-id { font-size: 0.7rem; color: #999; font-family: monospace; }

        .reason-badge { 
            display: inline-block; padding: 3px 6px; border-radius: 6px; 
            font-size: 0.65rem; font-weight: 700; background: #e8f5e9; color: var(--green); margin-bottom: 6px;
        }

        .price-row { display: flex; align-items: baseline; gap: 8px; }
        .eth-price { font-size: 1.2rem; font-weight: 900; color: #3e2723; }
        .usd-price { font-size: 0.8rem; color: #888; font-weight: 500; }

        .buy-btn {
            background: #3e2723; color: white; text-decoration: none;
            padding: 8px 12px; border-radius: 10px; font-weight: 700; font-size: 0.8rem;
            white-space: nowrap;
        }

        /* Empty State */
        .empty-card { 
            opacity: 0.6; filter: grayscale(1); pointer-events: none; 
            border: 2px dashed #ccc; background: transparent; 
        }

        .loading-text { text-align: center; margin: 40px; font-weight: 600; color: #888; }
        .version { text-align: center; margin-top: 30px; font-size: 0.7rem; opacity: 0.5; font-family: monospace; }
    </style>
</head>
<body>

    <div class="nav-header">
        <a href="index.html" class="back-btn">⬅ Home</a>
    </div>

    <div class="container">
        <h2>Smart Sniper</h2>
        <div class="subtitle">Filtered by Neynar Score & Whales</div>

        <div id="loader" class="loading-text">Hunting for deals...</div>

        <div id="grid" class="sniper-grid" style="display: none;">
            </div>

        <div class="version">v10.0 (Vercel Bridge)</div>
    </div>

    <script>
        // Indirizzo Collezione per Link OpenSea
        const COLLECTION_ADDR = "0x84eea2be67b17698b0e09b57eeeda47aa921bbf0";

        window.addEventListener('DOMContentLoaded', startSniper);

        async function startSniper() {
            const loader = document.getElementById('loader');
            const grid = document.getElementById('grid');

            try {
                // 1. Chiama la nostra API su Vercel (Backend)
                // Questa chiamata non fallisce per CORS e nasconde la logica complessa
                const res = await fetch('/api/sniper');
                const bestDeals = await res.json();

                if (bestDeals.error) throw new Error(bestDeals.error);

                // 2. Genera le 5 card
                let html = "";
                
                for (let i = 1; i <= 5; i++) {
                    const item = bestDeals[i];
                    
                    if (item) {
                        // Abbiamo un listing valido!
                        const reason = item.score >= 0.69 ? `Score: ${item.score}` : `Whale (Lvl ${item.maxLvl})`;
                        const eth = parseFloat(item.priceEth).toFixed(4);
                        const usd = item.priceUsd ? `$${item.priceUsd.toFixed(2)}` : '---';
                        const link = `https://opensea.io/assets/base/${COLLECTION_ADDR}/${item.id}`;
                        
                        // Fix immagine se arriva da IPFS
                        let img = item.image || "https://placehold.co/100x100?text=No+Img";
                        if(img.startsWith('ipfs://')) img = img.replace('ipfs://', 'https://ipfs.io/ipfs/');

                        html += `
                        <div class="sniper-card">
                            <div class="level-indicator lvl-${i}"></div>
                            <img src="${img}" class="nft-thumb" onerror="this.src='https://placehold.co/100?text=Err'">
                            
                            <div class="card-info">
                                <div class="card-header">
                                    <span class="nft-name">Level ${i}</span>
                                    <span class="nft-id">#${item.id}</span>
                                </div>
                                <div class="reason-badge">✅ ${reason}</div>
                                <div class="price-row">
                                    <span class="eth-price">${eth} Ξ</span>
                                    <span class="usd-price">${usd}</span>
                                </div>
                            </div>

                            <a href="${link}" target="_blank" class="buy-btn">BUY</a>
                        </div>`;
                    } else {
                        // Nessun listing valido per questo livello
                        html += `
                        <div class="sniper-card empty-card">
                            <div class="level-indicator lvl-${i}"></div>
                            <div class="nft-thumb" style="display:flex;align-items:center;justify-content:center;font-size:2rem;">🚫</div>
                            <div class="card-info">
                                <div class="nft-name">Level ${i}</div>
                                <div class="price-row"><span class="usd-price">No safe listing found</span></div>
                            </div>
                        </div>`;
                    }
                }

                grid.innerHTML = html;
                loader.style.display = 'none';
                grid.style.display = 'flex';

            } catch (e) {
                console.error(e);
                loader.innerText = "Error loading data via Bridge.";
                loader.style.color = "red";
            }
        }
    </script>
</body>
</html>
