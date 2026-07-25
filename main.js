    const MAX_COLS = 15, ROWS = 6, TILE = 32;
    const SAVE_KEY = 'pocket_farm_survival_v1';

    const CROPS = {
      carrot:  { cost: 1,  sell: 3,  maxProgress: 40,  icon: '🥕', perishTime: 120 },
      wheat:   { cost: 2,  sell: 6,  maxProgress: 80,  icon: '🌾', perishTime: 150 },
      corn:    { cost: 4,  sell: 12, maxProgress: 130, icon: '🌽', perishTime: 180 },
      pumpkin: { cost: 8,  sell: 28, maxProgress: 180, icon: '🎃', perishTime: 240 },
      magic:   { cost: 20, sell: 75, maxProgress: 250, icon: '✨', perishTime: 360 }
    };

    const cropMarketData = {
        carrot: { name: "Carrot", basePrice: 3, currentMultiplier: 1.0, previousMultiplier: 1.0 },
        wheat: { name: "Wheat", basePrice: 6, currentMultiplier: 1.0, previousMultiplier: 1.0 },
        corn: { name: "Corn", basePrice: 12, currentMultiplier: 1.0, previousMultiplier: 1.0 },
        pumpkin: { name: "Pumpkin", basePrice: 28, currentMultiplier: 1.0, previousMultiplier: 1.0 },
        magic: { name: "Magic", basePrice: 75, currentMultiplier: 1.0, previousMultiplier: 1.0 }
    };

    const headlines = [
        { title: "📰 Regional Shortage Causes Crop Valuations to Surge!", summary: "Supplies are running low across local markets. Sellers report record payouts today." },
        { title: "📰 Surplus Harvest Floods Markets; Prices Dip", summary: "Warehouses are overflowing with fresh produce, giving buyers the upper hand." },
        { title: "📰 Consumer Taste Shifts Overnight!", summary: "A sudden viral trend has drastically altered consumer demand for specific harvests." },
        { title: "📰 Stable Trading Day Reported Across All Sectors", summary: "Markets remain balanced with standard baseline pricing for all common yields." }
    ];

    function generateBounty() {
      const crops = Object.keys(CROPS);
      const randomCrop = crops[Math.floor(Math.random() * crops.length)];
      const amounts = { carrot: 10, wheat: 5, corn: 3, pumpkin: 2, magic: 1 };
      return {
        crop: randomCrop,
        amount: amounts[randomCrop],
        multiplier: (Math.random() * 1.5 + 2.0).toFixed(1),
        fulfilled: false
      };
    }

    function startNewMarketDay() {
        let highestMultiplier = 0;
        for (let key in cropMarketData) {
            cropMarketData[key].previousMultiplier = cropMarketData[key].currentMultiplier;
            let multiplier = Math.round((Math.random() * (2.2 - 0.6) + 0.6) * 10) / 10;
            cropMarketData[key].currentMultiplier = multiplier;
            if (multiplier > highestMultiplier) highestMultiplier = multiplier;
        }

        let highestCropKey = null;
        for (let key in cropMarketData) {
            if (cropMarketData[key].currentMultiplier === highestMultiplier) {
                highestCropKey = key;
                break;
            }
        }

        let selectedHeadline = headlines[Math.floor(Math.random() * headlines.length)];
        if (highestMultiplier >= 1.8) {
            selectedHeadline = {
                title: `📰 Massive Spike: ${cropMarketData[highestCropKey].name} Demand Skyrockets!`,
                summary: `Traders are paying top dollar for ${cropMarketData[highestCropKey].name} today. Capitalize on the surge while it lasts!`
            };
        }

        document.getElementById("paper-day-label").innerText = `DAY ${gameState.day} - MARKET EDITION`;
        document.getElementById("newspaper-headline").innerText = selectedHeadline.title;
        document.getElementById("newspaper-summary").innerText = selectedHeadline.summary;

        let weatherText = gameState.tomorrowWeather === 'rainy' 
            ? "🌧️ Rain Expected Tomorrow - Save Your Energy!" 
            : "☀️ Clear Skies Tomorrow - Plan for watering!";
        document.getElementById("newspaper-weather").innerText = weatherText;
        renderBounty();

        renderTickerItems(highestCropKey);
        document.getElementById("newspaper-modal").style.display = "flex";
    }

    function renderBounty() {
        const b = gameState.bounty;
        const container = document.getElementById("newspaper-bounty");
        if (b.fulfilled) {
            container.innerHTML = `<span class="bounty-title">📅 Daily Town Classifieds</span>
                                   <p style="margin:4px 0 0 0;">✅ Today's bounty has been fulfilled! Check back tomorrow.</p>`;
        } else {
            const cName = cropMarketData[b.crop].name;
            container.innerHTML = `
                <span class="bounty-title">📅 Daily Town Classifieds</span>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <span style="display:block;"><strong>Request:</strong> ${b.amount} ${cName}</span>
                    <span style="display:block;"><strong>Reward:</strong> ${b.multiplier}x Payout</span>
                  </div>
                  <button class="btn-sm btn-sell-action" style="font-size:0.75rem; padding:6px 10px;" onclick="completeBounty()">Complete Bounty</button>
                </div>
            `;
        }
    }

    function completeBounty() {
        initAudio();
        const b = gameState.bounty;
        let available = gameState.inventory[b.crop] + (gameState.hasCellar ? gameState.cellar[b.crop] : 0);
        
        if (available >= b.amount) {
            let remaining = b.amount;
            if (gameState.inventory[b.crop] >= remaining) {
                gameState.inventory[b.crop] -= remaining;
            } else {
                remaining -= gameState.inventory[b.crop];
                gameState.inventory[b.crop] = 0;
                gameState.cellar[b.crop] -= remaining;
            }
            
            let payout = Math.round(cropMarketData[b.crop].basePrice * b.multiplier * b.amount);
            gameState.coins += payout;
            gameState.bounty.fulfilled = true;
            
            playSFX('sell');
            updateUI();
            saveGame();
            renderBounty();
        } else {
            playSFX('error');
        }
    }

    function renderTickerItems(highestCropKey) {
        const container = document.getElementById("ticker-items-container");
        container.innerHTML = "";

        for (let key in cropMarketData) {
            let crop = cropMarketData[key];
            let finalPrice = Math.round(crop.basePrice * crop.currentMultiplier);
            let trendArrow = "−";
            let rateClass = "rate-steady";
            
            if (crop.currentMultiplier > crop.previousMultiplier) { trendArrow = "↑"; rateClass = "rate-up"; }
            else if (crop.currentMultiplier < crop.previousMultiplier) { trendArrow = "↓"; rateClass = "rate-down"; }

            let symbol = crop.currentMultiplier >= 1.0 ? "+" : "";
            let hotBadge = (key === highestCropKey) ? `<span class="hot-badge">🔥 HOT BUY</span>` : "";

            let itemHTML = `
                <div class="ticker-item">
                    <div class="ticker-info">
                        <span class="crop-name">${crop.name} ${hotBadge}</span>
                        <span class="crop-base">Base: ${crop.basePrice}c</span>
                    </div>
                    <div class="ticker-actions">
                        <div class="ticker-rate ${rateClass}">
                            ${finalPrice}c <span style="font-size:0.75rem; color:#475569;">(${symbol}${Math.round((crop.currentMultiplier - 1) * 100)}%) ${trendArrow}</span>
                        </div>
                        <button class="btn-sm btn-sell-action" style="width:100%; margin-top:2px;" onclick="quickSell('${key}')">Sell Stock</button>
                    </div>
                </div>
            `;
            container.innerHTML += itemHTML;
        }
    }

    function quickSell(key) {
        initAudio();
        let count = gameState.inventory[key];
        if (gameState.hasCellar && gameState.cellar[key]) count += gameState.cellar[key];
        
        if (count > 0) {
            let earned = sellCrop(key, count);
            gameState.inventory[key] = 0;
            if (gameState.hasCellar) gameState.cellar[key] = 0;
            gameState.coins += earned;
            playSFX('sell');
            updateUI();
            saveGame();
            renderBounty();
        } else {
            playSFX('error');
        }
    }

    function sellCrop(cropKey, quantity) {
        let crop = cropMarketData[cropKey];
        if (!crop) return 0;
        return Math.round(crop.basePrice * crop.currentMultiplier * quantity);
    }

    let MAX_ENERGY = 80;
    let gameState = {
      coins: 40, 
      day: 1, 
      time: 360, 
      energy: MAX_ENERGY,
      energyUpgrades: 0,
      weather: 'sunny', 
      tomorrowWeather: Math.random() < 0.3 ? 'rainy' : 'sunny',
      unlockedCols: 5,
      playerSpeed: 2,
      toolTierLevel: 1, 
      toolTier: { pickaxe: 1, axe: 1 },
      seeds: { carrot: 5, wheat: 3, corn: 0, pumpkin: 0, magic: 0 },
      inventory: { carrot: 0, wheat: 0, corn: 0, pumpkin: 0, magic: 0 },
      foodInventory: { bread: 0, stew: 0 },
      cellar: { carrot: 0, wheat: 0, corn: 0, pumpkin: 0, magic: 0 },
      hasCellar: false,
      hasStove: false,
      bounty: null,
      grid: []
    };

    let selectedTool = 'hoe', selectedSeed = 'carrot';

    let player = {
      r: 1, c: 1, px: 1 * TILE, py: 1 * TILE, targetR: 1, targetC: 1,
      isMoving: false, actionQueue: [], facing: 'down', actionTimer: 0, activeToolType: 'hoe'
    };

    const canvas = document.getElementById('farmCanvas');
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    let audioCtx = null;
    function initAudio() {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    }

    function playSFX(type) {
      if (!audioCtx) return;
      const t = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      if (type === 'till') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(160, t); osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
        gain.gain.setValueAtTime(0.3, t); gain.gain.linearRampToValueAtTime(0.01, t + 0.12);
      } else if (type === 'plant') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(450, t); osc.frequency.exponentialRampToValueAtTime(900, t + 0.08);
        gain.gain.setValueAtTime(0.2, t); gain.gain.linearRampToValueAtTime(0.01, t + 0.08);
      } else if (type === 'water') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(650, t); osc.frequency.linearRampToValueAtTime(320, t + 0.15);
        gain.gain.setValueAtTime(0.3, t); gain.gain.linearRampToValueAtTime(0.01, t + 0.15);
      } else if (type === 'sell') {
        osc.type = 'triangle'; 
        osc.frequency.setValueAtTime(523.25, t); 
        osc.frequency.setValueAtTime(659.25, t + 0.1); 
        osc.frequency.setValueAtTime(783.99, t + 0.2);
        gain.gain.setValueAtTime(0.4, t); gain.gain.linearRampToValueAtTime(0.01, t + 0.4);
      } else if (type === 'harvest') {
        osc.type = 'square'; osc.frequency.setValueAtTime(700, t); osc.frequency.setValueAtTime(1050, t + 0.08);
        gain.gain.setValueAtTime(0.15, t); gain.gain.linearRampToValueAtTime(0.01, t + 0.25);
      } else if (type === 'error') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, t); osc.frequency.linearRampToValueAtTime(100, t + 0.2);
        gain.gain.setValueAtTime(0.3, t); gain.gain.linearRampToValueAtTime(0.01, t + 0.2);
      } else if (type === 'eat') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(300, t); osc.frequency.exponentialRampToValueAtTime(600, t + 0.2);
        gain.gain.setValueAtTime(0.25, t); gain.gain.linearRampToValueAtTime(0.01, t + 0.2);
      } else if (type === 'night') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(261.63, t); osc.frequency.setValueAtTime(329.63, t+0.1); osc.frequency.setValueAtTime(392.00, t+0.2);
        gain.gain.setValueAtTime(0.3, t); gain.gain.linearRampToValueAtTime(0.01, t + 0.6);
      }
      
      osc.connect(gain); gain.connect(audioCtx.destination); osc.start(t);
      if (type === 'night') osc.stop(t + 0.6); 
      else if (type === 'sell') osc.stop(t + 0.4); 
      else if (type === 'harvest') osc.stop(t + 0.25); 
      else osc.stop(t + 0.2);
    }

    function initGrid() {
      let oldGrid = gameState.grid;
      gameState.grid = [];
      
      for (let r = 0; r < ROWS; r++) {
        gameState.grid[r] = [];
        for (let c = 0; c < MAX_COLS; c++) {
          let existingCrop = null;
          let existingState = 'grass';
          let existingTimer = 0;
          let isNewlyUnlocked = false;
          
          if (oldGrid[r] && oldGrid[r][c]) {
            if (oldGrid[r][c].state && oldGrid[r][c].state !== 'hidden') {
              existingState = oldGrid[r][c].state;
            } else if (oldGrid[r][c].state === 'hidden') {
              isNewlyUnlocked = true;
            }
            if (oldGrid[r][c].crop) {
              let oldCrop = oldGrid[r][c].crop;
              let prog = oldCrop.progress !== undefined ? oldCrop.progress : (oldCrop.daysGrown ? oldCrop.daysGrown * 40 : 0);
              existingCrop = { type: oldCrop.type, stage: oldCrop.stage, progress: prog, perishTimer: oldCrop.perishTimer || 0 };
            }
            if (oldGrid[r][c].perishTimer !== undefined) existingTimer = oldGrid[r][c].perishTimer;
          } else {
            isNewlyUnlocked = true;
          }

          if (r === 0 && (c === 0 || c === 1)) {
            gameState.grid[r][c] = { state: 'house', crop: null, perishTimer: 0 };
          } else if (c < gameState.unlockedCols) {
            if (isNewlyUnlocked || existingState === 'hidden') {
              const rand = Math.random();
              if (c < 6) {
                if (rand < 0.35) existingState = 'grass';
                else if (rand < 0.55) existingState = 'rock';
                else if (rand < 0.75) existingState = 'log';
                else existingState = 'weed';
              } else if (c < 10) {
                if (rand < 0.25) existingState = 'grass';
                else if (rand < 0.45) existingState = 'heavy_rock';
                else if (rand < 0.65) existingState = 'heavy_log';
                else if (rand < 0.80) existingState = 'rock';
                else existingState = 'weed';
              } else {
                if (rand < 0.20) existingState = 'grass';
                else if (rand < 0.45) existingState = 'boulder';
                else if (rand < 0.70) existingState = 'stump';
                else if (rand < 0.85) existingState = 'heavy_rock';
                else existingState = 'weed';
              }
            }
            gameState.grid[r][c] = { state: existingState, crop: existingCrop, perishTimer: existingTimer };
          } else {
            gameState.grid[r][c] = { state: 'hidden', crop: null, perishTimer: 0 };
          }
        }
      }
      canvas.width = gameState.unlockedCols * TILE;
      canvas.height = ROWS * TILE;
    }

    function saveGame() { localStorage.setItem(SAVE_KEY, JSON.stringify(gameState)); }

    function loadGame() {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) { 
        try { gameState = { ...gameState, ...JSON.parse(raw) }; } catch(e) {} 
      }
      if (gameState.unlockedCols === undefined) gameState.unlockedCols = 5;
      if (gameState.playerSpeed === undefined) gameState.playerSpeed = 2;
      if (gameState.toolTierLevel === undefined) gameState.toolTierLevel = 1;
      if (gameState.toolTier === undefined) gameState.toolTier = { pickaxe: 1, axe: 1 };
      if (gameState.seeds === undefined) gameState.seeds = { carrot: 5, wheat: 3, corn: 0, pumpkin: 0, magic: 0 };
      if (gameState.hasCellar === undefined) gameState.hasCellar = false;
      if (gameState.hasStove === undefined) gameState.hasStove = false;
      if (gameState.foodInventory === undefined) gameState.foodInventory = { bread: 0, stew: 0 };
      if (gameState.cellar === undefined) gameState.cellar = { carrot: 0, wheat: 0, corn: 0, pumpkin: 0, magic: 0 };
      if (gameState.tomorrowWeather === undefined) gameState.tomorrowWeather = Math.random() < 0.3 ? 'rainy' : 'sunny';
      if (gameState.bounty === undefined || !gameState.bounty) gameState.bounty = generateBounty();
      if (gameState.energyUpgrades === undefined) gameState.energyUpgrades = 0;

      MAX_ENERGY = 80 + (gameState.energyUpgrades * 20);

      initGrid();
      updateUI();
    }

    function resetGame() {
      if (confirm("Reset garden progress?")) {
        localStorage.removeItem(SAVE_KEY);
        MAX_ENERGY = 80;
        gameState = { 
            coins: 40, day: 1, time: 360, energy: MAX_ENERGY, energyUpgrades: 0,
            weather: 'sunny', tomorrowWeather: Math.random() < 0.3 ? 'rainy' : 'sunny',
            unlockedCols: 5, playerSpeed: 2, toolTierLevel: 1, 
            toolTier: { pickaxe: 1, axe: 1 }, seeds: { carrot: 5, wheat: 3, corn: 0, pumpkin: 0, magic: 0 }, 
            inventory: { carrot: 0, wheat: 0, corn: 0, pumpkin: 0, magic: 0 }, 
            foodInventory: { bread: 0, stew: 0 },
            cellar: { carrot: 0, wheat: 0, corn: 0, pumpkin: 0, magic: 0 }, 
            hasCellar: false, hasStove: false, bounty: generateBounty(), grid: [] 
        };
        player.r = 1; player.c = 1; player.px = 1*TILE; player.py = 1*TILE; player.actionQueue = [];
        loadGame();
      }
    }

    // Main Game Tick Loop
    setInterval(() => {
      if(gameState.time < 1440) {
        gameState.time += 4; 

        // Rest near house slowly regenerates energy up to a cap of 30% to prevent endless resting exploit
        const restCap = Math.floor(MAX_ENERGY * 0.30);
        if (!player.isMoving && player.c <= 2 && player.r <= 1 && gameState.energy < restCap) {
          gameState.energy = Math.min(restCap, gameState.energy + 1);
          updateUI();
        }

        for(let r = 0; r < ROWS; r++) {
          for(let c = 0; c < gameState.unlockedCols; c++) {
            const tile = gameState.grid[r][c];
            if(tile.crop) {
              if (tile.crop.stage < 2) {
                const isWatered = (tile.state === 'watered' || gameState.weather === 'rainy');
                const growthIncrement = isWatered ? 5.5 : 1.0;
                tile.crop.progress += growthIncrement;
                const maxProg = CROPS[tile.crop.type].maxProgress;
                
                if(tile.crop.progress >= maxProg) {
                  tile.crop.progress = maxProg;
                  tile.crop.stage = 2;
                } else if(tile.crop.progress >= maxProg / 2) {
                  tile.crop.stage = 1;
                }
              } else if (tile.crop.stage === 2) {
                tile.crop.perishTimer = (tile.crop.perishTimer || 0) + 1;
                const maxPerish = CROPS[tile.crop.type].perishTime;
                if (tile.crop.perishTimer >= maxPerish) {
                  tile.crop = null;
                  tile.state = 'withered';
                }
              }
            }
          }
        }

        updateUI(); 
        
        if(gameState.time >= 1440) {
          advanceDay();
        } 
      }
    }, 1000);

    function formatTime(mins) {
      let h = Math.floor(mins / 60), m = mins % 60, ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12; if(h === 0) h = 12;
      return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')} ${ampm}`;
    }

    function consumeCrop(type) {
      initAudio();
      if (gameState.inventory[type] > 0) {
        gameState.inventory[type]--;
        const restoreValues = { carrot: 15, wheat: 25, corn: 40, pumpkin: 60, magic: 100 };
        const restore = restoreValues[type] || 20;
        gameState.energy = Math.min(MAX_ENERGY, gameState.energy + restore);
        playSFX('eat');
        updateUI();
        saveGame();
        renderBagTabContents();
      } else {
        playSFX('error');
      }
    }

    function consumeFood(type) {
      initAudio();
      if (gameState.foodInventory[type] > 0) {
        gameState.foodInventory[type]--;
        const restoreValues = { bread: 50, stew: 180 };
        const restore = restoreValues[type] || 50;
        gameState.energy = Math.min(MAX_ENERGY, gameState.energy + restore);
        playSFX('eat');
        updateUI();
        saveGame();
        renderBagTabContents();
      } else {
        playSFX('error');
      }
    }

    function advanceDay() {
      initAudio(); playSFX('night');
      let activeCrops = 0;
      
      for(let r=0; r<ROWS; r++){
        for(let c=0; c<gameState.unlockedCols; c++){
          const tile = gameState.grid[r][c];
          if(tile.crop) {
            activeCrops++;
            if (tile.crop.stage < 2) {
              const isWatered = (tile.state === 'watered' || gameState.weather === 'rainy');
              const nightGrowth = isWatered ? 35 : 6;
              tile.crop.progress += nightGrowth;
              
              const maxProg = CROPS[tile.crop.type].maxProgress;
              if(tile.crop.progress >= maxProg) {
                tile.crop.progress = maxProg;
                tile.crop.stage = 2;
              } else if(tile.crop.progress >= maxProg / 2) {
                tile.crop.stage = 1;
              }
            } else if (tile.crop.stage === 2) {
              tile.crop.perishTimer = (tile.crop.perishTimer || 0) + 60;
              const maxPerish = CROPS[tile.crop.type].perishTime;
              if (tile.crop.perishTimer >= maxPerish) {
                tile.crop = null;
                tile.state = 'withered';
              }
            }
          }
        }
      }
      
      let totalInv = Object.values(gameState.inventory).reduce((a, b) => a + b, 0);
      if (gameState.coins < 1 && activeCrops === 0 && totalInv === 0) { gameState.coins += 5; }

      gameState.day++;
      gameState.time = 360; 
      
      gameState.weather = gameState.tomorrowWeather;
      gameState.tomorrowWeather = Math.random() < 0.3 ? 'rainy' : 'sunny';
      gameState.bounty = generateBounty();
      
      for(let r=0; r<ROWS; r++){
        for(let c=0; c<gameState.unlockedCols; c++){
          const tile = gameState.grid[r][c];
          if(tile.state === 'watered' && gameState.weather !== 'rainy') tile.state = 'tilled';
          else if(tile.state === 'tilled' && gameState.weather === 'rainy') tile.state = 'watered';
        }
      }
      
      player.actionQueue = [];
      saveGame(); updateUI();
      startNewMarketDay();
    }

    function useEnergy(amount) {
      if (gameState.energy >= amount) { gameState.energy -= amount; updateUI(); return true; }
      const eBar = document.getElementById('energy-container');
      eBar.classList.remove('flash-red'); void eBar.offsetWidth; eBar.classList.add('flash-red');
      playSFX('error'); return false;
    }

    const toolButtons = document.querySelectorAll('.tool-btn');
    const seedButtons = document.querySelectorAll('.seed-btn');
    const seedSelector = document.getElementById('seed-selector');
    const shopModal = document.getElementById('shop-modal');
    const bagModal = document.getElementById('bag-modal');

    function openShopModal() {
      initAudio();
      shopModal.style.display = 'flex';
    }

    function closeShopModal() {
      shopModal.style.display = 'none';
      toolButtons.forEach(b => b.classList.remove('active'));
      const activeBtn = document.querySelector(`.tool-btn[data-tool="${selectedTool === 'shop' ? 'hoe' : selectedTool}"]`);
      if (activeBtn) activeBtn.classList.add('active');
      if (selectedTool === 'shop') selectedTool = 'hoe';
    }

    function openBagModal() {
      initAudio();
      renderBagTabContents();
      bagModal.style.display = 'flex';
    }

    function closeBagModal() {
      bagModal.style.display = 'none';
    }

    function switchBagTab(tab) {
      initAudio();
      document.getElementById('bag-tab-seeds').style.display = tab === 'seeds' ? 'grid' : 'none';
      document.getElementById('bag-tab-crops').style.display = tab === 'crops' ? 'grid' : 'none';
      document.getElementById('bag-tab-tools').style.display = tab === 'tools' ? 'grid' : 'none';
      document.getElementById('bag-tab-cellar').style.display = tab === 'cellar' ? 'grid' : 'none';

      document.getElementById('bag-nav-seeds').classList.toggle('active', tab === 'seeds');
      document.getElementById('bag-nav-crops').classList.toggle('active', tab === 'crops');
      document.getElementById('bag-nav-tools').classList.toggle('active', tab === 'tools');
      document.getElementById('bag-nav-cellar').classList.toggle('active', tab === 'cellar');
    }

    function renderBagTabContents() {
      // 1. Seeds Tab
      const seedsContainer = document.getElementById('bag-tab-seeds');
      seedsContainer.innerHTML = '';
      for (let sKey in CROPS) {
        const count = gameState.seeds[sKey] || 0;
        const crop = CROPS[sKey];
        seedsContainer.innerHTML += `
          <div class="shop-card">
            <div class="shop-card-info">
              <div class="shop-icon-box">${crop.icon}</div>
              <div class="shop-text">
                <span class="shop-item-name">${sKey.toUpperCase()} Seeds</span>
                <span class="shop-item-desc">Bag Inventory: ${count}</span>
              </div>
            </div>
            <button class="shop-action-btn" style="background: linear-gradient(180deg, #0284c7, #0369a1); box-shadow: 0 2px 0 #03588c;" onclick="bagSelectSeed('${sKey}')">
              <span>EQUIP SEED</span>
              <span>Select</span>
            </button>
          </div>
        `;
      }

      // 2. Crops & Food Tab
      const cropsContainer = document.getElementById('bag-tab-crops');
      cropsContainer.innerHTML = '';
      for (let cKey in CROPS) {
        const count = gameState.inventory[cKey] || 0;
        const crop = CROPS[cKey];
        const restoreVals = { carrot: 15, wheat: 25, corn: 40, pumpkin: 60, magic: 100 };
        cropsContainer.innerHTML += `
          <div class="shop-card">
            <div class="shop-card-info">
              <div class="shop-icon-box">${crop.icon}</div>
              <div class="shop-text">
                <span class="shop-item-name">${cropMarketData[cKey].name}</span>
                <span class="shop-item-desc">Bag Qty: ${count} | Restores +${restoreVals[cKey]}⚡</span>
              </div>
            </div>
            <div style="display:flex; gap:6px;">
              <button class="shop-action-btn" style="flex:1; background:linear-gradient(180deg, #16a34a, #15803d);" onclick="consumeCrop('${cKey}')">Eat (+${restoreVals[cKey]}⚡)</button>
              <button class="shop-action-btn" style="flex:1; background:linear-gradient(180deg, #ca8a04, #a16207);" onclick="quickSell('${cKey}')">Sell</button>
            </div>
          </div>
        `;
      }

      // Add Bread & Stew
      const foodEntries = [
        { key: 'bread', name: 'Bread', icon: '🍞', restore: 50 },
        { key: 'stew', name: 'Hearty Stew', icon: '🍲', restore: 180 }
      ];
      foodEntries.forEach(f => {
        const fCount = gameState.foodInventory[f.key] || 0;
        cropsContainer.innerHTML += `
          <div class="shop-card">
            <div class="shop-card-info">
              <div class="shop-icon-box">${f.icon}</div>
              <div class="shop-text">
                <span class="shop-item-name">${f.name}</span>
                <span class="shop-item-desc">Bag Qty: ${fCount} | Restores +${f.restore}⚡</span>
              </div>
            </div>
            <button class="shop-action-btn" style="background:linear-gradient(180deg, #16a34a, #15803d);" onclick="consumeFood('${f.key}')">Eat / Use (+${f.restore}⚡)</button>
          </div>
        `;
      });

      // 3. Tools Tab
      const toolsContainer = document.getElementById('bag-tab-tools');
      const toolList = [
        { key: 'hoe', name: 'Hoe (Till)', icon: '⛏️', desc: 'Prepares soil for planting.' },
        { key: 'seed', name: 'Seed Bag', icon: '🌱', desc: 'Plants active equipped seed.' },
        { key: 'water', name: 'Watering Can', icon: '💧', desc: 'Waters tilled soil.' },
        { key: 'harvest', name: 'Harvest Basket', icon: '🧺', desc: 'Collects mature crops.' }
      ];
      toolsContainer.innerHTML = '';
      toolList.forEach(t => {
        toolsContainer.innerHTML += `
          <div class="shop-card">
            <div class="shop-card-info">
              <div class="shop-icon-box">${t.icon}</div>
              <div class="shop-text">
                <span class="shop-item-name">${t.name}</span>
                <span class="shop-item-desc">${t.desc}</span>
              </div>
            </div>
            <button class="shop-action-btn" style="background: linear-gradient(180deg, #0284c7, #0369a1); box-shadow: 0 2px 0 #03588c;" onclick="bagEquipTool('${t.key}')">Equip Tool</button>
          </div>
        `;
      });

      // 4. Cellar Tab
      const cellarContainer = document.getElementById('bag-tab-cellar');
      cellarContainer.innerHTML = '';
      if (!gameState.hasCellar) {
        cellarContainer.innerHTML = `
          <div class="shop-card" style="grid-column: 1 / -1; text-align:center; padding:20px;">
            <div style="font-size:32px; margin-bottom:8px;">🏚️</div>
            <span class="shop-item-name" style="font-size:1rem;">Root Cellar Not Purchased</span>
            <span class="shop-item-desc" style="margin-top:4px;">Visit the General Store to purchase the Root Cellar for long-term secure crop storage.</span>
          </div>
        `;
      } else {
        for (let cKey in CROPS) {
          const cellarCount = gameState.cellar[cKey] || 0;
          const crop = CROPS[cKey];
          cellarContainer.innerHTML += `
            <div class="shop-card">
              <div class="shop-card-info">
                <div class="shop-icon-box">${crop.icon}</div>
                <div class="shop-text">
                  <span class="shop-item-name">${cropMarketData[cKey].name} (Cellar)</span>
                  <span class="shop-item-desc">Stored: ${cellarCount} items</span>
                </div>
              </div>
              <button class="shop-action-btn" style="background:linear-gradient(180deg, #ca8a04, #a16207);" onclick="quickSell('${cKey}')">Sell from Cellar</button>
            </div>
          `;
        }
      }
    }

    function bagSelectSeed(sKey) {
      initAudio();
      selectedSeed = sKey;
      selectedTool = 'seed';
      seedButtons.forEach(b => b.classList.toggle('active', b.dataset.seed === sKey));
      toolButtons.forEach(b => b.classList.toggle('active', b.dataset.tool === 'seed'));
      seedSelector.classList.add('visible');
      updateUI();
      closeBagModal();
    }

    function bagEquipTool(tKey) {
      initAudio();
      selectedTool = tKey;
      toolButtons.forEach(b => b.classList.toggle('active', b.dataset.tool === tKey));
      seedSelector.classList.toggle('visible', tKey === 'seed');
      updateUI();
      closeBagModal();
    }

    toolButtons.forEach(btn => {
      const selectTool = (e) => {
        e.preventDefault(); 
        const tool = btn.dataset.tool;
        
        if (tool === 'sell') { sellAllCrops(); return; }
        if (tool === 'shop') { openShopModal(); return; }
        
        initAudio(); 
        toolButtons.forEach(b => { if (b.dataset.tool !== 'sell' && b.dataset.tool !== 'shop') b.classList.remove('active'); });
        btn.classList.add('active');
        
        selectedTool = tool; 
        seedSelector.classList.toggle('visible', selectedTool === 'seed');
      };
      btn.addEventListener('touchstart', selectTool, {passive: false}); 
      btn.addEventListener('click', selectTool);
    });

    function sellAllCrops() {
      initAudio();
      let earned = 0, soldAny = false;
      for (let key in gameState.inventory) {
        let count = gameState.inventory[key];
        if (count > 0) { earned += sellCrop(key, count); gameState.inventory[key] = 0; soldAny = true; }
      }
      if (gameState.hasCellar) {
        for (let key in gameState.cellar) {
          let count = gameState.cellar[key];
          if (count > 0) { earned += sellCrop(key, count); gameState.cellar[key] = 0; soldAny = true; }
        }
      }
      if (soldAny) { 
        gameState.coins += earned; playSFX('sell'); updateUI(); saveGame(); 
        if (document.getElementById("newspaper-modal").style.display !== "none") renderBounty();
      }
      else { playSFX('error'); }
    }

    function getNextColumnCost() {
      if (gameState.unlockedCols >= MAX_COLS) return null;
      return Math.round(100 * Math.pow(1.45, gameState.unlockedCols - 5));
    }
    
    function getEnergyUpgradeCost() {
      return Math.round(15 * Math.pow(2.38, gameState.energyUpgrades)); 
    }

    function getPickaxeCost() { const costs = [50, 100, 200]; return costs[gameState.toolTier.pickaxe - 1] || null; }
    function getAxeCost() { const costs = [45, 90, 180]; return costs[gameState.toolTier.axe - 1] || null; }
    
    const TOOL_TIER_COSTS = [60, 150, 350];
    function getToolTierCost() {
      if (gameState.toolTierLevel >= 4) return null;
      return TOOL_TIER_COSTS[gameState.toolTierLevel - 1];
    }

    function buyUpgrade(type) {
      initAudio();
      if (type === 'tools') {
        const cost = getToolTierCost();
        if (cost !== null && gameState.coins >= cost && gameState.toolTierLevel < 4) {
          gameState.coins -= cost;
          gameState.toolTierLevel++;
          playSFX('sell'); updateUI(); saveGame();
        } else { playSFX('error'); }
      } else if (type === 'energy') {
        const cost = getEnergyUpgradeCost();
        if (gameState.coins >= cost) {
          gameState.coins -= cost; 
          gameState.energyUpgrades++;
          MAX_ENERGY = 80 + (gameState.energyUpgrades * 20);
          gameState.energy = MAX_ENERGY;
          playSFX('sell'); updateUI(); saveGame();
        } else { playSFX('error'); }
      } else if (type === 'speed' && gameState.coins >= 25) {
        gameState.coins -= 25; gameState.playerSpeed += 1;
        playSFX('sell'); updateUI(); saveGame();
      } else if (type === 'pickaxe') {
        const cost = getPickaxeCost();
        if (cost !== null && gameState.coins >= cost && gameState.toolTier.pickaxe < 3) {
          gameState.coins -= cost; gameState.toolTier.pickaxe++;
          playSFX('sell'); updateUI(); saveGame();
        } else { playSFX('error'); }
      } else if (type === 'axe') {
        const cost = getAxeCost();
        if (cost !== null && gameState.coins >= cost && gameState.toolTier.axe < 3) {
          gameState.coins -= cost; gameState.toolTier.axe++;
          playSFX('sell'); updateUI(); saveGame();
        } else { playSFX('error'); }
      } else if (type === 'cellar') {
        if (gameState.hasCellar) { playSFX('error'); return; }
        if (gameState.coins >= 100) {
          gameState.coins -= 100;
          gameState.hasCellar = true;
          playSFX('sell'); updateUI(); saveGame();
        } else { playSFX('error'); }
      } else if (type === 'stove') {
        if (gameState.hasStove) { playSFX('error'); return; }
        if (gameState.coins >= 500) {
          gameState.coins -= 500;
          gameState.hasStove = true;
          playSFX('sell'); updateUI(); saveGame();
        } else { playSFX('error'); }
      } else if (type === 'land') {
        if (gameState.unlockedCols >= MAX_COLS) { playSFX('error'); return; }
        const cost = getNextColumnCost();
        if (gameState.coins >= cost) {
          gameState.coins -= cost; gameState.unlockedCols++;
          initGrid(); playSFX('sell'); updateUI(); saveGame();
        } else { playSFX('error'); }
      } else { playSFX('error'); }
    }

    function buyFoodItem(foodKey, cost, restoreVal) {
      initAudio();
      if (gameState.coins >= cost) {
        gameState.coins -= cost;
        gameState.foodInventory[foodKey]++;
        playSFX('sell');
        updateUI();
        saveGame();
      } else {
        playSFX('error');
      }
    }

    function cookMeal() {
      initAudio();
      if (!gameState.hasStove) {
        playSFX('error');
        return;
      }
      let availableCarrots = gameState.inventory.carrot + (gameState.hasCellar ? gameState.cellar.carrot : 0);
      let availableWheat = gameState.inventory.wheat + (gameState.hasCellar ? gameState.cellar.wheat : 0);

      if (availableCarrots >= 3 && availableWheat >= 2) {
        let deductCarrots = 3;
        if (gameState.inventory.carrot >= deductCarrots) {
          gameState.inventory.carrot -= deductCarrots;
        } else {
          deductCarrots -= gameState.inventory.carrot;
          gameState.inventory.carrot = 0;
          gameState.cellar.carrot -= deductCarrots;
        }

        let deductWheat = 2;
        if (gameState.inventory.wheat >= deductWheat) {
          gameState.inventory.wheat -= deductWheat;
        } else {
          deductWheat -= gameState.inventory.wheat;
          gameState.inventory.wheat = 0;
          gameState.cellar.wheat -= deductWheat;
        }

        gameState.foodInventory.stew++;
        playSFX('sell');
        updateUI();
        saveGame();
      } else {
        playSFX('error');
      }
    }

    function switchShopTab(tab) {
      initAudio();
      document.getElementById('shop-tab-tools').style.display = tab === 'tools' ? 'grid' : 'none';
      document.getElementById('shop-tab-seeds').style.display = tab === 'seeds' ? 'grid' : 'none';
      document.getElementById('shop-tab-kitchen').style.display = tab === 'kitchen' ? 'grid' : 'none';
      
      document.getElementById('nav-btn-tools').classList.toggle('active', tab === 'tools');
      document.getElementById('nav-btn-seeds').classList.toggle('active', tab === 'seeds');
      document.getElementById('nav-btn-kitchen').classList.toggle('active', tab === 'kitchen');
    }

    function buySeedStock(type) {
      initAudio();
      const stockCosts = { carrot: 5, wheat: 8, corn: 15, pumpkin: 25, magic: 50 };
      const stockAmounts = { carrot: 10, wheat: 5, corn: 5, pumpkin: 3, magic: 1 };
      
      if (gameState.coins >= stockCosts[type]) {
        gameState.coins -= stockCosts[type];
        gameState.seeds[type] = (gameState.seeds[type] || 0) + stockAmounts[type];
        playSFX('sell');
        updateUI();
        saveGame();
      } else {
        playSFX('error');
      }
    }

    function updateUI() {
      document.getElementById('coin-count').textContent = gameState.coins;
      const shopCoin = document.getElementById('shop-coin-count');
      if (shopCoin) shopCoin.textContent = gameState.coins;
      document.getElementById('day-count').textContent = gameState.day;
      document.getElementById('time-display').textContent = formatTime(gameState.time);
      document.getElementById('weather-icon').textContent = gameState.weather === 'rainy' ? '🌧️' : '☀️';

      for (let cropKey in CROPS) {
        const stockEl = document.getElementById(`stock-${cropKey}`);
        const btnEl = document.getElementById(`btn-seed-${cropKey}`);
        if (stockEl) {
          const currentStock = gameState.seeds[cropKey] || 0;
          stockEl.textContent = currentStock;
          if (btnEl) btnEl.classList.toggle('out-of-stock', currentStock <= 0);
        }
      }

      const eBar = document.getElementById('energy-bar'); const ePercent = (gameState.energy / MAX_ENERGY) * 100;
      eBar.style.width = `${ePercent}%`;
      eBar.style.background = ePercent > 50 ? '#22c55e' : ePercent > 20 ? '#eab308' : '#ef4444';

      const cropInfo = CROPS[selectedSeed];
      const curStock = gameState.seeds[selectedSeed] || 0;
      const seedLabel = document.getElementById('seed-label');
      if (seedLabel) seedLabel.textContent = `${cropInfo.icon} PLANT (${curStock})`;

      // Shop UI Updates
      const landCost = getNextColumnCost();
      const shopLandPriceEl = document.getElementById('shop-land-price');
      const btnBuyLand = document.getElementById('btn-buy-land');
      if (shopLandPriceEl && btnBuyLand) {
        if (landCost !== null) {
          shopLandPriceEl.textContent = `$${landCost}`;
          btnBuyLand.disabled = gameState.coins < landCost;
        } else {
          shopLandPriceEl.textContent = 'MAX';
          btnBuyLand.disabled = true;
        }
      }

      const shopToolTierName = document.getElementById('shop-tool-tier-name');
      const shopToolTierPrice = document.getElementById('shop-tool-tier-price');
      const btnBuyTools = document.getElementById('btn-buy-tools');
      if (shopToolTierName && shopToolTierPrice && btnBuyTools) {
        const nextTierNames = ['Copper', 'Iron', 'Gold', 'MAX'];
        shopToolTierName.textContent = nextTierNames[gameState.toolTierLevel - 1] || 'MAX';
        const cost = getToolTierCost();
        if (cost !== null) {
          shopToolTierPrice.textContent = `$${cost}`;
          btnBuyTools.disabled = gameState.coins < cost;
        } else {
          shopToolTierPrice.textContent = 'MAX';
          btnBuyTools.disabled = true;
        }
      }

      const pickCost = getPickaxeCost();
      const btnBuyPick = document.getElementById('btn-buy-pickaxe');
      const pickTier = document.getElementById('shop-pick-tier');
      if (pickTier) pickTier.textContent = gameState.toolTier.pickaxe;
      const shopPickPrice = document.getElementById('shop-pick-price');
      if (shopPickPrice && btnBuyPick) {
        if (pickCost !== null) {
          shopPickPrice.textContent = `$${pickCost}`;
          btnBuyPick.disabled = gameState.coins < pickCost;
        } else {
          shopPickPrice.textContent = 'MAX';
          btnBuyPick.disabled = true;
        }
      }

      const axeCost = getAxeCost();
      const btnBuyAxe = document.getElementById('btn-buy-axe');
      const axeTier = document.getElementById('shop-axe-tier');
      if (axeTier) axeTier.textContent = gameState.toolTier.axe;
      const shopAxePrice = document.getElementById('shop-axe-price');
      if (shopAxePrice && btnBuyAxe) {
        if (axeCost !== null) {
          shopAxePrice.textContent = `$${axeCost}`;
          btnBuyAxe.disabled = gameState.coins < axeCost;
        } else {
          shopAxePrice.textContent = 'MAX';
          btnBuyAxe.disabled = true;
        }
      }

      const energyCost = getEnergyUpgradeCost();
      const btnBuyEnergy = document.getElementById('btn-buy-energy');
      const shopEnergyPrice = document.getElementById('shop-energy-price');
      if (shopEnergyPrice && btnBuyEnergy) {
        shopEnergyPrice.textContent = `$${energyCost}`;
        btnBuyEnergy.disabled = gameState.coins < energyCost;
      }

      const btnBuySpeed = document.getElementById('btn-buy-speed');
      if (btnBuySpeed) btnBuySpeed.disabled = gameState.coins < 25;

      const cellarEl = document.getElementById('cellar-indicator');
      const btnBuyCellar = document.getElementById('btn-buy-cellar');
      const shopCellarPrice = document.getElementById('shop-cellar-price');
      if (gameState.hasCellar) {
        cellarEl.style.display = 'inline';
        if (btnBuyCellar && shopCellarPrice) {
          shopCellarPrice.textContent = 'OWNED';
          btnBuyCellar.disabled = true;
        }
      } else {
        cellarEl.style.display = 'none';
        if (btnBuyCellar && shopCellarPrice) {
          shopCellarPrice.textContent = '$100';
          btnBuyCellar.disabled = gameState.coins < 100;
        }
      }

      const stoveEl = document.getElementById('stove-indicator');
      const btnBuyStove = document.getElementById('btn-buy-stove');
      const shopStovePrice = document.getElementById('shop-stove-price');
      const cookingSection = document.getElementById('cooking-section');
      if (gameState.hasStove) {
        stoveEl.style.display = 'inline';
        if (btnBuyStove && shopStovePrice) {
          shopStovePrice.textContent = 'OWNED';
          btnBuyStove.disabled = true;
        }
        if (cookingSection) {
          cookingSection.style.opacity = '1';
          cookingSection.style.pointerEvents = 'auto';
        }
      } else {
        stoveEl.style.display = 'none';
        if (btnBuyStove && shopStovePrice) {
          shopStovePrice.textContent = '$500';
          btnBuyStove.disabled = gameState.coins < 500;
        }
        if (cookingSection) {
          cookingSection.style.opacity = '0.5';
          cookingSection.style.pointerEvents = 'none';
        }
      }
    }

    let isDragging = false;
    let lastDraggedTile = { r: -1, c: -1 };

    function getTileFromEvent(e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const clientX = e.clientX !== undefined ? e.clientX : (e.touches ? e.touches[0].clientX : 0);
      const clientY = e.clientY !== undefined ? e.clientY : (e.touches ? e.touches[0].clientY : 0);
      const col = Math.floor((clientX - rect.left) * scaleX / TILE);
      const row = Math.floor((clientY - rect.top) * scaleY / TILE);
      return { col, row };
    }

    function handlePointerDown(e) {
      e.preventDefault();
      initAudio();
      isDragging = true;
      player.actionQueue = [];
      lastDraggedTile = { r: -1, c: -1 };

      const { col, row } = getTileFromEvent(e);
      if (col >= 0 && col < gameState.unlockedCols && row >= 0 && row < ROWS) {
        if (gameState.grid[row][col].state === 'house') {
          isDragging = false;
          return;
        }
        lastDraggedTile = { r: row, c: col };
        player.actionQueue.push({ r: row, c: col });
      }
    }

    function handlePointerMove(e) {
      if (!isDragging) return;
      const { col, row } = getTileFromEvent(e);
      if (col >= 0 && col < gameState.unlockedCols && row >= 0 && row < ROWS) {
        if (gameState.grid[row][col].state !== 'house') {
          if (col !== lastDraggedTile.c || row !== lastDraggedTile.r) {
            lastDraggedTile = { r: row, c: col };
            if (!player.actionQueue.some(t => t.r === row && t.c === col)) {
              player.actionQueue.push({ r: row, c: col });
            }
          }
        }
      }
    }

    function handlePointerUp(e) { isDragging = false; }

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    function getObstacleRequirement(state) {
      if (state === 'rock') return { type: 'pickaxe', reqTier: 1 };
      if (state === 'heavy_rock') return { type: 'pickaxe', reqTier: 2 };
      if (state === 'boulder') return { type: 'pickaxe', reqTier: 3 };
      if (state === 'log') return { type: 'axe', reqTier: 1 };
      if (state === 'heavy_log') return { type: 'axe', reqTier: 2 };
      if (state === 'stump') return { type: 'axe', reqTier: 3 };
      return null;
    }

    function canInteractSingleTile(r, c, tool) {
      if (r < 0 || r >= ROWS || c < 0 || c >= gameState.unlockedCols) return false;
      const tile = gameState.grid[r][c];
      if (tile.state === 'house') return false;

      const obsReq = getObstacleRequirement(tile.state);
      if (obsReq) return gameState.toolTier[obsReq.type] >= obsReq.reqTier;

      if (tile.state === 'weed' || tile.state === 'withered') {
        return true;
      } else if (tool === 'hoe' && tile.state === 'grass') {
        return true;
      } else if (tool === 'seed' && (tile.state === 'tilled' || tile.state === 'watered') && !tile.crop) {
        const seedCount = gameState.seeds[selectedSeed] || 0;
        return seedCount > 0;
      } else if (tool === 'water' && tile.state === 'tilled') {
        return true;
      } else if (tool === 'harvest' && tile.crop && tile.crop.stage === 2) {
        return true;
      }
      return false;
    }

    function interactSingleTile(r, c, tool) {
      if (r < 0 || r >= ROWS || c < 0 || c >= gameState.unlockedCols) return false;
      const tile = gameState.grid[r][c];
      if (tile.state === 'house') return false;

      const obsReq = getObstacleRequirement(tile.state);
      if (obsReq) {
        if (gameState.toolTier[obsReq.type] >= obsReq.reqTier) {
          tile.state = 'grass';
          return true;
        } else return false;
      }

      if (tile.state === 'weed' || tile.state === 'withered') {
        tile.state = 'tilled';
        return true;
      } else if (tool === 'hoe' && tile.state === 'grass') {
        tile.state = 'tilled';
        return true;
      } else if (tool === 'seed' && (tile.state === 'tilled' || tile.state === 'watered') && !tile.crop) {
        const seedCount = gameState.seeds[selectedSeed] || 0;
        if (seedCount > 0) {
          gameState.seeds[selectedSeed]--;
          tile.crop = { type: selectedSeed, stage: 0, progress: 0, perishTimer: 0 };
          return true;
        }
      } else if (tool === 'water' && tile.state === 'tilled') {
        tile.state = 'watered';
        return true;
      } else if (tool === 'harvest' && tile.crop && tile.crop.stage === 2) {
        const cropType = tile.crop.type;
        if (gameState.hasCellar) gameState.cellar[cropType]++;
        else gameState.inventory[cropType]++;
        tile.crop = null; tile.state = 'tilled';
        return true;
      }
      return false;
    }

    function interactTile(r, c, tool) {
      player.activeToolType = tool;
      player.actionTimer = 22;

      let targetTiles = [];
      const tier = gameState.toolTierLevel || 1;

      if (tier <= 2) targetTiles.push({ r, c });
      else if (tier === 3) {
        if (player.facing === 'up' || player.facing === 'down') {
          for (let dc = -1; dc <= 1; dc++) targetTiles.push({ r, c: c + dc });
        } else {
          for (let dr = -1; dr <= 1; dr++) targetTiles.push({ r: r + dr, c });
        }
      } else if (tier >= 4) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) targetTiles.push({ r: r + dr, c: c + dc });
        }
      }

      const energyCost = tier === 1 ? 2 : tier === 2 ? 1 : tier === 3 ? 2 : 3;
      const validTargets = targetTiles.filter(t => canInteractSingleTile(t.r, t.c, tool));
      if (validTargets.length === 0) return false;

      if (!useEnergy(energyCost)) return false;

      let anySuccess = false;
      let sfxType = 'till';
      if (tool === 'water') sfxType = 'water';
      else if (tool === 'seed') sfxType = 'plant';
      else if (tool === 'harvest') sfxType = 'harvest';

      for (let target of validTargets) {
        if (interactSingleTile(target.r, target.c, tool)) anySuccess = true;
      }

      if (anySuccess) {
        playSFX(sfxType);
        updateUI();
        saveGame();
        return true;
      }
      return false;
    }

    function renderSoftShadow(x, y, w, h, alpha = 0.4) {
      ctx.save();
      const grad = ctx.createRadialGradient(x + w/2, y + h/2, 2, x + w/2, y + h/2, w/2);
      grad.addColorStop(0, `rgba(0, 0, 0, ${alpha})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);
      ctx.restore();
    }

    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let effectiveSpeed = gameState.energy <= 0 ? Math.max(1, Math.floor(gameState.playerSpeed / 2)) : gameState.playerSpeed;

      if (!player.isMoving && player.actionQueue && player.actionQueue.length > 0) {
        let nextTarget = player.actionQueue.shift();
        player.targetR = nextTarget.r;
        player.targetC = nextTarget.c;
        player.isMoving = true;
      }

      if (player.isMoving) {
        const targetPx = player.targetC * TILE;
        const targetPy = player.targetR * TILE;
        const dx = targetPx - player.px;
        const dy = targetPy - player.py;

        if (Math.abs(dx) > Math.abs(dy)) player.facing = dx < 0 ? 'left' : 'right';
        else player.facing = dy < 0 ? 'up' : 'down';

        if (Math.abs(dx) > effectiveSpeed) player.px += Math.sign(dx) * effectiveSpeed;
        else if (Math.abs(dy) > effectiveSpeed) player.py += Math.sign(dy) * effectiveSpeed;
        else {
          player.px = targetPx; player.py = targetPy;
          player.r = player.targetR; player.c = player.targetC;
          player.isMoving = false;
          
          let success = interactTile(player.r, player.c, selectedTool);
          if (!success) player.actionQueue = [];
        }
      }

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < gameState.unlockedCols; c++) {
          const x = c * TILE, y = r * TILE, tile = gameState.grid[r][c];

          if (tile.state === 'house' || tile.state === 'grass') {
            ctx.fillStyle = '#22c55e'; ctx.fillRect(x, y, TILE, TILE);
            if (tile.state === 'grass') { ctx.fillStyle = '#16a34a'; ctx.fillRect(x + 4, y + 6, 4, 4); ctx.fillRect(x + 20, y + 18, 4, 4); }
          } else if (tile.state === 'tilled') {
            ctx.fillStyle = '#78350f'; ctx.fillRect(x, y, TILE, TILE); ctx.fillStyle = '#451a03'; ctx.fillRect(x, y + 6, TILE, 4); ctx.fillRect(x, y + 18, TILE, 4);
          } else if (tile.state === 'watered') {
            ctx.fillStyle = '#451a03'; ctx.fillRect(x, y, TILE, TILE); ctx.fillStyle = '#38bdf8'; ctx.fillRect(x + 6, y + 8, 3, 3); ctx.fillRect(x + 22, y + 20, 3, 3);
          } else if (tile.state === 'rock') {
            ctx.fillStyle = '#22c55e'; ctx.fillRect(x, y, TILE, TILE);
            renderSoftShadow(x + 4, y + 12, 24, 16, 0.45);
            ctx.fillStyle = '#64748b'; ctx.fillRect(x + 6, y + 8, 20, 16);
            ctx.fillStyle = '#475569'; ctx.fillRect(x + 10, y + 12, 8, 8);
          } else if (tile.state === 'heavy_rock') {
            ctx.fillStyle = '#22c55e'; ctx.fillRect(x, y, TILE, TILE);
            renderSoftShadow(x + 2, y + 10, 28, 18, 0.5);
            ctx.fillStyle = '#475569'; ctx.fillRect(x + 4, y + 6, 24, 20);
            ctx.fillStyle = '#334155'; ctx.fillRect(x + 8, y + 10, 10, 10);
            ctx.fillStyle = '#94a3b8'; ctx.fillRect(x + 16, y + 8, 4, 4);
          } else if (tile.state === 'boulder') {
            ctx.fillStyle = '#22c55e'; ctx.fillRect(x, y, TILE, TILE);
            renderSoftShadow(x + 1, y + 8, 30, 22, 0.6);
            ctx.fillStyle = '#334155'; ctx.fillRect(x + 2, y + 4, 28, 24);
            ctx.fillStyle = '#1e293b'; ctx.fillRect(x + 6, y + 8, 12, 12);
            ctx.fillStyle = '#64748b'; ctx.fillRect(x + 20, y + 6, 6, 6);
          } else if (tile.state === 'log') {
            ctx.fillStyle = '#22c55e'; ctx.fillRect(x, y, TILE, TILE);
            renderSoftShadow(x + 2, y + 12, 28, 14, 0.45);
            ctx.fillStyle = '#78350f'; ctx.fillRect(x + 4, y + 10, 24, 12);
            ctx.fillStyle = '#92400e'; ctx.fillRect(x + 8, y + 12, 16, 8);
          } else if (tile.state === 'heavy_log') {
            ctx.fillStyle = '#22c55e'; ctx.fillRect(x, y, TILE, TILE);
            renderSoftShadow(x + 1, y + 10, 30, 18, 0.5);
            ctx.fillStyle = '#451a03'; ctx.fillRect(x + 2, y + 8, 28, 16);
            ctx.fillStyle = '#78350f'; ctx.fillRect(x + 6, y + 11, 20, 10);
          } else if (tile.state === 'stump') {
            ctx.fillStyle = '#22c55e'; ctx.fillRect(x, y, TILE, TILE);
            renderSoftShadow(x + 3, y + 10, 26, 18, 0.55);
            ctx.fillStyle = '#78350f'; ctx.fillRect(x + 5, y + 6, 22, 20);
            ctx.fillStyle = '#92400e'; ctx.fillRect(x + 8, y + 8, 16, 12);
            ctx.fillStyle = '#451a03'; ctx.fillRect(x + 12, y + 10, 8, 8);
          } else if (tile.state === 'weed') {
            ctx.fillStyle = '#22c55e'; ctx.fillRect(x, y, TILE, TILE);
            renderSoftShadow(x + 6, y + 14, 20, 14, 0.35);
            ctx.fillStyle = '#15803d'; ctx.fillRect(x + 8, y + 10, 6, 16);
            ctx.fillStyle = '#4ade80'; ctx.fillRect(x + 16, y + 14, 8, 10);
          } else if (tile.state === 'withered') {
            ctx.fillStyle = '#78350f'; ctx.fillRect(x, y, TILE, TILE);
            ctx.fillStyle = '#78716c'; ctx.fillRect(x + 6, y + 12, 20, 8);
            ctx.fillStyle = '#57534e'; ctx.fillRect(x + 10, y + 16, 12, 6);
          }

          if (gameState.weather === 'rainy' && (tile.state === 'tilled' || tile.state === 'watered')) {
            ctx.fillStyle = 'rgba(14, 116, 144, 0.55)';
            ctx.fillRect(x + 6, y + 10, 20, 10);
            let rippleFrame = Math.floor(Date.now() / 180 + c * 3 + r * 7) % 4;
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.7 - rippleFrame * 0.18})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x + 16, y + 15, 3 + rippleFrame * 2.5, 0, Math.PI * 2);
            ctx.stroke();
          }

          ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)'; ctx.strokeRect(x, y, TILE, TILE);

          if (tile.crop) {
            const st = tile.crop.stage, tp = tile.crop.type;
            const maxProg = CROPS[tp].maxProgress;
            const prog = tile.crop.progress;
            const isNearMature = (st === 1 && prog >= maxProg * 0.7);

            renderSoftShadow(x + 4, y + 16, 24, 12, st === 2 ? 0.45 : 0.25);

            if (st === 0) {
              if (tp === 'carrot') { ctx.fillStyle = '#d7ccc8'; ctx.fillRect(x + 12, y + 16, 8, 6); ctx.fillStyle = '#86efac'; ctx.fillRect(x + 14, y + 12, 4, 6); }
              else if (tp === 'wheat') { ctx.fillStyle = '#fef08a'; ctx.fillRect(x + 13, y + 16, 6, 6); ctx.fillStyle = '#bef264'; ctx.fillRect(x + 14, y + 12, 4, 5); }
              else if (tp === 'corn') { ctx.fillStyle = '#78350f'; ctx.fillRect(x + 12, y + 16, 8, 6); ctx.fillStyle = '#4ade80'; ctx.fillRect(x + 13, y + 11, 6, 6); }
              else if (tp === 'pumpkin') { ctx.fillStyle = '#7c2d12'; ctx.fillRect(x + 11, y + 16, 10, 6); ctx.fillStyle = '#84cc16'; ctx.fillRect(x + 13, y + 12, 6, 5); }
              else if (tp === 'magic') { ctx.fillStyle = '#581c87'; ctx.fillRect(x + 12, y + 15, 8, 8); ctx.fillStyle = '#c084fc'; ctx.fillRect(x + 14, y + 10, 4, 7); }
            } else if (st === 1) {
              if (tp === 'carrot') { ctx.fillStyle = '#f97316'; ctx.fillRect(x + 13, y + 14, 6, 6); ctx.fillStyle = '#22c55e'; ctx.fillRect(x + 11, y + 6, 10, 10); ctx.fillStyle = '#86efac'; ctx.fillRect(x + 13, y + 4, 6, 4); }
              else if (tp === 'wheat') { ctx.fillStyle = '#facc15'; ctx.fillRect(x + 12, y + 12, 8, 10); ctx.fillStyle = '#bef264'; ctx.fillRect(x + 10, y + 6, 12, 8); }
              else if (tp === 'corn') { ctx.fillStyle = '#15803d'; ctx.fillRect(x + 13, y + 8, 6, 16); ctx.fillStyle = '#4ade80'; ctx.fillRect(x + 8, y + 12, 6, 8); ctx.fillRect(x + 18, y + 12, 6, 8); }
              else if (tp === 'pumpkin') { ctx.fillStyle = '#ea580c'; ctx.fillRect(x + 12, y + 14, 8, 8); ctx.fillStyle = '#15803d'; ctx.fillRect(x + 8, y + 10, 16, 6); ctx.fillStyle = '#84cc16'; ctx.fillRect(x + 6, y + 12, 6, 6); ctx.fillRect(x + 20, y + 12, 6, 6); }
              else if (tp === 'magic') { ctx.fillStyle = '#9333ea'; ctx.fillRect(x + 10, y + 10, 12, 12); ctx.fillStyle = '#f43f5e'; ctx.fillRect(x + 12, y + 6, 8, 6); }

              if (isNearMature) {
                let pulse = Math.sin(Date.now() / 150) > 0;
                if (pulse) {
                  ctx.fillStyle = '#fef08a'; ctx.fillRect(x + 4, y + 4, 4, 4); ctx.fillRect(x + 24, y + 6, 3, 3);
                  ctx.fillStyle = '#f43f5e'; ctx.fillRect(x + 14, y + 2, 4, 4);
                }
              }
            } else if (st === 2) {
              if (tp === 'carrot') { ctx.fillStyle = '#22c55e'; ctx.fillRect(x + 10, y + 6, 12, 6); ctx.fillStyle = '#f97316'; ctx.fillRect(x + 12, y + 12, 8, 14); }
              else if (tp === 'wheat') { ctx.fillStyle = '#facc15'; ctx.fillRect(x + 12, y + 6, 8, 20); ctx.fillStyle = '#fef08a'; ctx.fillRect(x + 8, y + 8, 4, 6); }
              else if (tp === 'corn') { ctx.fillStyle = '#15803d'; ctx.fillRect(x + 14, y + 4, 4, 24); ctx.fillStyle = '#facc15'; ctx.fillRect(x + 10, y + 10, 12, 8); }
              else if (tp === 'pumpkin') { ctx.fillStyle = '#ea580c'; ctx.fillRect(x + 6, y + 10, 20, 16); ctx.fillStyle = '#c2410c'; ctx.fillRect(x + 10, y + 10, 3, 16); }
              else if (tp === 'magic') { ctx.fillStyle = '#c084fc'; ctx.fillRect(x + 8, y + 6, 16, 20); ctx.fillStyle = '#f43f5e'; ctx.fillRect(x + 12, y + 12, 8, 8); }
            }
          }
        }
      }

      // Perimeter Fences
      ctx.fillStyle = '#854d0e'; ctx.strokeStyle = '#713f12';
      for (let c = 0; c < gameState.unlockedCols; c++) {
        let fx = c * TILE, fy = (ROWS - 1) * TILE + 24;
        ctx.fillRect(fx + 4, fy, 6, 8); ctx.fillRect(fx + 22, fy, 6, 8);
        ctx.fillRect(fx, fy + 2, TILE, 3); ctx.fillRect(fx, fy + 6, TILE, 2);
      }

      // House Graphic
      if (gameState.unlockedCols >= 2) {
        renderSoftShadow(0, 24, 64, 12, 0.5);
        ctx.fillStyle = '#b45309'; ctx.fillRect(0, 4, 64, 28);
        ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.moveTo(32, -4); ctx.lineTo(68, 12); ctx.lineTo(-4, 12); ctx.fill();
        ctx.fillStyle = '#78350f'; ctx.fillRect(24, 16, 16, 16);
      }

      // Farmer Character Rendering
      const px = player.px, py = player.py;
      renderSoftShadow(px + 4, py + 22, 24, 10, 0.4);

      // Body / Overalls
      ctx.fillStyle = '#3b82f6'; ctx.fillRect(px + 8, py + 14, 16, 12);
      ctx.fillStyle = '#1d4ed8'; ctx.fillRect(px + 10, py + 18, 12, 8);
      // Head / Hat
      ctx.fillStyle = '#fde047'; ctx.fillRect(px + 9, py + 6, 14, 10);
      ctx.fillStyle = '#ca8a04'; ctx.fillRect(px + 7, py + 4, 18, 4);
      if (player.facing === 'left') {
        ctx.fillStyle = '#1e293b'; ctx.fillRect(px + 10, py + 9, 3, 3);
      } else if (player.facing === 'right') {
        ctx.fillStyle = '#1e293b'; ctx.fillRect(px + 19, py + 9, 3, 3);
      } else if (player.facing === 'up') {
        ctx.fillStyle = '#ca8a04'; ctx.fillRect(px + 10, py + 8, 12, 5);
      } else {
        ctx.fillStyle = '#1e293b'; ctx.fillRect(px + 10, py + 9, 3, 3); ctx.fillRect(px + 19, py + 9, 3, 3);
      }

      // Action Tool Swing / Effect Animation
      if (player.actionTimer > 0) {
        player.actionTimer--;
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        let tx = px, ty = py;
        if (player.facing === 'up') ty -= 16;
        else if (player.facing === 'down') ty += 16;
        else if (player.facing === 'left') tx -= 16;
        else if (player.facing === 'right') tx += 16;

        if (player.activeToolType === 'hoe') {
          ctx.fillRect(tx + 10, ty + 10, 12, 12);
        } else if (player.activeToolType === 'water') {
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(tx + 8, ty + 8, 16, 16);
        } else if (player.activeToolType === 'seed') {
          ctx.fillStyle = '#4ade80';
          ctx.fillRect(tx + 12, ty + 12, 8, 8);
        } else if (player.activeToolType === 'harvest') {
          ctx.fillStyle = '#facc15';
          ctx.fillRect(tx + 8, ty + 8, 16, 16);
        }
        ctx.restore();
      }

      requestAnimationFrame(render);
    }

    document.getElementById('close-newspaper-btn').addEventListener('click', () => {
      document.getElementById('newspaper-modal').style.display = 'none';
      saveGame();
    });

    loadGame();
    requestAnimationFrame(render);