// Screen parameters
const resolution = Math.min(2, getDevicePixelRatio());
let canvas2d;
let ctx;
let targetPoint;
const DEBUG = isLocalHost();
let stats;
let motions;
const drops = [];

// Scene parameters
const sizeFactor = Math.max(getViewport()[0], getViewport()[1]) / 1200;
const debugPoints = [];
const G = new Point(0, 3);
const perlinMapRes = 100;
const perlinMapX = [];
const perlinMapY = [];
const colors = new Array(1000);

// Paint parameters
const gradientStops = [];
const color0 = '#f4481a';
const color1 = '#030744';
const color2 = '#20246d';

const initScene = () => {
    // Add Stats
    stats = new Stats();
    motions = new MotionSimulator();
    if (DEBUG) {
        stats.showPanel(0);
        document.body.appendChild(stats.dom);
    }
    // Setup canvas
    canvas2d = getCanvas(getViewport()[0] * resolution, getViewport()[1] * resolution, 'canvas2d', ['main-canvas']);
    canvas2d.style.width = getViewport()[0] + 'px';
    canvas2d.style.height = getViewport()[1] + 'px';
    ctx = canvas2d.getContext('2d');
    document.body.appendChild(canvas2d);
    // Setup perlin
    [perlinMapX, perlinMapY].forEach((array) => {
        noise.seed(Math.random())
        for (let y = 0; y < perlinMapRes; y++) {
            for (let x = 0; x < perlinMapRes; x++) {
                array.push(noise.perlin2(x / 20, y / 20));
            }
        }
    });
    // Setup colors
    const colorGradient = getCanvas(colors.length, 100, 'canvas2d');
    const cgCtx = colorGradient.getContext('2d');
    const grd = cgCtx.createLinearGradient(0, 0, colorGradient.width, 0);
    
    grd.addColorStop(0, '#27368E');
    grd.addColorStop(0.1761, '#373BBD');
    grd.addColorStop(0.3068, '#3F3384');
    grd.addColorStop(0.3722, '#482862');
    grd.addColorStop(0.5044, '#4E1F3B');
    grd.addColorStop(0.5857, '#87283F');
    grd.addColorStop(0.6671, '#B13E41');
    grd.addColorStop(0.7397, '#D74B3E');
    grd.addColorStop(0.8719, '#EC5834');
    cgCtx.fillStyle = grd;
    cgCtx.fillRect(0, 0, colorGradient.width, colorGradient.height);
    const myImageData = cgCtx.getImageData(0, 0, colors.length, 1);
    for (let i = 0; i < colors.length; i++) {
        colors[i] = '#' + (
            ((myImageData.data[i * 4]) << 16) +
            ((myImageData.data[i * 4 + 1]) << 8) +
            ((myImageData.data[i * 4 + 2]) << 0)
            ).toString(16);
    }
    initDrops();
    // Setup events
    let timeoutID = -1;
    window.addEventListener('resize', () => {
        clearTimeout(timeoutID);
        timeoutID = setTimeout(() => {
            canvas2d.width = getViewport()[0] * resolution;
            canvas2d.height = getViewport()[1] * resolution;
            canvas2d.style.width = getViewport()[0] + 'px';
            canvas2d.style.height = getViewport()[1] + 'px';
            initDrops();
        }, 300);
    });
};

const initDrops = () => {
    drops.length = 0;
    for (let index = 0; index < 10000; index++) {
        const drop = new Drop(Math.random() * getViewport()[0] * resolution, -100000 * Math.random());
        drop.radius = 5 + 80 * Math.random();
        const n = Math.sin(drop.radius/85 * Math.PI);
        drop.color = colors[Math.floor(colors.length * (1-n))];
        drops.push(drop);
    }
    // drops.sort((a, b) => { return a.radius < b.radius });
}

const updateFrame = () => {
    stats.begin();
    motions.update();
    updateScene();
    renderFrame();
    stats.end();
    requestAnimationFrame(updateFrame);
};

const updateScene = () => {
    const k = 0.5 - motions.x/canvas2d.width * resolution;
    drops.forEach(drop => {
        const x = Math.round(drop.x/canvas2d.width * perlinMapRes);
        const y = Math.round(drop.y/canvas2d.height * perlinMapRes);
        const n = y * perlinMapRes + x;
        drop.y += G.y + drop.radius / 50;
        if (y > 0) {
            drop.x += G.x - 6 * k;
            drop.x += 6 * perlinMapX[n];
            drop.y += 8 * perlinMapY[n];
        }
    });
    drops.sort((a, b) => { return a.y - a.radius > b.y - b.radius ? -1 : 1});
};

const renderFrame = () => {
    //ctx.clearRect(0, 0, canvas2d.width, canvas2d.height);
    drops.forEach(drop => {
        ctx.fillStyle = drop.color;
        ctx.beginPath();
        ctx.arc(drop.x, drop.y, drop.radius, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fill();
    });
};

//All starts here when DOM is ready
document.addEventListener("DOMContentLoaded", (event) => {
    initScene();
    updateFrame();
});

class Drop extends Point {
    color;
    radius;
    constructor(x, y, color) {
        super(x, y);
        this.color = color || "#FFFFFF";
        this.radius = 10;
    }
}