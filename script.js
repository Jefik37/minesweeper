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
}

const difficulties ={
    'beginner' :{rows : 9, columns : 9, mines : 10},
    'intermediate' :{rows : 16, columns : 16, mines : 40},
    'expert' :{rows : 30, columns : 16, mines : 99},
    'custom' :{},
}


let grid, leftClicks, currentDifficulty, rightClicks, updateTimerInterval;
let mineCount, ended, shuffledCells, lastElementCell, allCellsArray;
let rows, columns, mines, squaresLeft, won, toggleFlag;
let scaleFrame = 1;
let middleMouse;
let toggleQuestion = false;

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
    timer.pause();
    ended = true;

    if(squaresLeft === 0){
        id_elements.smiley.src = './assets/smiley/sunglasses.png';
        allCellsArray.forEach(cell => {
            cell.html.style.cursor = 'auto';
            if(cell.text === 'mine'){
                cell.html.src = './assets/tiles/flag.png';
                mineCount = 0;
                updateLCD(id_elements.mineCount, mineCount);
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
            else{
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
            updateLCD(id_elements.timer, timer.getSeconds());
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
    updateLCD(id_elements.mineCount, mineCount);
    if(leftClicks === 1 && !ended) timer.start();
    if(squaresLeft === 0 && mineCount >= 0){
        endedGame(cell);
    }
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
        leftClicks++;
        for(const [di, dj] of offsets){
            const ni = row + di;
            const nj = column + dj;
            if(ni >= 0 && ni < rows && nj >= 0 && nj < columns){
                if(!grid[ni][nj].clicked && grid[ni][nj].variant !== 'flag') clickCell(ni, nj, 0, false)
            }
        }
    }
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

function updateLCD(element, newValue){
    element.replaceChildren();
    if(newValue>999) newValue = 999;
    for(let digit of String(newValue).padStart(3,'0')){
        appendImageToElement(`lcd/${digit}`, element);
    }
}

function appendImageToElement(imageName, element){
    const cell = document.createElement('img');
    cell.className = 'sprite';
    cell.src = `./assets/${imageName}.png`;
    cell.ondragstart = () => false;
    cell.style.width = '13rem';
    // cell.style.cursor = 'default';
    element.appendChild(cell);
    lastElementCell = cell;
}

function openMenu(){

    // id_elements.outerMenu.style.width = id_elements.outerGrid.offsetWidth + "px";
    // id_elements.outerMenu.style.height = id_elements.outerGrid.offsetHeight + "px";

    if(id_elements.outerMenu.style.display === 'none'){
        updateFontSize(9, 9);
        id_elements.outerMenu.style.display = '';
        id_elements.outerGrid.style.display = 'none';
    }
    else{
            updateFontSize(rows, columns);
        id_elements.outerGrid.style.display = '';
        id_elements.outerMenu.style.display = 'none';
    }
}

// function createFrame(rows, columns){
//     id_elements.frame.style.gridTemplateColumns = `repeat(${(columns*scaleFrame)+2}, 1fr)`;
//     id_elements.frame.style.gridAutoRows = 'min-content';

//     appendImageToElement('border/topLeft', id_elements.frame);

//     appendImageToElement('border/horizontal', id_elements.frame);
//     lastElementCell.style.gridColumn = `span ${columns*scaleFrame} `;
//     lastElementCell.onload = function() {
//         this.style.width = '100%';
//         this.style.height = this.naturalHeight + 'px';
//         this.style.objectFit = 'fill';
//     };

//     appendImageToElement('border/topRight', id_elements.frame);
//     appendImageToElement('border/vertical', id_elements.frame);
//     // lastElementCell.style.gridRow = `span ${2*scaleFrame}`;
//     id_elements.frame.appendChild(id_elements.visor);
//     // id_elements.visor.style.gridRow = `span ${2*scaleFrame}`;
//     id_elements.visor.style.gridColumn = `span ${columns*scaleFrame} `;
//     appendImageToElement('border/vertical', id_elements.frame);
//     // lastElementCell.style.gridRow = `span ${2*scaleFrame}`;
//     appendImageToElement('border/TLeft', id_elements.frame);
//     appendImageToElement('border/horizontal', id_elements.frame);
//     lastElementCell.style.gridColumn = `span ${columns*scaleFrame} `;
//     lastElementCell.style.contain = 'size';

//     appendImageToElement('border/TRight', id_elements.frame);
//     appendImageToElement('border/vertical', id_elements.frame);
//     lastElementCell.style.gridRow = `span ${rows*scaleFrame}`;
//     id_elements.frame.appendChild(id_elements.grid);
//     id_elements.grid.style.gridRow = `span ${rows*scaleFrame} `;
//     id_elements.grid.style.gridColumn = `span ${columns*scaleFrame} `;
//     appendImageToElement('border/vertical', id_elements.frame);
//     lastElementCell.style.gridRow = `span ${rows*scaleFrame}`;
//     appendImageToElement('border/bottomLeft', id_elements.frame);
//     appendImageToElement('border/horizontal', id_elements.frame);
//     lastElementCell.style.gridColumn = `span ${columns*scaleFrame} `;
//     lastElementCell.style.contain = 'size';

//     appendImageToElement('border/bottomRight', id_elements.frame);

// }

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

function updateFontSize(_rows, _columns){

    const contentWidth  = 16 * _columns + 20;
    const contentHeight = 16 * _rows + 50;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const scale = Math.min(
        vw / contentWidth,
        vh / contentHeight
    );
    const px = Math.max(0.1, Math.min(scale, 3));

    document.documentElement.style.fontSize = `clamp(1px, ${px}px, 30px)`;
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
    console.log(selected.value);
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

    leftClicks = 0;
    rightClicks = 0;
    mineCount = mines;
    squaresLeft = rows*columns - mines;
    toggleFlag = false;

    updateFontSize(rows, columns);

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

    generateAllCellsArray(tmpGrid);
    handleEvents();
    updateLCD(id_elements.mineCount, mineCount);
    updateLCD(id_elements.timer, 0);
    // createFrame(rows, columns);
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
    updateLCD(id_elements.mineCount, mineCount);
}

function handleEvents(){
    allCellsArray.forEach(function(cell){
        cell.html.addEventListener('mousedown',function(e){
            if(!ended && (e.button === 1 || e.buttons === 3)) {
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

        });
        
        cell.html.addEventListener('mouseup', e => {
            if(e.button === 0 && !middleMouse)clickCell(cell.row, cell.column, e.button, true);
            if(middleMouse && e.buttons === 0){
                middleMouse = false;
                undoMiddleMousePreview();
                if(cell.clicked) middleMouseMode(cell.row, cell.column)};
        });

        cell.html.addEventListener('mouseover',function(e){
            if(!ended && e.buttons === 1 && !cell.clicked && cell.variant != 'flag' && !toggleFlag){
                cell.html.src = cell.variant? `./assets/tiles/${cell.variant}_pressed.png` :  './assets/tiles/empty.png';
            }
            if(!ended && middleMouse) middleMousePreview(cell);
        });

        cell.html.addEventListener('mouseleave',function(e){
            if(!ended && !cell.clicked){cell.html.src = './assets/tiles/unpressed.png';}
            else if(cell.variant){cell.html.src = `./assets/tiles/${cell.variant}.png`;}
            if(!ended) undoMiddleMousePreview();
        });
    })

    id_elements.smiley.addEventListener('mousedown', e => {if(e.button==0){id_elements.smiley.src = './assets/smiley/pressed.png';}});

    id_elements.smiley.addEventListener('mousedown', e => {
        if(e.button == 0){
            id_elements.smiley.src = './assets/smiley/pressed.png';
        }
    });

    id_elements.smiley.addEventListener('mouseleave', e => {
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

    document.addEventListener('mouseup', (e) => {
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

}


id_elements.mineCount.addEventListener('mouseup', e => {
    if(e.button === 0){
        toggleFlag = !toggleFlag;
        id_elements.mineCount.style.boxShadow = toggleFlag? "2rem 2rem 0rem rgba(255, 0, 0, 0.5)" : "none";
    }
});

id_elements.timer.addEventListener('mouseup', e => {
    if(e.button === 0){
        openMenu();
    }
});

id_elements.smiley.addEventListener("mouseup", function(e){restartGame(currentDifficulty)});

restartGame(difficulties['beginner']);

id_elements.grid.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener("resize", () => updateFontSize(rows, columns));
