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
        :root { --bg: #fffbf0; --text: #3e2723; --accent: #FFC107; --card-bg: #ffffff; --green: #2ecc71; --btn: #3e2723; }
        
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

        .nav-header { width: 100%; max-width: 500px; display: flex; margin-bottom: 15px; }
        .back-btn { text-decoration: none; color: #5d4037; background: white; padding: 8px 15px; border-radius: 20px; font-size: 0.9rem; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }

        /* HUB CARD (Statica) */
        .hub-card {
            background: var(--card-bg); width: 100%; max-width: 400px;
            border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(62, 39, 35, 0.1);
            text-align: center; margin-bottom: 25px;
        }
        .img-wrapper { width: 100%; height: 280px; position: relative; }
        .coll-img { width: 100%; height: 100%; object-fit: cover; }
        
        .info { padding: 20px; }
        .main-title { font-size: 1.6rem; font-weight: 900; margin: 0 0 5px 0; color: #222; }
        .subtitle { color: #888; font-size: 0.8rem; margin-bottom: 20px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;}

        /* BOTTONI AZIONE */
        .actions { display: flex; flex-direction: column; gap: 10px; }
        
        .btn {
            display: block; width: 100%; padding: 16px; border-radius: 14px;
            text-decoration: none; font-weight: 800; text-align: center; font-size: 1rem;
            transition: transform 0.2s; box-sizing: border-box; cursor: pointer; border: none;
        }
        .btn-primary { background: var(--btn); color: white; box-shadow: 0 4px 15px rgba(62, 39, 35, 0.2); }
        .btn-primary:hover { background: #5d4037; transform: translateY(-2px); }
        
        .btn-secondary { background: #fff8e1; color: #3e2723; border: 1px solid #ffe082; }
        
        /* SNIPER RESULTS (Nascosti all'inizio) */
        .results-area { width: 100%; max-width: 400px; display: none; flex-direction: column; gap: 15px; }
        
        .section-title { font-size: 0.8rem; font-weight: 800; color: #aaa; margin: 10px 0 5px 0; text-transform: uppercase; letter-spacing: 1px; text-align: center;}

        .sniper-card {
            background: var(--card-bg); border-radius: 18px; padding: 10px;
            display: flex; gap: 12px; align-items: center;
            box-shadow: 0 4px 15px rgba(62, 39, 35, 0.08);
            position: relative; overflow: hidden; animation: fadeIn 0.5s forwards;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .level-indicator { position: absolute; left: 0; top: 0; bottom: 0; width: 5px; }
        .lvl-1 { background: #bdc3c7; } .lvl-2 { background: #2ecc71; } .lvl-3 { background: #3498db; }
        .lvl-4 { background: #9b59b6; } .lvl-5 { background: #f1c40f; }

        .nft-thumb { width: 70px; height: 70px; border-radius: 12px; object-fit: cover; background: #eee; flex-shrink: 0; }

        .card-info { flex-grow: 1; text-align: left; }
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
        .nft-name { font-weight: 800; font-size: 0.9rem; color: #222; }
        .nft-id { font-size: 0.7rem; color: #999; font-family: monospace; }
        .reason-badge { font-size: 0.65rem; font-weight: 700; background: #e8f5e9; color: var(--green); padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 4px;}

        .price-row { display: flex; align-items: baseline; gap: 6px; }
        .eth-price { font-size: 1.1rem; font-weight: 900; color: #3e2723; }
        .usd-price { font-size: 0.75rem; color: #888; font-weight: 500; }

        .buy-btn-small {
            background: #3e2723; color: white; text-decoration: none;
            padding: 8px 12px; border-radius: 8px; font-weight: 700; font-size: 0.75rem;
        }

        .loader { text-align: center; margin: 20px 0; color: #888; font-weight: 600; display: none; }
        .error-msg { color: var(--red); font-size: 0.8rem; text-align: center; margin-top: 10px; display: none; background: #ffebee; padding: 10px; border-radius: 10px;}

        .empty-card { opacity: 0.6; filter: grayscale(1); }
        .version { text-align: center; margin-top: 30px; font-size: 0.7rem; opacity: 0.5; font-family: monospace; }
    </style>
</head>
<body>

    <div class="nav-header">
        <a href="index.html" class="back-btn">⬅ Home</a>
    </div>

    <div class="hub-card">
        <div class="img-wrapper">
            <img src="l5.jpeg" class="coll-img" onerror="this.src='https://placehold.co/400x400?text=Chicken'">
        </div>
        <div class="info">
            <h2 class="main-title">Chickens by $EGGS</h2>
            <div class="subtitle">Sniper Tool</div>
            
            <div class="actions">
                <a href="https://opensea.io/collection/chickens-by-eggs" target="_blank" class="btn btn-secondary">OpenSea Collection 🌊</a>
                <button onclick="startScan()" id="scanBtn" class="btn btn-primary">🔎 Look for Deals</button>
            </div>
            
            <div id="loader" class="loader">Scanning Market...</div>
            <div id="errorMsg" class="error-msg"></div>
        </div>
    </div>

    <div id="results" class="results-area">
        <div class="section-title">Best Safe Listings</div>
        <div id="grid"></div>
    </div>

    <div class="version">v12.0 (Hub + OnDemand Bridge)</div>

    <script>
        const COLLECTION_ADDR = "0x84eea2be67b17698b0e09b57eeeda47aa921bbf0";

        async function startScan() {
            const btn = document.getElementById('scanBtn');
            const loader = document.getElementById('loader');
            const results = document.getElementById('results');
            const grid = document.getElementById('grid');
            const errorMsg = document.getElementById('errorMsg');

            // UI State: Loading
            btn.style.display = 'none';
            loader.style.display = 'block';
            errorMsg.style.display = 'none';
            results.style.display = 'none';

            try {
                // CALL VERCEL BRIDGE
                const res = await fetch('/api/sniper');
                
                if (!res.ok) {
                    const errText = await res.text(); // Leggi l'errore dal server se c'è
                    throw new Error(`Server Error: ${res.status} - ${errText}`);
                }
                
                const bestDeals = await res.json();
                if (bestDeals.error) throw new Error(bestDeals.error);

                // RENDER
                let html = "";
                for (let i = 1; i <= 5; i++) {
                    const item = bestDeals[i];
                    if (item) {
                        // Found Deal
                        let img = item.image || "l5.jpeg";
                        if(img.startsWith('ipfs://')) img = img.replace('ipfs://', 'https://ipfs.io/ipfs/');
                        
                        const eth = parseFloat(item.priceEth).toFixed(4);
                        const usd = item.priceUsd ? `$${item.priceUsd.toFixed(2)}` : '';
                        const link = `https://opensea.io/assets/base/${COLLECTION_ADDR}/${item.id}`;

                        html += `
                        <div class="sniper-card">
                            <div class="level-indicator lvl-${i}"></div>
                            <img src="${img}" class="nft-thumb" onerror="this.src='l5.jpeg'">
                            <div class="card-info">
                                <div class="card-header">
                                    <span class="nft-name">Level ${i}</span>
                                    <span class="nft-id">#${item.id}</span>
                                </div>
                                <div class="reason-badge">✅ ${item.reason}</div>
                                <div class="price-row">
                                    <span class="eth-price">${eth} Ξ</span>
                                    <span class="usd-price">${usd}</span>
                                </div>
                            </div>
                            <a href="${link}" target="_blank" class="buy-btn-small">BUY</a>
                        </div>`;
                    } else {
                        // No Deal
                        html += `
                        <div class="sniper-card empty-card">
                            <div class="level-indicator lvl-${i}" style="background:#eee"></div>
                            <div class="nft-thumb" style="display:flex;justify-content:center;align-items:center;font-size:1.5rem">🚫</div>
                            <div class="card-info">
                                <div class="nft-name">Level ${i}</div>
                                <div class="price-row"><span class="usd-price">No safe listings</span></div>
                            </div>
                        </div>`;
                    }
                }

                grid.innerHTML = html;
                loader.style.display = 'none';
                results.style.display = 'flex'; // Show Grid
                btn.innerText = "🔄 Scan Again";
                btn.style.display = 'block'; // Show Button again

            } catch (e) {
                console.error(e);
                loader.style.display = 'none';
                btn.style.display = 'block';
                errorMsg.innerText = `Error: ${e.message}`;
                errorMsg.style.display = 'block';
            }
        }
    </script>
</body>
</html>
