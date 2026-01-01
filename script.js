const id_elements ={
    grid : document.getElementById('grid'),
    mineCount : document.getElementById('mineCount'),
    leftClicks : document.getElementById('leftClicks'),
    rightClicks : document.getElementById('rightClicks'),
    toggleFlag : document.getElementById('toggleFlag'),
    frame : document.getElementById('frame'),
    visor : document.getElementById('visor'),
    timer : document.getElementById('timer'),
    smiley : document.getElementById('smiley'),
    outerMenu : document.getElementById('outerMenu'),
    outerGrid : document.getElementById('outerGrid'),
    newGame : document.getElementById('newGame'),
    inputHeight : document.getElementById('inputHeight'),
    inputWidth : document.getElementById('inputWidth'),
    inputMines : document.getElementById('inputMines'),
    question : document.getElementById('question'),
    currentTime : document.getElementById('currentTime'),
    totalClicks : document.getElementById('totalClicks'),
    totalClicksDiv : document.getElementById('totalClicksDiv'),
}

const difficulties ={
    'beginner' :{rows : 9, columns : 9, mines : 10},
    'intermediate' :{rows : 16, columns : 16, mines : 40},
    'expert' :{rows : 16, columns : 30, mines : 99},
    'custom' :{},
}


let grid, leftClicks, middleClicks, rightClicks, currentDifficulty, updateTimerInterval;
let mineCount, ended, shuffledCells, lastElementCell, allCellsArray;
let rows, columns, mines, squaresLeft, won, toggleFlag;
let scaleFrame = 1;
let middleMouse;
let toggleQuestion = true;
let longPressed = false;
let lastTap = 0;
let holdingTime = 0;
let menuIsOPen = id_elements.outerMenu.style.display === '';

const placeFlagDelay = 120;
const doubleTapDelay = 300;
const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

class Timer {
    constructor() {
        this.startTime = null;
        this.pausedTime = 0;
        this.totalPaused = 0;
        this.running = false;
        this.interval = null;
        this.onTick = null; // callback opcional
    }

    start() {
        if (this.running) return;
        
        this.running = true;
        const now = performance.now();
        
        if (this.pausedTime) {
            // retomando após pausa
            this.totalPaused += now - this.pausedTime;
            this.pausedTime = 0;
        } else {
            // primeira vez
            this.startTime = now;
        }

        // atualiza a cada 100ms pra ficar mais preciso visualmente
        this.interval = setInterval(() => {
            if (this.onTick) {
                const sec = this.getSeconds();
                if (sec >= 999) {
                    this.pause();
                    return;
                }
                this.onTick(sec);
            }
        }, 100);
    }

    pause() {
        if (!this.running) return;
        
        this.running = false;
        this.pausedTime = performance.now();
        clearInterval(this.interval);
        this.interval = null;
    }

    reset() {
        this.pause();
        this.startTime = null;
        this.pausedTime = 0;
        this.totalPaused = 0;
    }

    getTime() {
        if (!this.startTime) return 0;
        const now = this.running ? performance.now() : this.pausedTime;
        return Math.min((now - this.startTime - this.totalPaused) / 1000, 999.999);
        }

    getSeconds() {
        return Math.floor(this.getTime());
    }

    isRunning() {
        return this.running;
    }
}

const timer = new Timer();

function shuffleArray(array){
    for (let i = array.length - 1; i > 0; i--){
        const j = Math.floor(randomFloat() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function randomFloat(){
    const buf = new Uint32Array(2);
    crypto.getRandomValues(buf);
    const hi = buf[0] & 0x001fffff;
    const lo = buf[1];
    return (hi * 2 ** 32 + lo) / 2 ** 53;
}

function endedGame(currentCell){
    updateCLicksDiv();
    timer.pause();
    ended = true;

    if(squaresLeft === 0){
        id_elements.smiley.src = './assets/smiley/sunglasses.png';
        allCellsArray.forEach(cell => {
            cell.html.style.cursor = 'auto';
            if(cell.text === 'mine'){
                cell.html.src = './assets/tiles/flag.png';
                mineCount = 0;
                updateMineCountLCD(id_elements.mineCount, mineCount);
            }
        });
        
        return;
    }

    id_elements.smiley.src = './assets/smiley/dead.png'
    allCellsArray.forEach(cell => {
        cell.html.style.cursor = 'auto';
        if(cell.text === 'mine'){
            if(cell === currentCell){
                cell.html.src = './assets/tiles/mine_red.png';
            }
            else if(cell.variant != 'flag'){
                cell.html.src = './assets/tiles/mine.png';
            }
        }
        else if(cell.variant === 'flag'){
            cell.html.src = './assets/tiles/mine_x.png';
        }
    });
    
}

function clickCell(row, column, mouseButton, trueClick){
    const cell = grid[row][column];
    fileName = cell.text;

    if(leftClicks === 0){
        populateMines(cell);
        calculateNumbers();
        updateTimerInterval = setInterval(() => {
            id_elements.timer.replaceChildren(makeLCDDiv(timer.getSeconds()));
        }, 1000);

        setInterval(() => id_elements.currentTime.textContent = timer.getTime().toFixed(2), 10);
    }

    if(cell.variant==='flag' && trueClick && mouseButton===0){return;} // to prevent clicking on cells with flags

    if(leftClicks === 0 && cell.text === 'mine' && mouseButton === 0){
        restartGame(currentDifficulty);
        clickCell(row, column, 0, true);
        return;
    }

    if(!ended && !cell.clicked && !won){

        if(mouseButton === 0 && !toggleFlag){
            if(trueClick){leftClicks++};
            cell.clicked = true;
            fileName = cell.text;
            if(cell.text === 'mine'){
                ended = true;
                id_elements.smiley.src = './assets/smiley/dead.png'
                endedGame(cell);
                return;
            }
            else{
                cell.html.style.cursor = 'auto';
                squaresLeft--;
                cell.variant= '';
            }

            calculateEmptySpaces(row, column, 0, false);
            cell.html.src = `./assets/tiles/${cell.text}.png`;         
        }
    }
    
    id_elements.mineCount.replaceChildren(makeLCDDiv(mineCount));
    if(leftClicks === 1 && !ended) timer.start();
    if(squaresLeft === 0 && mineCount >= 0){
        endedGame(cell);
    }
    
    updateCLicksDiv();
}

async function calculateEmptySpaces(row, column){
    const cell = grid[row][column];
    const offsets = [[-1,0], [0,-1], [0,1], [1,0]];
    if(cell.text === 'empty'){
        for(const [di, dj] of offsets) {
            const ni = row + di;
            const nj = column + dj;
            if(ni >= 0 && ni < rows && nj >= 0 && nj < columns){
                if(grid[ni][nj].text !== 'mine' && !grid[ni][nj].clicked && grid[ni][nj].variant !== 'flag'){clickCell(ni, nj, 0, false);}
            }
        }
    }

}

function calculateNumbers(){
    const offsets = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];
    for(let i = 0; i < rows; i++){
        for(let j = 0; j < columns; j++){
            if(grid[i][j].text !== 'mine'){
                let numberBombs = 0;
                for(const [di, dj] of offsets) {
                    const ni = i + di;
                    const nj = j + dj;
                    if(ni >= 0 && ni < rows && nj >= 0 && nj < columns && grid[ni][nj].text === 'mine') {
                        numberBombs++;
                    }
                }
                if(numberBombs === 0){numberBombs = 'empty';}
                grid[i][j].text = numberBombs;
            }
        }
    }
}

function middleMouseMode(row, column){
    middleClicks++;
    const cell = grid[row][column];
    let possibleBombs = 0;

    if(!cell.clicked || cell.text === 'empty') return;
    
    const offsets = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];
    
    for(const [di, dj] of offsets){
        const ni = row + di;
        const nj = column + dj;
        if(ni >= 0 && ni < rows && nj >= 0 && nj < columns){
            if(!grid[ni][nj].clicked && grid[ni][nj].variant === 'flag') possibleBombs++;
        }
    }

    if(possibleBombs === cell.text){
        for(const [di, dj] of offsets){
            const ni = row + di;
            const nj = column + dj;
            if(ni >= 0 && ni < rows && nj >= 0 && nj < columns){
                if(!grid[ni][nj].clicked && grid[ni][nj].variant !== 'flag') clickCell(ni, nj, 0, false)
            }
        }
    }

    updateCLicksDiv();
}

function middleMousePreview(cell){

    const row = cell.row;
    const column = cell.column;

    const offsets = [[0,0], [-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];
    
    for(const [di, dj] of offsets){
        const ni = row + di;
        const nj = column + dj;
        if(ni >= 0 && ni < rows && nj >= 0 && nj < columns){
            
            if(!grid[ni][nj].clicked && grid[ni][nj].variant !== 'flag'){
                grid[ni][nj].html.src = grid[ni][nj].variant ? `./assets/tiles/${grid[ni][nj].variant}_pressed.png` : './assets/tiles/empty.png';
            }
        }
    }
}

function undoMiddleMousePreview(){

    for(element of allCellsArray){
        if (!element.clicked){
            element.html.src = element.variant ? `./assets/tiles/${element.variant}.png` : `./assets/tiles/unpressed.png`
        }
    }
}

function makeLCDDiv(number){
    let newDiv = document.createElement('div');

    for(let digit of String(number).padStart(3,'0')){
        const newDigit = document.createElement('img');
        newDigit.className = 'sprite';
        newDigit.src = `./assets/lcd/${digit}.png`;
        newDigit.ondragstart = () => false;
        newDigit.style.width = '13rem';
        newDiv.appendChild(newDigit);
    }
    return newDiv;
}

function openMenu(){

    if(!menuIsOPen){
        timer.pause();
        id_elements.outerMenu.style.display = '';
        id_elements.outerGrid.style.display = 'none';
    }
    else{
        if(!ended) timer.start();
        id_elements.outerGrid.style.display = '';
        id_elements.outerMenu.style.display = 'none';
    }
    menuIsOPen = !menuIsOPen;
    updateFontSize();

}

function populateMines(cell){
    shuffledCells = shuffleArray(shuffledCells);
    let skippedFirstCLick = false;
    for(let i=0; i<mines; i++){
        if(shuffledCells[i] === cell) skippedFirstCLick = true;
        else shuffledCells[i].text = 'mine';
    }
    if(skippedFirstCLick) shuffledCells[mines].text = 'mine';
}

function generateAllCellsArray(tmpGrid){
    grid = [];
    shuffledCells = [];
    allCellsArray = [];

    for(let i = 0; i < rows; i++){
    grid[i] = [];
        for(let j = 0; j < columns; j++){
            grid[i].push({row : i, column : j, text : 'empty', clicked : false, variant : ''});
            shuffledCells.push(grid[i][j]);
        }
    }

    for(let i=0; i<currentDifficulty.rows; i++){
        for(let j=0; j<currentDifficulty.columns; j++){
            grid[i][j].html = tmpGrid[i][j];
            allCellsArray.push(grid[i][j]);
        }
    }
}

function updateCLicksDiv(){
    id_elements.totalClicksDiv.title = `Left: ${leftClicks}\nRight: ${rightClicks}\nChords: ${middleClicks}`;
    id_elements.totalClicks.textContent = leftClicks+rightClicks+middleClicks;
}

function updateFontSize(){
    document.documentElement.style.fontSize = `${1}px`;
    
    const mainWindow = document.getElementById('mainWindow');
    const actualWidth = mainWindow.offsetWidth+2;
    const actualHeight = mainWindow.offsetHeight+2;
    
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    
    let scale = Math.min(
        (vw * 0.98) / actualWidth,
        (vh * 0.98) / actualHeight
    );
    
    if(!isMobile) scale = Math.min(scale, 3);

    document.documentElement.style.fontSize = `${scale}px`;
}

function newGame(){

    const selected = document.querySelector('input[name="difficulty"]:checked');
    difficulties['custom'].rows = Number(id_elements.inputHeight.value);
    difficulties['custom'].columns = Number(id_elements.inputWidth.value);
    difficulties['custom'].mines = Number(id_elements.inputMines.value);

    if (isNaN(difficulties['custom'].rows) || difficulties['custom'].rows<1){
        difficulties['custom'].rows = 1;
    }
    if (isNaN(difficulties['custom'].columns) || difficulties['custom'].columns<8){
        difficulties['custom'].columns = 8;
    }
    if (isNaN(difficulties['custom'].mines) || difficulties['custom'].mines<1 || difficulties['custom'].mines>=difficulties.rows*difficulties['custom'].columns){
        difficulties['custom'].mines = Math.ceil(difficulties['custom'].columns*difficulties['custom'].rows*0.2);
    }

    toggleQuestion = id_elements.question.checked;

    openMenu();
    restartGame(difficulties[selected.value]);
}

function restartGame(difficulty){

    grid = [];

    currentDifficulty = difficulty;
    // ------------
    // currentDifficulty.mines = 249;
    // currentDifficulty.rows = 50;
    // currentDifficulty.columns = 50;
    // ------------

    // ------------
    // currentDifficulty.mines = 1;
    // currentDifficulty.rows = 22;
    // currentDifficulty.columns = 22;
    // ------------

    rows = currentDifficulty.rows;
    columns = currentDifficulty.columns;
    mines = currentDifficulty.mines;

    clearInterval(updateTimerInterval);
    timer.reset();
    id_elements.currentTime.textContent = '0.00';

    ended = false;
    won = false;
    middleMouse = false;
    longPressed = false;

    leftClicks = 0;
    middleClicks = 0;
    rightClicks = 0;
    mineCount = mines;
    squaresLeft = rows*columns - mines;
    toggleFlag = false;

    id_elements.mineCount.style.boxShadow = "none";

    id_elements.grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    id_elements.grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;

    id_elements.grid.replaceChildren();difficulty
    const tmpGrid = [];

    id_elements.smiley.src = './assets/smiley/smiley.png'

    for(let i = 0; i < rows; i++){
        tmpGrid[i] = [];
        for(let j = 0; j < columns; j++){
            const cell = document.createElement('img');
            cell.style.width = '16rem';
            cell.className = 'cell sprite';
            cell.src = './assets/tiles/unpressed.png';
            tmpGrid[i][j] = cell;
            cell.ondragstart = () => false;
            id_elements.grid.appendChild(cell);

        }
    }

    if(menuIsOPen) openMenu(); 

    generateAllCellsArray(tmpGrid);
    handleEvents();
    id_elements.mineCount.replaceChildren(makeLCDDiv(mineCount));
    id_elements.timer.replaceChildren(makeLCDDiv(0));
    updateFontSize();
    updateCLicksDiv();
}

function useFlag(cell){
    rightClicks++;
    if(toggleQuestion){
        if(cell.variant === 'flag'){
            cell.variant = 'question';
            mineCount++;
            fileName = cell.variant;
        }
        else if(cell.variant === 'question'){
            cell.variant = '';
            fileName = 'unpressed';
        }
        else{
            cell.variant = 'flag';
            mineCount--;
            fileName = cell.variant;
        }
    }
    else{
        if(cell.variant === 'flag'){
            cell.variant = '';
            mineCount++;
            fileName = 'unpressed';
        }
        else{
            cell.variant = 'flag';
            mineCount--;
            fileName = cell.variant;
        }
    }
    cell.html.src = `./assets/tiles/${fileName}.png`;
    id_elements.mineCount.replaceChildren(makeLCDDiv(mineCount));
    updateCLicksDiv();
}

function handleEvents(){
    allCellsArray.forEach(function(cell){
        cell.html.addEventListener('pointerdown',function(e){
            holdingTime = Date.now();

            if(e.button === 0) longPressed = false;

            if(!longPressed){
                if(!ended && (e.button === 1 || e.buttons === 3)){
                    middleMouse = true;
                    middleMousePreview(cell);
                }
                if(!ended && !cell.clicked){
                    if((e.buttons === 2 || (e.button === 0 && toggleFlag))){
                        if(!middleMouse) useFlag(cell);
                    }
                    else if(e.buttons === 1 && cell.variant != 'flag'){
                        id_elements.smiley.src = './assets/smiley/wonder.png';
                        cell.html.src = './assets/tiles/empty.png';
                    }
                }
            }
        });
        
        cell.html.addEventListener('pointerup', e => {
            const now = Date.now();
            if(now - holdingTime > placeFlagDelay && e.button === 0 && !cell.clicked && !ended){
                useFlag(cell);
                longPressed = true;
            }
            else{
                if(e.button === 0 && !middleMouse)clickCell(cell.row, cell.column, e.button, true);
                if(!ended && ((middleMouse && e.buttons === 0) || (now-lastTap < doubleTapDelay))){
                    middleMouse = false;
                    undoMiddleMousePreview();
                    if(cell.clicked) middleMouseMode(cell.row, cell.column)
                };
            }

            lastTap = now;
        });

        cell.html.addEventListener('mouseover',function(e){
            holdingTime = Date.now();
            if(!ended && e.buttons === 1 && !cell.clicked && cell.variant != 'flag' && !toggleFlag){
                cell.html.src = cell.variant? `./assets/tiles/${cell.variant}_pressed.png` :  './assets/tiles/empty.png';
            }
            if(!ended && middleMouse) middleMousePreview(cell);
        });

        cell.html.addEventListener('pointerleave',function(e){
            if(!ended && !cell.clicked){cell.html.src = './assets/tiles/unpressed.png';}
            else if(!ended && cell.variant){cell.html.src = `./assets/tiles/${cell.variant}.png`;}
            if(!ended) undoMiddleMousePreview();
        });
    })

}

id_elements.smiley.addEventListener('pointerdown', e => {
    if(e.button === 0){
        id_elements.smiley.src = './assets/smiley/pressed.png';
    }
});

id_elements.smiley.addEventListener('pointerleave', e => {
    if(e.buttons === 1){
        if(squaresLeft===0){
            id_elements.smiley.src = './assets/smiley/sunglasses.png';
        }
        else if(ended){
            id_elements.smiley.src = './assets/smiley/dead.png';
        }
        else{
            id_elements.smiley.src = './assets/smiley/smiley.png';
        } 
    }
});

id_elements.smiley.ondragstart = () => false;

document.addEventListener('pointerup', (e) => {
    longPressed = false;
    if(squaresLeft===0){
        id_elements.smiley.src = './assets/smiley/sunglasses.png';
    }
    else if(ended){
        id_elements.smiley.src = './assets/smiley/dead.png';
    }
    else{
        id_elements.smiley.src = './assets/smiley/smiley.png';
    } 

    if(middleMouse && e.buttons === 0){
        middleMouse = false;
        undoMiddleMousePreview();
    }
});

id_elements.mineCount.addEventListener('pointerup', e => {
    if(e.button === 0){
        toggleFlag = !toggleFlag;
        id_elements.mineCount.style.boxShadow = toggleFlag? "2rem 2rem 0rem rgba(255, 0, 0, 0.5)" : "none";
    }
});

id_elements.timer.addEventListener('pointerup', e => {
    if(e.button === 0){
        openMenu();
    }
});

id_elements.smiley.addEventListener("pointerup", () => {
    menuIsOPen ? openMenu() : restartGame(currentDifficulty);
});

id_elements.grid.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener("resize", () => updateFontSize());

document.addEventListener('keydown', (e) => {
    if(e.key === 'r' || e.key === 'R') {
        menuIsOPen = false;
        restartGame(currentDifficulty);
    }
});

restartGame(difficulties['beginner']);
