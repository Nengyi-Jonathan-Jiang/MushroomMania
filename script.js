const mushroom_images = new class MushroomImages {
    #images = null;

    constructor() {
        Promise.all(new Array(13).fill(null).map((_, i) => new Promise(resolve => {
            const img = document.createElement('img');
            img.src = `res/mushrooms/mushroom-${i + 1}.png`;
            img.onload = _ => resolve(img);
        }))).then(results => this.#images = results);
    }

    getImage(level) {
        return this.#images === null ? null : this.#images[level];
    }

    get isLoaded() {
        return this.#images !== null;
    }
};

const font_renderer = new class FontRenderer {
    #images = Object.create(null);

    constructor() {}

    /**
     * @param {string} string
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} size
     * @param {number} x
     * @param {number} y
     */
    drawString(string='', ctx, size, x, y) {
        let char_width = size;
        let char_size = size * 11 / 8;

        for(let i = 0; i < string.length; i++) {
            const charCode = string.charCodeAt(i);
            if(this.#images[charCode] === null) continue;
            if(!(charCode in this.#images)) {
                this.#images[charCode] = null;
                this.loadChar(charCode);
                continue;
            }

            const img = this.#images[charCode];

            ctx.drawImage(img, x + i * char_width, y, char_width, char_size);
        }
    }

    /**
     * @param {number} charCode
     */
    loadChar(charCode) {
        const img = document.createElement('img');
        img.src = `res/font/${charCode}.png`;
        img.onload = _ => this.#images[charCode] = img;
    }
}


function onPlayGame() {
    if(onPlayGame.didCall) return;
    onPlayGame.didCall = true;

    document.getElementById('content').appendChild(document.getElementById('title-screen'));
    document.getElementById('game-screen').dataset.active = '';
    startGame();
}

const GAME_WIDTH = 6;
const GAME_HEIGHT = 9;

const game_board = new Array(GAME_WIDTH).fill(null).map(() => new Array(GAME_HEIGHT + 2).fill(0));

const aux = document.createElement('canvas');
[aux.width, aux.height] = [576, 768];
/** @type {CanvasRenderingContext2D} */
const ctx = document.getElementById('game-canvas').getContext('2d');
const auxCtx = aux.getContext('2d');
auxCtx.transform(64, 0, 0, 64, 0, 0);
auxCtx.imageSmoothingEnabled = false;

let next = [1, 1];
let curr = [1, 1];
let currPos = 0;
let currRot = 0;
let max = 2;
let didUsePhysics = false;
let didMatch = false;
let score = 0;

function startGame() {
    let sDown = false;
    window.onkeydown = ({key}) => {
        switch(key.toLowerCase()) {
            case 'w': 
                if((currRot & 1) || currPos < GAME_WIDTH - 1) currRot++; 
                break;
            case 'a': 
                if(currPos > 0) currPos--;
                break;
            case 'd': 
                if(currPos < GAME_WIDTH - 1 - (currRot & 1)) currPos++; 
                break;
            case 's': {
                if(didUsePhysics || didMatch || sDown) return;
                sDown = true;
                // drop the thing
                let dx1 = [0, 1, 0, 0][currRot & 3];
                let dy1 = [0, 0, 1, 0][currRot & 3];
                let dx2 = [0, 0, 0, 1][currRot & 3];
                let dy2 = [1, 0, 0, 0][currRot & 3];

                let x1 = (currPos + dx1);
                let x2 = (currPos + dx2);
                let y1 = GAME_HEIGHT - dy1 - 2;
                let y2 = GAME_HEIGHT - dy2 - 2;

                if(game_board[x1][y1] !== 0 || game_board[x2][y2] !== 0) {
                    console.log(game_board[x1][y1] + ' ' + game_board[x2][y2]);
                    console.log(game_board)
                    alert('You lost!')
                    window.location.href = window.location.href;
                }

                game_board[x1][y1] = curr[0];
                game_board[x2][y2] = curr[1];

                curr = next;
                next = [~~(Math.random() * Math.random() * max) + 1, ~~(Math.random() * Math.random() * max) + 1]
            }
        }
    }
    window.onkeyup = ({key}) => {
        if(key.toLowerCase() === 's') sDown = false;
    }

    requestAnimationFrame(function onGameTick() {
        drawGame();
        requestAnimationFrame(onGameTick)
    });
    setInterval(applyPhysics, 100);
}

function applyPhysics() {
    let _didUsePhysics = false;
    for(let x = 0; x < GAME_WIDTH; x++) {
        for(let y = 0; y < GAME_HEIGHT + 1; y++) {
            if(game_board[x][y] === 0 && game_board[x][y + 1] !== 0) {
                _didUsePhysics = true;
                game_board[x][y] = game_board[x][y + 1];
                game_board[x][y + 1] = 0;
            }
        }
    }
    if(!(didUsePhysics = _didUsePhysics)) {
        applyMatches();
    }
}

function applyMatches() {
    let _didMatch = false;
    let changes = [];
    for(let y = 0; y < GAME_HEIGHT; y++) {
        for(let x = 0; x < GAME_WIDTH; x++) {
            const shroom = game_board[x][y];
            if(shroom === 0) continue;

            // DFS
            let group = [[x, y]]
            let edge = [[x, y]];
            while(edge.length) {
                let [xx, yy] = edge.shift();

                function add(xxx, yyy){
                    if(game_board[xxx]?.[yyy] !== shroom) return;
                    if(group.find(i => i.toString() === [xxx, yyy].toString()) !== undefined) return
                    edge.push([xxx, yyy]);
                    group.push([xxx, yyy]);
                }

                add(xx - 1, yy);
                add(xx + 1, yy);
                add(xx, yy - 1);
                add(xx, yy + 1);
            }

            if(group.length > 2) {
                score +=
                    [0, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000][shroom] * (group.length - 2)
                group.forEach(([xx, yy]) => game_board[xx][yy] = 0);
                changes.push([x, y, shroom]);
                _didMatch = true;
            }
        }
    }
    changes.forEach(([x, y, shroom]) => {
        game_board[x][y] = shroom + 1;
        max = Math.max(shroom + 1, max);
    })
    didMatch = _didMatch;
}

function drawGame() {
    auxCtx.clearRect(0, 0, 9, 12)
    ctx.clearRect(0, 0, 576, 768);

    {
        const o = (currRot & 1) + 1
        auxCtx.strokeStyle = '#3b007b';
        auxCtx.lineWidth = o;
        auxCtx.beginPath();
        auxCtx.moveTo(currPos + o / 2, 0);
        auxCtx.lineTo(currPos + o / 2, 11);
        auxCtx.closePath();
        auxCtx.stroke();
    }
    

    if(mushroom_images.isLoaded) {
        for(let x = 0; x < GAME_WIDTH; x++) {
            for(let y = 0; y < GAME_HEIGHT; y++) {
                let displayX = x * (1 + 0 / 16);
                let displayY = 10 - y * (1 + 0 / 16);

                let value = game_board[x][y];
                if(value > 0) {
                    auxCtx.drawImage(mushroom_images.getImage(value - 1), displayX, displayY, 1, 1);
                }
            }
        }

        auxCtx.strokeStyle = '#80f';
        auxCtx.lineWidth = 1/16;
        auxCtx.beginPath();
        auxCtx.moveTo(0, 2.5);
        auxCtx.lineTo(6, 2.5);
        auxCtx.closePath();
        auxCtx.stroke();

        // Draw current thing
        {
            let dx1 = [0, 1, 0, 0][currRot & 3];
            let dy1 = [0, 1, 1, 1][currRot & 3];
            let dx2 = [0, 0, 0, 1][currRot & 3];
            let dy2 = [1, 1, 0, 1][currRot & 3];

            let x1 = (currPos + dx1);
            let x2 = (currPos + dx2);
            let y1 = dy1;
            let y2 = dy2;

            auxCtx.drawImage(mushroom_images.getImage(curr[0] - 1), x1, y1, 1, 1);
            auxCtx.drawImage(mushroom_images.getImage(curr[1] - 1), x2, y2, 1, 1);
        }
    }

    font_renderer.drawString(`SCORE:${score.toString().padStart(6, '0')}`, auxCtx, 0.5, 0.125, 11.22);
    font_renderer.drawString("N", auxCtx, 0.5, 7.5, 7);
    font_renderer.drawString("E", auxCtx, 0.5, 7.5, 7.6);
    font_renderer.drawString("X", auxCtx, 0.5, 7.5, 8.2);
    font_renderer.drawString("T", auxCtx, 0.5, 7.5, 8.8);
    font_renderer.drawString(":", auxCtx, 0.5, 7.5, 9.4);

    font_renderer.drawString("A=\x01", auxCtx, 0.5, 7, 0);
    font_renderer.drawString("D=\x02", auxCtx, 0.5, 7, 1);
    font_renderer.drawString("W=\x03", auxCtx, 0.5, 7, 2);
    font_renderer.drawString("S=\x04", auxCtx, 0.5, 7, 3);

    auxCtx.drawImage(mushroom_images.getImage(next[0] - 1), 7.185, 10, 1, 1);
    auxCtx.drawImage(mushroom_images.getImage(next[1] - 1), 7.185, 11, 1, 1);

    auxCtx.drawImage(document.getElementById('title-right'), 6.935, 4.5, 1.5, 1.5)

    ctx.drawImage(aux, 0, 0);
}