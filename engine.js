<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Radiator Blues - Engine</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Special+Elite&family=Courier+Prime:wght@400;700&display=swap" rel="stylesheet">
    <style>
        body {
            background-color: #1a1512;
            color: #d4c4a8;
            font-family: 'Courier Prime', monospace;
            background-image: url('https://www.transparenttextures.com/patterns/carbon-fibre.png');
        }
        .vintage-border {
            border: 2px solid #5c4a3c;
            box-shadow: inset 0 0 15px rgba(0,0,0,0.5);
        }
        .typewriter {
            font-family: 'Special Elite', cursive;
        }
        .stat-card {
            background: rgba(45, 38, 32, 0.8);
            border-bottom: 2px solid #3d3329;
        }
        .btn-choice {
            transition: all 0.2s;
            border: 1px solid #5c4a3c;
            background: #2d2620;
        }
        .btn-choice:hover:not(:disabled) {
            background: #d4c4a8;
            color: #1a1512;
            transform: translateX(5px);
        }
        .btn-choice:disabled {
            opacity: 0.3;
            cursor: not-allowed;
            text-decoration: line-through;
        }
        .progress-bar {
            height: 4px;
            background: #3d3329;
            width: 100%;
        }
        .progress-fill {
            height: 100%;
            background: #8b4513;
            transition: width 0.5s ease-in-out;
        }
        #terminal-log::-webkit-scrollbar { width: 4px; }
        #terminal-log::-webkit-scrollbar-thumb { background: #5c4a3c; }
    </style>
</head>
<body class="min-h-screen flex flex-col p-4 md:p-8">

    <!-- Header / Stats Bar -->
    <header id="stats-bar" class="grid grid-cols-2 md:grid-cols-5 gap-2 mb-6">
        <!-- Stats populated by engine.js -->
    </header>

    <main class="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto w-full">
        
        <!-- Left Column: Visuals & Narrative -->
        <section class="lg:col-span-2 flex flex-col gap-4">
            <div class="vintage-border aspect-video bg-black flex items-center justify-center overflow-hidden relative">
                <div id="scene-image" class="absolute inset-0 opacity-40 bg-center bg-cover transition-all duration-1000"></div>
                <h2 id="scene-title" class="typewriter text-3xl md:text-5xl text-center z-10 px-4">Loading Engine...</h2>
            </div>
            
            <div id="narrative-box" class="vintage-border p-6 bg-[#261f1a] flex-grow text-lg leading-relaxed overflow-y-auto max-h-[400px]">
                <p id="scene-description">Scanning manifest.json...</p>
            </div>
        </section>

        <!-- Right Column: Choices & Log -->
        <section class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
                <h3 class="uppercase text-xs font-bold tracking-widest text-[#8b7355] mb-2">Decision Matrix</h3>
                <div id="choice-container" class="flex flex-col gap-3">
                    <!-- Choices populated by engine.js -->
                </div>
            </div>

            <div class="flex-grow flex flex-col mt-4">
                <h3 class="uppercase text-xs font-bold tracking-widest text-[#8b7355] mb-2">Migration Log</h3>
                <div id="terminal-log" class="bg-black p-3 text-sm font-mono text-green-800 h-40 overflow-y-auto vintage-border opacity-70">
                    <div>[SYSTEM] Engine initialized...</div>
                    <div>[SYSTEM] Awaiting data packets...</div>
                </div>
            </div>
        </section>
    </main>

    <footer class="mt-6 text-center text-xs opacity-50 uppercase tracking-tighter">
        Radiator Blues v1.0 | Data-Driven Simulation | Great Depression VUS.10d
    </footer>

    <script>
        /**
         * ENGINE.JS - The Generic Processor
         */
        class GameEngine {
            constructor() {
                this.state = {
                    resources: {},
                    flags: [],
                    currentSceneId: null,
                    totalMiles: 0
                };
                this.db = {
                    config: {},
                    events: {},
                    scenes: {}
                };
            }

            async init() {
                try {
                    this.log("Fetching manifest...");
                    const manifestRes = await fetch('manifest.json');
                    const manifest = await manifestRes.json();

                    this.log(`Loading ${manifest.files.length} content files...`);
                    
                    const loadPromises = manifest.files.map(file => 
                        fetch(file).then(res => res.json())
                    );

                    const dataBlocks = await Promise.all(loadPromises);
                    
                    // Merge data into registry
                    dataBlocks.forEach(block => {
                        if (block.type === 'config') this.db.config = block.data;
                        if (block.type === 'events') {
                            block.data.forEach(e => this.db.events[e.id] = e);
                        }
                    });

                    this.setupInitialState();
                    this.render();
                    this.startJourney(this.db.config.start_event);

                } catch (err) {
                    this.log(`CRITICAL ERROR: ${err.message}`, 'red');
                    document.getElementById('scene-title').innerText = "SYSTEM FAILURE";
                    document.getElementById('scene-description').innerText = "Failed to load game data. Check manifest and JSON formatting.";
                }
            }

            setupInitialState() {
                this.state.resources = { ...this.db.config.initial_resources };
                this.state.currentSceneId = this.db.config.start_event;
                this.log("State synchronized.");
            }

            log(msg, color = 'green') {
                const logEl = document.getElementById('terminal-log');
                const entry = document.createElement('div');
                entry.style.color = color;
                entry.textContent = `> ${msg}`;
                logEl.appendChild(entry);
                logEl.scrollTop = logEl.scrollHeight;
            }

            checkRequirements(reqs) {
                if (!reqs) return true;
                return Object.entries(reqs).every(([stat, min]) => this.state.resources[stat] >= min);
            }

            applyEffects(effects) {
                if (!effects) return;
                Object.entries(effects).forEach(([stat, delta]) => {
                    if (this.state.resources.hasOwnProperty(stat)) {
                        const oldVal = this.state.resources[stat];
                        this.state.resources[stat] = Math.max(0, this.state.resources[stat] + delta);
                        const diff = this.state.resources[stat] - oldVal;
                        this.log(`${stat.toUpperCase()} ${diff >= 0 ? '+' : ''}${diff}`);
                    }
                });
            }

            startJourney(eventId) {
                const event = this.db.events[eventId];
                if (!event) {
                    this.log(`Event ${eventId} not found!`, 'red');
                    return;
                }

                this.state.currentSceneId = eventId;
                
                // DOM Updates
                document.getElementById('scene-title').innerText = event.title;
                document.getElementById('scene-description').innerHTML = event.narrative;
                document.getElementById('scene-image').style.backgroundImage = `url(${event.image || ''})`;
                
                this.renderChoices(event.choices);
                this.renderStats();
            }

            renderChoices(choices) {
                const container = document.getElementById('choice-container');
                container.innerHTML = '';

                choices.forEach(choice => {
                    const btn = document.createElement('button');
                    const canAfford = this.checkRequirements(choice.requirements);
                    
                    btn.className = "btn-choice p-4 text-left text-sm uppercase font-bold flex justify-between items-center";
                    btn.disabled = !canAfford;
                    
                    let reqText = "";
                    if (choice.requirements) {
                        reqText = Object.entries(choice.requirements)
                            .map(([k, v]) => ` [Need ${v} ${k}]`).join("");
                    }

                    btn.innerHTML = `<span>${choice.text}</span> <span class="text-[10px] opacity-50">${reqText}</span>`;
                    
                    btn.onclick = () => {
                        this.log(`Action: ${choice.text}`);
                        this.applyEffects(choice.effects);
                        
                        if (choice.flavor_text) {
                            // Temporary "result" screen logic could go here
                            this.log(choice.flavor_text, '#d4c4a8');
                        }

                        if (choice.next_event) {
                            this.startJourney(choice.next_event);
                        }
                    };
                    container.appendChild(btn);
                });
            }

            renderStats() {
                const bar = document.getElementById('stats-bar');
                bar.innerHTML = '';
                
                Object.entries(this.state.resources).forEach(([key, val]) => {
                    const div = document.createElement('div');
                    div.className = "stat-card p-2 flex flex-col items-center justify-center";
                    div.innerHTML = `
                        <span class="text-[10px] uppercase opacity-60">${key}</span>
                        <span class="text-xl font-bold ${val < 5 ? 'text-red-500 animate-pulse' : ''}">${val}</span>
                    `;
                    bar.appendChild(div);
                });
            }

            render() {
                // Main render loop if needed for animations
            }
        }

        const engine = new GameEngine();
        window.onload = () => engine.init();
    </script>
</body>
</html>
