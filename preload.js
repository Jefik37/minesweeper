function preloadImages() {
    const base = 'assets/';
    const images = {
        lcd: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-'],
        smiley: ['dead', 'smiley', 'pressed', 'sunglasses', 'wonder'],
        tiles: ['1', '2', '3', '4', '5', '6', '7', '8', 'empty', 'flag', 'mine', 'mine_red', 'mine_x', 'question', 'question_pressed', 'unpressed']
    };

    const allPaths = [];
    Object.entries(images).forEach(([folder, files]) => {
        files.forEach(file => allPaths.push(`${base}${folder}/${file}.png`));
    });

    let loaded = 0;
    const total = allPaths.length;

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error(`Timeout: ${loaded}/${total} imagens carregadas`));
        }, 10000); // 10 segundos

        allPaths.forEach(path => {
            const img = new Image();
            img.onload = img.onerror = () => {
                loaded++;
                if (loaded === total) {
                    clearTimeout(timeout);
                    resolve();
                }
            };
            img.src = path;
        });
    });
}

document.body.style.opacity = '0';
preloadImages()
    .then(() => {
        document.body.style.opacity = '1';
    })
    .catch(err => {
        console.error('Erro no preload:', err);
        document.body.style.opacity = '1';
    });