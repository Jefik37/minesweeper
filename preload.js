(async function() {
    const assets = {
        lcd: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-'],
        smiley: ['dead', 'pressed', 'smiley', 'sunglasses', 'wonder'],
        tiles: ['1', '2', '3', '4', '5', '6', '7', '8', 'empty', 'flag', 
                'mine', 'mine_red', 'mine_x', 'question', 'question_pressed', 'unpressed']
    };
    
    window.lcdCache = {};
    window.smileyCache = {};
    window.tilesCache = {};
    
    async function loadImage(path, name, cache) {
        try {
            const response = await fetch(path, { cache: 'force-cache' });
            const blob = await response.blob();
            const objectURL = URL.createObjectURL(blob);
            cache[name] = objectURL;
        } catch (error) {
            console.error(`Error loading ${path}:`, error);
            cache[name] = path; //fallback
        }
    }
    
    const promises = [];
    
    assets.lcd.forEach(digit => {
        promises.push(loadImage(`./assets/lcd/${digit}.png`, digit, window.lcdCache));
    });
    
    assets.smiley.forEach(name => {
        promises.push(loadImage(`./assets/smiley/${name}.png`, name, window.smileyCache));
    });
    
    assets.tiles.forEach(name => {
        promises.push(loadImage(`./assets/tiles/${name}.png`, name, window.tilesCache));
    });
    
    await Promise.all(promises);
})();
