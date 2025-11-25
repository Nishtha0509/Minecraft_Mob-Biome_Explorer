// ---------- initial setup ----------

let dims = [];
let mobs = [];
let biomes = [];
let faunaGeography = [];
let selectedMob = null;
let selectedBiome = null;
let activeDimensions = new Set();

const mobSection = document.getElementById('mobSection');
const biomeSection = document.getElementById('biomeSection');
const searchBox = document.getElementById('searchBox');
const behaviorFilter = document.getElementById('behaviorFilter');
const spawnFilter = document.getElementById('spawnFilter');
const healthFilter = document.getElementById('healthFilter');
const damageFilter = document.getElementById('damageFilter');
const dimFilter = document.getElementById('dimensionFilter');
const tooltip = document.getElementById('tooltip');

// ---------- load icons ----------

function getIconPath(type, name) {
    // type is 'mobs' or 'biomes'
    const fileName = name.toLowerCase().replace(/ /g, '_') + '.png';
    return `textures/${type}/${fileName}`;
}

function checkImageExists(type, name, callback) {
    const fileName = name.toLowerCase().replace(/ /g, '_');
    
    // try GIF first
    const gifPath = `textures/${type}/${fileName}.gif`;
    const gifImg = new Image();
    const pngPath = `textures/${type}/${fileName}.png`;
    const pngImg = new Image();

    gifImg.onload = () => {
        callback(true, gifPath);
    };
    
    gifImg.onerror = (e) => {
        // GIF failed, try PNG
        pngImg.onload = () => {
            callback(true, pngPath);
        };
        
        pngImg.onerror = () => {
            // both failed, use default
            callback(false, 'textures/unknown.jpeg');
        };
        
        pngImg.src = pngPath;
    };
    
    gifImg.src = gifPath;
}


// ---------- render mobs ----------

function renderMobs() {
    mobSection.innerHTML = '';
    
    mobs.forEach(mob => {
        const tile = document.createElement('div');
        tile.className = 'mob-tile';
        tile.dataset.id = mob.ID;
        tile.dataset.name = mob.name;
        tile.dataset.behavior = mob.behaviorTypes;
        tile.dataset.spawn = mob.spawnBehavior;
        tile.dataset.health = mob.healthPoints;
        tile.dataset.damage = mob.maxDamage;
        
        const label = document.createElement('div');
        label.className = 'tile-label';
        label.textContent = mob.name;
        tile.appendChild(label);
        
        // load icon with fallback
        checkImageExists('mobs', mob.name, (exists, finalPath) => {
            tile.style.backgroundImage = `url('${finalPath}')`;
        });
        
        tile.addEventListener('click', () => handleMobClick(mob));
        tile.addEventListener('mouseenter', (e) => showTooltip(e, mob, 'mob'));
        tile.addEventListener('mousemove', positionTooltip);
        tile.addEventListener('mouseleave', hideTooltip);
        
        mobSection.appendChild(tile);
    });
}

// ---------- render biomes ----------

function renderBiomes() {
    biomeSection.innerHTML = '';
    
    biomes.forEach(biome => {
        const tile = document.createElement('div');
        tile.className = 'biome-tile';
        tile.dataset.id = biome.ID;
        tile.dataset.name = biome.name;
        tile.dataset.dimension = biome.dimensionID;
        
        const label = document.createElement('div');
        label.className = 'tile-label';
        label.textContent = biome.name;
        tile.appendChild(label);
        
        // load icon with fallback
        checkImageExists('biomes', biome.name, (exists, finalPath) => {
            tile.style.backgroundImage = `url('${finalPath}')`;
        });
        
        tile.addEventListener('click', () => handleBiomeClick(biome));
        tile.addEventListener('mouseenter', (e) => showTooltip(e, biome, 'biome'));
        tile.addEventListener('mousemove', positionTooltip);
        tile.addEventListener('mouseleave', hideTooltip);
        
        biomeSection.appendChild(tile);
    });
}

// ---------- selection handlers ----------

function clearSelection() {
    selectedMob = null;
    selectedBiome = null;
    
    mobSection.style.backgroundImage = '';
    mobSection.style.backgroundColor = '#1a1a1a';
    
    document.querySelectorAll('.mob-tile, .biome-tile').forEach(tile => {
        tile.classList.remove('selected', 'dimmed', 'highlight');
    });
}

// ---------- mob clicked ----------

function handleMobClick(mob) {
    clearSelection();
    selectedMob = mob;
    selectedBiome = null;
    
    // Find biomes where this mob spawns
    const mobBiomes = faunaGeography
        .filter(fg => fg.mobID === mob.ID)
        .map(fg => fg.biomeID);
    
    // Update mob tiles
    document.querySelectorAll('.mob-tile').forEach(tile => {
        if (tile.dataset.id === mob.ID) {
            tile.classList.add('selected');
            tile.classList.remove('dimmed');
        } else {
            tile.classList.remove('selected');
            tile.classList.add('dimmed');
        }
    });
    
    // Update biome tiles
    document.querySelectorAll('.biome-tile').forEach(tile => {
        tile.classList.remove('selected');
        
        if (mobBiomes.includes(tile.dataset.id)) {
            tile.classList.add('highlight');
            tile.classList.remove('dimmed');
        } else {
            tile.classList.remove('highlight');
            tile.classList.add('dimmed');
        }
    });
}

// ---------- biome clicked ----------

function handleBiomeClick(biome) {
    clearSelection();
    selectedBiome = biome;
    selectedMob = null;
    
    // Change background of mob section to biome image
    checkImageExists('biomes', biome.name, (exists, finalPath) => {
        if (exists) {
            mobSection.style.backgroundImage = `url('${finalPath}')`;
            mobSection.style.backgroundSize = 'cover';
            mobSection.style.backgroundPosition = 'center';
            mobSection.style.backgroundRepeat = 'repeat';
        }
    });
    
    // Find mobs that spawn in this biome
    const biomeMobs = faunaGeography
        .filter(fg => fg.biomeID === biome.ID)
        .map(fg => fg.mobID);
    
    // Update biome tiles
    document.querySelectorAll('.biome-tile').forEach(tile => {
        if (tile.dataset.id === biome.ID) {
            tile.classList.add('selected');
            tile.classList.remove('dimmed');
        } else {
            tile.classList.remove('selected');
            tile.classList.add('dimmed');
        }
    });
    
    // Update mob tiles
    document.querySelectorAll('.mob-tile').forEach(tile => {
        tile.classList.remove('highlight');
        
        if (biomeMobs.includes(tile.dataset.id)) {
            tile.classList.add('highlight');
            tile.classList.remove('dimmed');
        } else {
            tile.classList.remove('highlight');
            tile.classList.add('dimmed');
        }
    });
}

// ---------- populate filters ----------

function populateFilters() {
    // Behavior types
    const behaviorSet = new Set();
    mobs.forEach(m => {
        m.behaviorTypes.split(',').forEach(b => behaviorSet.add(b.trim()));
    });
    populateSelect('behaviorFilter', behaviorSet);
    
    // Spawn types
    const spawnSet = new Set();
    mobs.forEach(m => spawnSet.add(m.spawnBehavior.trim()));
    populateSelect('spawnFilter', spawnSet);
    
    // Health points - create ranges
    const healthRanges = ['0-10', '11-20', '21-50', '51-100', '100+'];
    populateSelectArray('healthFilter', healthRanges);
    
    // Max damage - create ranges
    const damageRanges = ['0-5', '6-10', '11-20', '20+'];
    populateSelectArray('damageFilter', damageRanges);

    // Dimentions - create toggle buttons
    createDimensionToggles();
}

function populateSelect(id, valueSet) {
    const select = document.getElementById(id);
    select.innerHTML = '<option value="all">All</option>';
    
    Array.from(valueSet).sort().forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    });
}

function populateSelectArray(id, valuesArray) {
    const select = document.getElementById(id);
    select.innerHTML = '<option value="all">All</option>';
    
    valuesArray.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    });
}

function createDimensionToggles() {
    dims.forEach(dim => {
        const btn = document.createElement('button');
        btn.className = `dimension-btn ${dim.name} active`;
        btn.textContent = dim.name;
        btn.dataset.dimension = dim.ID;
        activeDimensions.add(dim.ID);
        
        btn.addEventListener('click', () => {
            if (activeDimensions.has(dim.ID)) {
                activeDimensions.delete(dim.ID);
                btn.classList.remove('active');
            } else {
                activeDimensions.add(dim.ID);
                btn.classList.add('active');
            }
            applyFilters();
        });
        
        dimFilter.appendChild(btn);
    });
}


// ---------- filter data ----------

function shouldShowMob(tile) {
    const searchTerm = searchBox.value.trim().toLowerCase();
    const mobName = tile.dataset.name.toLowerCase();
    
    // Search filter
    if (searchTerm && !mobName.includes(searchTerm)) {
        return false;
    }
    
    // Behavior filter
    if (behaviorFilter.value !== 'all') {
        const behaviors = tile.dataset.behavior.split(',').map(b => b.trim());
        if (!behaviors.includes(behaviorFilter.value)) {
            return false;
        }
    }
    
    // Spawn filter
    if (spawnFilter.value !== 'all' && tile.dataset.spawn !== spawnFilter.value) {
        return false;
    }
    
    // Health filter
    if (healthFilter.value !== 'all') {
        const health = parseInt(tile.dataset.health);
        if (!isInRange(health, healthFilter.value)) {
            return false;
        }
    }
    
    // Damage filter
    if (damageFilter.value !== 'all') {
        const damage = parseInt(tile.dataset.damage);
        if (!isInRange(damage, damageFilter.value)) {
            return false;
        }
    }
    
    return true;
}

function isInRange(value, rangeStr) {
    if (rangeStr.includes('+')) {
        const min = parseInt(rangeStr);
        return value >= min;
    }
    
    const [min, max] = rangeStr.split('-').map(n => parseInt(n));
    return value >= min && value <= max;
}

function applyFilters() {
    // Clear selections when filtering
    clearSelection();
    
    // filter mobs
    document.querySelectorAll('.mob-tile').forEach(tile => {
        tile.classList.remove('selected', 'dimmed', 'highlight');
        
        if (shouldShowMob(tile)) {
            tile.style.display = 'block';
        } else {
            tile.style.display = 'none';
        }
    });

    // filter biomes
    document.querySelectorAll('.biome-tile').forEach(tile => {
        tile.classList.remove('selected', 'dimmed', 'highlight');
        
        // Check if biome's dimension is active
        const biomeDimension = tile.dataset.dimension;
        if (activeDimensions.has(biomeDimension)) {
            tile.style.display = 'block';
        } else {
            tile.style.display = 'none';
        }
    });
}

// ---------- handle events ----------

function setupEventListeners() {
    behaviorFilter.addEventListener('change', applyFilters);
    spawnFilter.addEventListener('change', applyFilters);
    healthFilter.addEventListener('change', applyFilters);
    damageFilter.addEventListener('change', applyFilters);
    searchBox.addEventListener('input', applyFilters);
    
    // Click outside to reset
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.mob-tile') && !e.target.closest('.biome-tile')) {
            clearSelection();
        }
    });

    // Info panel toggle
    const infoPanel = document.getElementById('infoPanel');
    const infoOverlay = document.getElementById('infoOverlay');
    const toggleBtn = document.getElementById('toggleInfo');
    const closeBtn = document.getElementById('closeInfo');
    
    function openInfo() {
        infoPanel.classList.remove('hidden');
        infoPanel.classList.add('visible');
        infoOverlay.classList.add('visible');
    }
    
    function closeInfo() {
        infoPanel.classList.remove('visible');
        infoPanel.classList.add('hidden');
        infoOverlay.classList.remove('visible');
    }
    
    toggleBtn.addEventListener('click', openInfo);
    closeBtn.addEventListener('click', closeInfo);
    infoOverlay.addEventListener('click', closeInfo);
    
    // Close with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && infoPanel.classList.contains('visible')) {
            closeInfo();
        }
    });
}

// ---------- add tooltips ----------

function showTooltip(event, data, type) {
    let content = '';
    
    if (type === 'mob') {
        content = `
            <div class="tooltip-title">${data.name}</div>
            <div class="tooltip-stat">Health: <span>${data.healthPoints} HP</span></div>
            <div class="tooltip-stat">Max Damage: <span>${data.maxDamage}</span></div>
            <div class="tooltip-stat">Behavior: <span>${data.behaviorTypes}</span></div>
            <div class="tooltip-stat">Spawn: <span>${data.spawnBehavior}</span></div>
        `;
    } else if (type === 'biome') {
        const biomeData = biomes.find(b => b.ID === data.ID);
        const dimension = biomeData.dimensionID === '1' ? 'Overworld' : 
                         biomeData.dimensionID === '2' ? 'Nether' : 'End';
        
        content = `
            <div class="tooltip-title">${data.name}</div>
            <div class="tooltip-stat">Dimension: <span>${dimension}</span></div>
            <div class="tooltip-stat">Precipitation: <span>${biomeData.precipitation || 'None'}</span></div>
            <div class="tooltip-stat">Trees/Grass: <span>${biomeData.treesOrGrass || 'No'}</span></div>
        `;
    }
    
    tooltip.innerHTML = content;
    tooltip.classList.add('visible');
    
    // Position tooltip near cursor
    positionTooltip(event);
}

function hideTooltip() {
    tooltip.classList.remove('visible');
}

function positionTooltip(event) {
    const tooltipRect = tooltip.getBoundingClientRect();
    const offset = 15;
    
    let left = event.clientX + offset;
    let top = event.clientY + offset;
    
    // Keep tooltip on screen
    if (left + tooltipRect.width > window.innerWidth) {
        left = event.clientX - tooltipRect.width - offset;
    }
    
    if (top + tooltipRect.height > window.innerHeight) {
        top = event.clientY - tooltipRect.height - offset;
    }
    
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
}

// ---------- load csv files and Let's Go! ----------

Promise.all([

    d3.csv("data/Dimensions.csv"),
    d3.csv("data/Mobs.csv"),
    d3.csv("data/Biomes.csv"),
    d3.csv("data/FaunaGeography.csv")

]).then(([dimsData, mobsData, biomesData, fgData]) => {
    // Store data in global variables
    dims = dimsData;
    mobs = mobsData;
    biomes = biomesData;
    faunaGeography = fgData;
    
    // starting the setup
    populateFilters();
    renderMobs();
    renderBiomes();
    setupEventListeners();
    
    console.log('Visualization loaded successfully!');
    console.log(`Loaded ${mobs.length} mobs and ${biomes.length} biomes`);
}).catch(error => {
    console.error('Error loading data:', error);
    document.body.innerHTML = '<h1 style="color: red; text-align: center; margin-top: 50px;">Error loading data. Please check console.</h1>';
});