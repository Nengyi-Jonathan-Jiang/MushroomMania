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
const GAME_HEIGHT = 8;

const game_board = new Array(GAME_WIDTH).fill(null).map(() => new Array(GAME_HEIGHT).fill(0));

/** @type {CanvasRenderingContext2D} */
const ctx = document.getElementById('game-canvas').getContext('2d');
ctx.transform(64, 0, 0, 64, 0, 0);
ctx.imageSmoothingEnabled = false;

let next = [1, 1];
let curr = [1, 1];
let currPos = 0;
let currRot = 0;
let max = 2;
let didUsePhysics = false;
let didMatch = false;
let score = 0;

function startGame() {
    window.onkeydown = ({key}) => {
        switch(key.toLowerCase()) {
            case 'w': currRot++; break;
            case 'a': currPos--; break;
            case 'd': currPos++; break;
            case 's': {
                if(didUsePhysics || didMatch) return;
                // drop the thing
                let dx1 = [0, 1, 0, 0][currRot & 3];
                let dy1 = [0, 1, 1, 1][currRot & 3];
                let dx2 = [0, 0, 0, 1][currRot & 3];
                let dy2 = [1, 1, 0, 1][currRot & 3];

                let x1 = (currPos + dx1) % GAME_WIDTH;
                let x2 = (currPos + dx2) % GAME_WIDTH;
                let y1 = GAME_HEIGHT - dy1 - 1;
                let y2 = GAME_HEIGHT - dy2 - 1;

                if(game_board[x1][y1] !== 0 || game_board[x2][y2] !== 0) {
                    alert('You lost!')
                    window.location.href = window.location.href;
                }

                game_board[x1][y1] = curr[0];
                game_board[x2][y2] = curr[1];

                curr = next;
                next = [~~(Math.random() * max) + 1, ~~(Math.random() * max) + 1]
            }
        }
    }

    requestAnimationFrame(function onGameTick() {
        drawGame();
        requestAnimationFrame(onGameTick)
    });
    setInterval(applyPhysics, 200);
}

function applyPhysics() {
    didUsePhysics = false;
    didMatch = false;
    for(let x = 0; x < GAME_WIDTH; x++) {
        for(let y = 0; y < GAME_HEIGHT - 1; y++) {
            if(game_board[x][y] === 0 && game_board[x][y + 1] !== 0) {
                didUsePhysics = true;
                game_board[x][y] = game_board[x][y + 1];
                game_board[x][y + 1] = 0;
            }
        }
    }
    if(!didUsePhysics) {
        applyMatchThree();
    }
}

function applyMatchThree() {
    for(let x = 0; x < GAME_WIDTH; x++) {
        for(let y = 0; y < GAME_HEIGHT - 1; y++) {
            // DFS
            let group = [[x, y]]
            let edge = [[x, y]];
            while(edge.length) {
                let [x, y] = edge;
            }
        }
    }
}

function drawGame() {
    ctx.clearRect(0, 0, 9, 12)
    if(mushroom_images.isLoaded) {
        for(let x = 0; x < GAME_WIDTH; x++) {
            for(let y = 0; y < GAME_HEIGHT; y++) {
                let displayX = x * (1 + 0 / 16);
                let displayY = 10 - y * (1 + 0 / 16);

                let value = game_board[x][y];
                if(value > 0) {
                    ctx.drawImage(mushroom_images.getImage(value - 1), displayX, displayY, 1, 1);
                }
            }
        }

        // Draw current thing
        {
            let dx1 = [0, 1, 0, 0][currRot & 3];
            let dy1 = [0, 1, 1, 1][currRot & 3];
            let dx2 = [0, 0, 0, 1][currRot & 3];
            let dy2 = [1, 1, 0, 1][currRot & 3];

            let x1 = (currPos + dx1) % GAME_WIDTH;
            let x2 = (currPos + dx2) % GAME_WIDTH;
            let y1 = dy1;
            let y2 = dy2;

            ctx.drawImage(mushroom_images.getImage(curr[0] - 1), x1, y1, 1, 1);
            ctx.drawImage(mushroom_images.getImage(curr[1] - 1), x2, y2, 1, 1);
        }
    }

    font_renderer.drawString("SCORE:119250", ctx, 0.5, 0.125, 11.22);
    font_renderer.drawString("N", ctx, 0.5, 7.5, 7);
    font_renderer.drawString("E", ctx, 0.5, 7.5, 7.6);
    font_renderer.drawString("X", ctx, 0.5, 7.5, 8.2);
    font_renderer.drawString("T", ctx, 0.5, 7.5, 8.8);
    font_renderer.drawString(":", ctx, 0.5, 7.5, 9.4);

    font_renderer.drawString("A=\1", ctx, 0.5, 7, 0);
    font_renderer.drawString("D=\2", ctx, 0.5, 7, 1);
    font_renderer.drawString("W=\3", ctx, 0.5, 7, 2);
    font_renderer.drawString("S=\4", ctx, 0.5, 7, 3);

    ctx.drawImage(mushroom_images.getImage(curr[0] - 1), 7.185, 10, 1, 1);
    ctx.drawImage(mushroom_images.getImage(curr[1] - 1), 7.185, 11, 1, 1);

    ctx.drawImage(document.getElementById('title-right'), 6.935, 4.5, 1.5, 1.5)
}