// TNKLimitBot - Hybrid Engine (Real BTC API + Realistic TNK Simulation)
const readline = require('readline');
const axios = require('axios');

let orders = [];
// Harga awal TNK diset sesuai pasar terkini (~$0.20)
let currentPrices = { TNK: 0.2026, BTC: 0 };
let orderIdCounter = 1;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("🚀 TNKLimitBot Started (Hybrid Mode)...");
console.log("💡 Commands: 'buy TNK <price>', 'sell TNK <price>', 'list', 'exit'");
console.log("📡 Connecting to CoinGecko for BTC data & simulating TNK market...\n");

async function fetchMarketData() {
    try {
        // Hanya ambil BTC dari CoinGecko (Pasti ada datanya)
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');

        if (response.data.bitcoin) {
            currentPrices.BTC = response.data.bitcoin.usd;
        }

        // Simulasi Pergerakan Harga TNK (Karena TNK belum stabil di Public API Gratis)
        // Kita buat fluktuasi acak kecil (-1% sampai +1%) agar terlihat hidup seperti pasar asli
        const volatility = (Math.random() * 0.02) - 0.01;
        let newTnkPrice = currentPrices.TNK * (1 + volatility);

        // Jaga agar harga tidak terlalu jauh dari range wajar ($0.15 - $0.25)
        if (newTnkPrice < 0.15) newTnkPrice = 0.15;
        if (newTnkPrice > 0.25) newTnkPrice = 0.25;

        currentPrices.TNK = parseFloat(newTnkPrice.toFixed(6));

        // Tampilkan Live Feed
        process.stdout.write(`\r📡 LIVE | TNK: $${currentPrices.TNK} (Sim) | BTC: $${currentPrices.BTC} (Real) | Checking orders...   `);

        checkOrders();

    } catch (error) {
        // Fallback jika internet mati atau API limit
        const volatility = (Math.random() * 0.02) - 0.01;
        currentPrices.TNK = parseFloat((currentPrices.TNK * (1 + volatility)).toFixed(6));
        process.stdout.write(`\r⚠️ OFFLINE/SLEEP | TNK: $${currentPrices.TNK} (Sim) | Checking orders...   `);
        checkOrders();
    }
}

function addOrder(type, asset, price) {
    const assetUpper = asset.toUpperCase();
    if (assetUpper !== 'TNK' && assetUpper !== 'BTC') {
        console.log(`\n❌ Asset ${assetUpper} not supported. Use TNK or BTC.`);
        return;
    }

    const order = {
        id: orderIdCounter++,
        type: type,
        asset: assetUpper,
        limitPrice: parseFloat(price),
        status: 'PENDING'
    };

    orders.push(order);
    console.log(`\n✅ ORDER SET: ${type} ${assetUpper} @ $${price}`);
    console.log(`   Current Market: $${currentPrices[assetUpper]}`);
    checkOrders();
}

function checkOrders() {
    let filledCount = 0;
    orders.forEach(order => {
        if (order.status !== 'PENDING') return;
        const current = currentPrices[order.asset];
        if (!current) return;

        let filled = false;
        // Logika Limit Order
        if (order.type === 'BUY' && current <= order.limitPrice) {
            console.log(`\n🟢 EXECUTED: BUY ${order.asset} @ $${current} (Target was $${order.limitPrice})`);
            console.log(`   💰 You bought the dip!`);
            filled = true;
        } else if (order.type === 'SELL' && current >= order.limitPrice) {
            console.log(`\n🔴 EXECUTED: SELL ${order.asset} @ $${current} (Target was $${order.limitPrice})`);
            console.log(`   💰 Profit taken!`);
            filled = true;
        }

        if (filled) {
            order.status = 'FILLED';
            filledCount++;
        }
    });

    if (filledCount > 0) listOrders();
}

function listOrders() {
    console.log("\n--- 📋 ORDERBOOK STATUS ---");
    if (orders.length === 0) {
        console.log("No active orders.");
    } else {
        orders.forEach(o => {
            const icon = o.status === 'FILLED' ? '✅' : '⏳';
            console.log(`${icon} ID:${o.id} | ${o.type} ${o.asset} @ $${o.limitPrice} | ${o.status}`);
        });
    }
    console.log("--------------------------\n");
}

// Update harga setiap 3 detik (Cukup cepat untuk demo, aman untuk API)
setInterval(fetchMarketData, 3000);

// Jalankan pertama kali
fetchMarketData();

rl.on('line', (input) => {
    const parts = input.trim().split(' ');
    const cmd = parts[0].toLowerCase();

    if (cmd === 'buy' && parts.length >= 3) {
        addOrder('BUY', parts[1], parts[2]);
    } else if (cmd === 'sell' && parts.length >= 3) {
        addOrder('SELL', parts[1], parts[2]);
    } else if (cmd === 'list') {
        listOrders();
    } else if (cmd === 'exit') {
        console.log("\n👋 Bot stopped. Good luck trading!");
        rl.close();
        process.exit(0);
    } else {
        console.log("❌ Format salah. Contoh: 'buy TNK 0.19' atau 'sell TNK 0.22'");
    }
});
