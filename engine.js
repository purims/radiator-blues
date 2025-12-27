<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>The Okie Migration: Dust Bowl Engine</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Special+Elite&display=swap');
        
        :root {
            --sepia-dark: #3e2723;
            --sepia-mid: #795548;
            --sepia-light: #d7ccc8;
            --dust: #bcaaa4;
        }

        body {
            background-color: var(--sepia-dark);
            color: var(--sepia-light);
            font-family: 'Special+Elite', 'Courier New', Courier, monospace;
            background-image: url('https://www.transparenttextures.com/patterns/felt.png');
            height: 100vh;
            overflow: hidden;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        #game-container {
            width: 95%;
            max-width: 800px;
            height: 90vh;
            background: var(--sepia-light);
            color: var(--sepia-dark);
            border: 12px solid var(--sepia-mid);
            box-shadow: 0 0 50px rgba(0,0,0,0.5);
            display: flex;
            flex-direction: column;
            position: relative;
        }

        .crt-overlay {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%), 
                        linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03));
            background-size: 100% 3px, 3px 100%;
            pointer-events: none;
            z-index: 10;
        }

        .stat-bar {
            height: 8px;
            background: #a1887f;
            border-radius: 4px;
            overflow: hidden;
        }

        .stat-fill {
            height: 100%;
            background: var(--sepia-dark);
            transition: width 0.5s ease;
        }

        .terminal-text {
            border-right: 2px solid var(--sepia-dark);
            animation: blink 0.75s step-end infinite;
        }

        @keyframes blink { from, to { border-color: transparent } 50% { border-color: var(--sepia-dark) } }
        
        .choice-btn {
            border: 2px solid var(--sepia-dark);
            padding: 10px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: all 0.2s;
            text-align: left;
        }

        .choice-btn:hover {
            background: var(--sepia-dark);
            color: var(--sepia-light);
        }

        .choice-btn:disabled {
            opacity: 0.3;
            cursor: not-allowed;
        }

        #log {
            scrollbar-width: thin;
            scrollbar-color: var(--sepia-mid) transparent;
        }
    </style>
</head>
<body>
    <div id="game-container">
        <div class="crt-overlay"></div>
        
        <!-- Header / Stats -->
        <div id="stats-panel" class="p-4 border-b-2 border-sepia-mid grid grid-cols-2 md:grid-cols-4 gap-4 bg-stone-200">
            <!-- Dynamic Stats injected here -->
        </div>

        <!-- Main Viewport -->
        <div class="flex-1 overflow-y-auto p-6 flex flex-col" id="viewport">
            <div id="location-display" class="text-xs uppercase tracking-widest mb-2 opacity-60"></div>
            <div id="narrative-text" class="text-xl mb-8 leading-relaxed">
                Loading manifest...
            </div>
            <div id="choices-container" class="mt-auto">
                <!-- Buttons injected here -->
            </div>
        </div>

        <!-- Footer -->
        <div class="p-2 bg-stone-300 text-[10px] flex justify-between border-t border-sepia-mid">
            <span>OKIE_ENGINE_V1.0</span>
            <span id="distance-tracker">0 MILES TO CALIFORNIA</span>
        </div>
    </div>

    <script>
        /**
         * ENGINE.JS - The Generic Processor
         */
        class GameEngine {
            constructor() {
                this.manifest = null;
                this.data = {
                    stats: {},
                    events: {},
                    locations: []
                };
                this.gameState = {
                    currentLocationIndex: 0,
                    currentDistance: 0,
                    stats: {},
                    activeEvent: null,
                    isGameOver: false,
                    log: []
                };

                this.elements = {
                    stats: document.getElementById('stats-panel'),
                    narrative: document.getElementById('narrative-text'),
                    choices: document.getElementById('choices-container'),
                    location: document.getElementById('location-display'),
                    distance: document.getElementById('distance-tracker')
                };
            }

            async init() {
                try {
                    // 1. Fetch Manifest
                    const manifestRes = await fetch('manifest.json');
                    this.manifest = await manifestRes.json();

                    // 2. Fetch all content files listed in manifest
                    const loadPromises = this.manifest.files.map(url => 
                        fetch(url).then(res => res.json())
                    );
                    const contents = await Promise.all(loadPromises);

                    // 3. Merge data into engine memory
                    contents.forEach(content => {
                        if (content.stats) Object.assign(this.data.stats, content.stats);
                        if (content.events) Object.assign(this.data.events, content.events);
                        if (content.locations) this.data.locations = content.locations;
                    });

                    this.setupGame();
                } catch (err) {
                    console.error("Initialization Failed:", err);
                    this.elements.narrative.innerHTML = "Critical Error: Manifest or data files missing. Check console.";
                }
            }

            setupGame() {
                // Initialize state from data definitions
                for (let key in this.data.stats) {
                    this.gameState.stats[key] = this.data.stats[key].initial;
                }
                
                // Start at first location
                this.render();
            }

            // Central rendering logic based on data types
            render() {
                this.updateStatsUI();
                
                const loc = this.data.locations[this.gameState.currentLocationIndex];
                this.elements.location.innerText = loc.name;
                this.elements.distance.innerText = `${loc.milesToNext || 0} MILES TO NEXT STOP`;

                if (this.gameState.activeEvent) {
                    this.displayEvent(this.gameState.activeEvent);
                } else {
                    this.displayLocation(loc);
                }
            }

            updateStatsUI() {
                this.elements.stats.innerHTML = '';
                for (let key in this.gameState.stats) {
                    const val = this.gameState.stats[key];
                    const meta = this.data.stats[key];
                    
                    const statDiv = document.createElement('div');
                    statDiv.className = 'flex flex-col';
                    statDiv.innerHTML = `
                        <div class="flex justify-between text-[10px] font-bold uppercase mb-1">
                            <span>${meta.label}</span>
                            <span>${val}${meta.unit || ''}</span>
                        </div>
                        <div class="stat-bar">
                            <div class="stat-fill" style="width: ${(val / meta.max) * 100}%"></div>
                        </div>
                    `;
                    this.elements.stats.appendChild(statDiv);
                }
            }

            displayLocation(loc) {
                this.elements.narrative.innerHTML = loc.description;
                this.elements.choices.innerHTML = '';
                
                const btn = document.createElement('button');
                btn.className = 'choice-btn w-full font-bold uppercase tracking-tighter bg-stone-800 text-stone-100';
                btn.innerText = "Begin the next leg of the journey";
                btn.onclick = () => this.travel();
                this.elements.choices.appendChild(btn);
            }

            displayEvent(event) {
                this.elements.narrative.innerHTML = event.text;
                this.elements.choices.innerHTML = '';

                event.choices.forEach(choice => {
                    const btn = document.createElement('button');
                    btn.className = 'choice-btn w-full';
                    
                    // Check requirements
                    let canPick = true;
                    if (choice.requirements) {
                        for (let s in choice.requirements) {
                            if (this.gameState.stats[s] < choice.requirements[s]) canPick = false;
                        }
                    }

                    btn.disabled = !canPick;
                    btn.innerHTML = choice.label;
                    if (!canPick) btn.innerHTML += " <span class='text-[10px] opacity-50'>(Not enough resources)</span>";
                    
                    btn.onclick = () => this.handleChoice(choice);
                    this.elements.choices.appendChild(btn);
                });
            }

            handleChoice(choice) {
                // Apply effects
                if (choice.effects) {
                    for (let s in choice.effects) {
                        this.gameState.stats[s] = Math.max(0, Math.min(this.data.stats[s].max, this.gameState.stats[s] + choice.effects[s]));
                    }
                }

                // Check for follow-up event or clear event
                if (choice.nextEvent) {
                    this.gameState.activeEvent = this.data.events[choice.nextEvent];
                } else {
                    this.gameState.activeEvent = null;
                }

                this.checkGameOver();
                this.render();
            }

            travel() {
                const loc = this.data.locations[this.gameState.currentLocationIndex];
                
                // Consume resources
                this.gameState.stats.gas -= 5;
                this.gameState.stats.food -= 2;
                this.gameState.stats.health -= 1;

                // Random event check (30% chance)
                if (Math.random() < 0.4) {
                    const eventIds = Object.keys(this.data.events).filter(id => !this.data.events[id].storyOnly);
                    const randomId = eventIds[Math.floor(Math.random() * eventIds.length)];
                    this.gameState.activeEvent = this.data.events[randomId];
                } else {
                    // Move to next location
                    this.gameState.currentLocationIndex++;
                    if (this.gameState.currentLocationIndex >= this.data.locations.length) {
                        this.win();
                        return;
                    }
                }

                this.checkGameOver();
                this.render();
            }

            checkGameOver() {
                if (this.gameState.stats.health <= 0) {
                    this.endGame("Your family could not endure the journey. You succumb to illness and exhaustion in the red dirt of New Mexico.");
                } else if (this.gameState.stats.gas <= 0 && this.gameState.stats.money <= 0) {
                    this.endGame("The Jalopy has breathed its last, and your pockets are empty. You are stranded in the wasteland.");
                }
            }

            endGame(msg) {
                this.gameState.activeEvent = {
                    text: `<span class='text-red-800 font-bold'>GAME OVER</span><br><br>${msg}`,
                    choices: [{ label: "Try Again", effects: null, nextEvent: null, action: () => window.location.reload() }]
                };
            }

            win() {
                this.gameState.activeEvent = {
                    text: "<span class='text-green-800 font-bold'>CALIFORNIA</span><br><br>The green valleys of San Joaquin stretch out before you. The journey was long and the cost was high, but you've arrived.",
                    choices: [{ label: "Credits", effects: null, nextEvent: null }]
                };
            }
        }

        const engine = new GameEngine();
        window.onload = () => engine.init();
    </script>
</body>
</html>
