const mushroom_images = new class MushroomImages {
    #images = null;
    #mushroomMen = null;
    #bomb = null;

    constructor() {
        Promise.all(new Array(12).fill(null).map((_, i) => new Promise(resolve => {
            const img = document.createElement('img');
            img.src = `res/mushrooms/mushroom-${i + 1}.png`;
            img.onload = _ => resolve(img);
        }))).then(results => this.#images = results);

        Promise.all(new Array(4).fill(null).map((_, i) => new Promise(resolve => {
            const img = document.createElement('img');
            img.src = `res/mushroom-man/mushroom-man-${i + 1}.png`;
            img.onload = _ => resolve(img);
        }))).then(results => this.#mushroomMen = results);

        const bombImg = document.createElement('img');
        bombImg.src = `res/bomb.png`;
        bombImg.onload = _ => this.#bomb = bombImg;
    }

    getImage(level) {
        return this.#images === null ? null : this.#images[level];
    }

    get isLoaded() {
        return this.#images !== null;
    }

    getMushroomMan(level) {
        return this.#mushroomMen === null ? null : this.#mushroomMen[level];
    }
};

const font_renderer = new class FontRenderer {
    #images = Object.create(null);

    constructor() {
    }

    /**
     * @param {string} string
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} size
     * @param {number} x
     * @param {number} y
     */
    drawString(string = '', ctx, size, x, y) {
        let char_width = size;
        let char_size = size * 11 / 8;

        for (let i = 0; i < string.length; i++) {
            const charCode = string.charCodeAt(i);
            if (this.#images[charCode] === null) continue;
            if (!(charCode in this.#images)) {
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
};

const GAME_WIDTH = 7;
const GAME_HEIGHT = 8;
/** @type {number[][]} */
let game_board;
let next = [1, 2];
let curr = [1, 1];
let currPos = 0;
let currRot = 0;
let max = 2;
let didUsePhysics = false;
let didMatch = false;
let score = 0;


const aux = document.createElement('canvas');
[aux.width, aux.height] = [576, 768];
/** @type {CanvasRenderingContext2D} */
const ctx = document.getElementById('game-canvas').getContext('2d');
const auxCtx = aux.getContext('2d');
auxCtx.transform(64, 0, 0, 64, 0, 0);
auxCtx.imageSmoothingEnabled = false;

async function wait(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

{
    window.addEventListener('touchstart', handleTouchStart, false);
    window.addEventListener('touchmove', handleTouchMove, false);

    let xDown = null;
    let yDown = null;

    function getTouches(evt) {
        return evt.touches
    }

    function handleTouchStart(evt) {
        const firstTouch = getTouches(evt)[0];
        xDown = firstTouch.clientX;
        yDown = firstTouch.clientY;
    }

    function handleTouchMove(evt) {
        if (!xDown || !yDown) return;
        const xUp = evt.touches[0].clientX;
        const yUp = evt.touches[0].clientY;

        const xDiff = xDown - xUp;
        const yDiff = yDown - yUp;

        const movement = Math.hypot(xDiff, yDiff);
        if (movement < 5) return;
        if (Math.abs(xDiff) > Math.abs(yDiff)) {/*most significant*/
            if (xDiff > 0) {
                window.onkeydown({key: 'a'});
            } else {
                window.onkeydown({key: 'd'});
            }
        } else {
            if (yDiff > 0) {
                window.onkeydown({key: 'w'});
            } else {
                window.onkeydown({key: 's'});
                window.onkeyup({key: 's'});
            }
        }
        /* reset values */
        xDown = null;
        yDown = null;
    }
}

(async function run(){
    // Game start
    await new Promise(resolve => (document.getElementById('play-button').onclick = resolve));
    document.getElementById('content').appendChild(document.getElementById('title-screen'));
    document.getElementById('game-screen').dataset.active = '';

    game_board = new Array(GAME_WIDTH).fill(null).map(() => new Array(GAME_HEIGHT + 3).fill(0));
    next = [1, 2];
    curr = [1, 1];
    currPos = 0;
    currRot = 0;
    max = 2;
    score = 0;

    while (true) {
        // Await input
        await new Promise(resolve => {
            window.onkeydown = ({key}) => {
                switch (key.toLowerCase()) {
                    case 'w':
                        if ((currRot & 1) || currPos < GAME_WIDTH - 1) currRot++;
                        break;
                    case 'a':
                        if (currPos > 0) currPos--;
                        break;
                    case 'd':
                        if (currPos < GAME_WIDTH - 1 - (currRot & 1)) currPos++;
                        break;
                    case 's':
                        resolve();
                }
            }
        })
        window.onkeydown = () => {};

        // Apply input
        let dx1 = [0, 1, 0, 0][currRot & 3];
        let dy1 = [0, 0, 1, 0][currRot & 3];
        let dx2 = [0, 0, 0, 1][currRot & 3];
        let dy2 = [1, 0, 0, 0][currRot & 3];

        let x1 = (currPos + dx1);
        let x2 = (currPos + dx2);
        let y1 = GAME_HEIGHT - dy1 + 2;
        let y2 = GAME_HEIGHT - dy2 + 2;

        if (game_board[x1][y1] !== 0 || game_board[x2][y2] !== 0) {
            alert('Game over!');
            break;
        }

        game_board[x1][y1] = curr[0];
        game_board[x2][y2] = curr[1];
        curr = null;


        // Apply game rules
        {
            do {
                let [didApplyPhysics, didMatch] = applyPhysics() ? [true, false] : [false, applyMatches()];
                if(!didApplyPhysics && !didMatch) break;
                if(didApplyPhysics) {
                    await wait(100);
                }
                if(didMatch) {
                    await  wait(300);
                }
            } while (true);
        }

        // Check for fail condition
        if (!game_board.map(x => x.findIndex(i => i === 0)).every(x => x >= 0 && x <= GAME_HEIGHT)) {
            alert('Game over!');
            break;
        }

        // Give next shrooms
        curr = next;
        next = [~~(Math.random() * Math.random() * max) + 1, ~~(Math.random() * Math.random() * max) + 1]
    }

    document.getElementById('content').appendChild(document.getElementById('game-screen'));
    document.getElementById('game-screen').dataset.active = '';
    run();
})();

function applyPhysics() {
    let didUsePhysics = false;
    for (let x = 0; x < GAME_WIDTH; x++) {
        for (let y = 0; y < game_board[x].length - 1; y++) {
            if (game_board[x][y] === 0 && game_board[x][y + 1] !== 0) {
                didUsePhysics = true;
                game_board[x][y] = game_board[x][y + 1];
                game_board[x][y + 1] = 0;
            }
        }
    }
    return didUsePhysics;
}
function applyMatches() {
    let didMatch = false;
    let changes = [];
    for (let y = 0; y < game_board[0].length; y++) {
        for (let x = 0; x < GAME_WIDTH; x++) {
            const shroom = game_board[x][y];
            if (shroom === 0) continue;

            // DFS
            let group = [[x, y]]
            let edge = [[x, y]];
            while (edge.length) {
                let [xx, yy] = edge.shift();

                function add(xxx, yyy) {
                    if (game_board[xxx]?.[yyy] !== shroom) return;
                    if (group.find(i => i.toString() === [xxx, yyy].toString()) !== undefined) return
                    edge.push([xxx, yyy]);
                    group.push([xxx, yyy]);
                }

                add(xx - 1, yy);
                add(xx + 1, yy);
                add(xx, yy - 1);
                add(xx, yy + 1);
            }

            if (group.length > 2) {
                score += [0, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000][shroom] * (group.length - 2)
                group.forEach(([xx, yy]) => game_board[xx][yy] = 0);
                changes.push([x, y, shroom]);
                didMatch = true;
            }
        }
    }
    changes.forEach(([x, y, shroom]) => {
        game_board[x][y] = shroom + 1;
        max = Math.max(shroom + 1, max);
    });
    return didMatch;
}

(function drawGame() {
    auxCtx.clearRect(0, 0, 9, 12)
    ctx.clearRect(0, 0, 576, 768);

    {
        auxCtx.strokeStyle = '#80f';
        auxCtx.lineWidth = 1 / 16;
        auxCtx.beginPath();
        auxCtx.moveTo(0, 2.90625);
        auxCtx.lineTo(7, 2.90625);
        auxCtx.closePath();
        auxCtx.stroke();

        const o = (currRot & 1) + 1
        auxCtx.strokeStyle = '#0003';
        auxCtx.lineWidth = o;
        auxCtx.beginPath();
        auxCtx.moveTo(currPos + o / 2, 0);
        auxCtx.lineTo(currPos + o / 2, 11);
        auxCtx.closePath();
        auxCtx.stroke();
    }


    if (mushroom_images.isLoaded && game_board) {
        for (let x = 0; x < GAME_WIDTH; x++) {
            for (let y = 0; y < game_board[x].length; y++) {
                let displayX = x;
                let displayY = 10 - y;

                let value = game_board[x][y];
                if (value > 0) {
                    auxCtx.drawImage(mushroom_images.getImage(value - 1), displayX, displayY, 1, 1);
                }
            }
        }

        // Draw current thing
        if (curr != null) {
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

        // Draw next thing
        auxCtx.drawImage(mushroom_images.getImage(next[0] - 1), 7.435, 10, 1, 1);
        auxCtx.drawImage(mushroom_images.getImage(next[1] - 1), 7.435, 11, 1, 1);
    }

    font_renderer.drawString(`SCORE:${score.toString().padStart(8, '0')}`, auxCtx, 0.5, 0.125, 11.22);
    font_renderer.drawString("N", auxCtx, 0.5, 7.75, 7);
    font_renderer.drawString("E", auxCtx, 0.5, 7.75, 7.6);
    font_renderer.drawString("X", auxCtx, 0.5, 7.75, 8.2);
    font_renderer.drawString("T", auxCtx, 0.5, 7.75, 8.8);
    font_renderer.drawString(":", auxCtx, 0.5, 7.75, 9.4);

    font_renderer.drawString("A=\x01", auxCtx, 0.5, 7.25, 0);
    font_renderer.drawString("D=\x02", auxCtx, 0.5, 7.25, 1);
    font_renderer.drawString("W=\x03", auxCtx, 0.5, 7.25, 2);
    font_renderer.drawString("S=\x04", auxCtx, 0.5, 7.25, 3);

    if(mushroom_images.getMushroomMan(0) !== null)
        auxCtx.drawImage(mushroom_images.getMushroomMan(~~((max - 1) / 3)), 7.185, 4.5, 1.5, 1.5)

    ctx.drawImage(aux, 0, 0);

    requestAnimationFrame(drawGame);
})()