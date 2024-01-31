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


function onPlayGame() {
    if(onPlayGame.didCall) return;
    onPlayGame.didCall = true;

    document.getElementById('title-screen').remove();
    document.getElementById('game-screen').dataset.active = '';
    startGame();
}

const GAME_WIDTH = 6;
const GAME_HEIGHT = 8;

const game_board = new Array(GAME_WIDTH).fill(null).map(() => new Array(GAME_HEIGHT).fill(0));

/** @type {CanvasRenderingContext2D} */
const ctx = document.getElementById('game-canvas').getContext('2d');
ctx.transform(64, 0, 0, 64, 0, 0);

game_board.forEach(i => {
    for(let x = 0; x < i.length; x++) {
        i[x] = Math.max(~~(Math.random() * 14), 0);
    }
})

function startGame() {
    requestAnimationFrame(function onGameTick() {
        drawGame();
        requestAnimationFrame(onGameTick)
    });
    setInterval(applyPhysics, 200);
}

function applyPhysics() {
    for(let x = 0; x < GAME_WIDTH; x++) {
        for(let y = 0; y < GAME_HEIGHT - 1; y++) {
            if(game_board[x][y] === 0) {
                game_board[x][y] = game_board[x][y + 1];
                game_board[x][y + 1] = 0;
            }
        }
    }
}

function drawGame() {
    ctx.clearRect(0, 0, 9, 12)
    if(mushroom_images.isLoaded) {
        for(let x = 0; x < GAME_WIDTH; x++) {
            for(let y = 0; y < GAME_HEIGHT; y++) {
                let displayX = x * 1.2;
                let displayY = 11 - y * 1.2;

                let value = game_board[x][y];
                if(value > 0) {
                    ctx.drawImage(mushroom_images.getImage(value - 1), displayX, displayY, 1, 1);
                }
            }
        }
    }
}