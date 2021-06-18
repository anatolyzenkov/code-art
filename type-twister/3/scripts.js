// Screen parameters
const resolution = Math.min(2, getDevicePixelRatio());
const scale = 1/40;
const colors = new Array();
const colorSteps = 1000;
let rectsTester;
const DEBUG = isLocalHost();
let canvas2d;
let ctx;
let targetPoint;
let stats;
let motions;
let sizeFactor
let fontName = 'sans-serif';
let colorMapCanvas;
let alphaMapCanvas;
let mapCtx;
let typeTwister;
let text;
let pathLength;

//three.js part
let scene;
let camera;
let renderer;
let axesHelper;

const initScene = (fntName) => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('t') !== null) {
        text = urlParams.get('t');
    } else {
        text = 'Store your data on CDs';
    }
    fontName = fntName;
    // Add Stats
    stats = new Stats();
    motions = new MotionSimulator({
        type: MotionSimulator.PENDULUM,
        origin: MotionSimulator.CENTER,
        speed: 2
    });
    if (DEBUG) {
        stats.showPanel(0);
        document.body.appendChild(stats.dom);
    }
    // Scene
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( 75, getViewport()[0] / getViewport()[1], 0.1, 1000 );
    camera.position.z = 50;
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setSize( getViewport()[0] * resolution, getViewport()[1] * resolution );
    document.body.appendChild( renderer.domElement );
    // Renderer screen fit
    const onResize = () => {
        renderer.setSize( getViewport()[0], getViewport()[1] );
    }
    onResize();
    let timeoutID = -1;
    window.addEventListener('resize', () => {
        clearTimeout(timeoutID);
        timeoutID = setTimeout(() => {
            onResize();
        }, 300);
    });
    // Rest
    setupObjects(text);
    updateFrame();
}

const setupObjects = (text) => {
    // Setup text
    if (alphaMapCanvas === undefined) alphaMapCanvas = getCanvas(200, 200);
    mapCtx = alphaMapCanvas.getContext('2d');
    const fontSize = 320;
    const font = '900 ' + fontSize + 'px ' + fontName;
    mapCtx.font = font;
    mapCtx.textBaseline = 'top';
    let textMetrics = mapCtx.measureText(text.toUpperCase());
    alphaMapCanvas.width = textMetrics.width;
    alphaMapCanvas.height = textMetrics.actualBoundingBoxDescent + textMetrics.actualBoundingBoxAscent;
    mapCtx.font = font;
    mapCtx.textBaseline = 'top';
    mapCtx.beginPath();
    mapCtx.fillStyle = '#FF8800';
    mapCtx.fillText(text.toUpperCase(), 0, textMetrics.actualBoundingBoxAscent);
    mapCtx.stroke();
    // document.body.appendChild(alphaMapCanvas);
    // Setup colors
    colorMapCanvas = getCanvas(colorSteps, 100, 'canvas2d');
    const cgCtx = colorMapCanvas.getContext('2d');
    const grd = cgCtx.createLinearGradient(0, 0, colorMapCanvas.width, 0);
    grd.addColorStop(0, '#e9a5a5');
    grd.addColorStop(0.2, '#b8c1c0');
    grd.addColorStop(0.4, '#65c0e0');
    grd.addColorStop(0.6, '#aea2db');
    grd.addColorStop(0.8, '#81c1d9');
    grd.addColorStop(1, '#e9a5a5');
    cgCtx.fillStyle = grd;
    cgCtx.fillRect(0, 0, colorMapCanvas.width, colorMapCanvas.height);
    const myImageData = cgCtx.getImageData(0, 0, colorSteps, 100);
    for (let i = 0; i < colorSteps / 3; i++) {
        colors.push(myImageData.data[i * 4]);
        colors.push(myImageData.data[i * 4 + 1]);
        colors.push(myImageData.data[i * 4 + 2]);
    }
    // Setup geometry
    const x = 0;
    const y = 0;
    const length = alphaMapCanvas.width/12;
    const width = alphaMapCanvas.height/12;
    typeTwister = new TypeTwister(x, y, length, width, alphaMapCanvas);
    scene.add( typeTwister );
    
    axesHelper = new THREE.AxesHelper( 5 );
    scene.add( axesHelper );
}
const getVertexShadder = () => {
    const vertexShadder = '\
        varying vec2 vUv;\
        attribute vec3 position1;\
        void main() {\
            vUv = uv;\
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position1, 1.0);\
        }\
    ';
    return vertexShadder;
}

const getFragmentShader = () => {
    const fragmentShader = '\
        uniform sampler2D uAlphaTexture;\
        uniform sampler2D uColorTexture;\
        uniform vec2 uUVOffset;\
        varying vec2 vUv;\
        void main()\
        {\
            vec4 color = texture2D(uColorTexture, vUv + uUVOffset);\
            vec4 alpha = texture2D(uAlphaTexture, vUv);\
            gl_FragColor = vec4(color.rgb, alpha.a);\
        }\
    ';
    return fragmentShader;
}

const updateFrame = () => {
    requestAnimationFrame(updateFrame);
    stats.begin();
    motions.update();
    axesHelper.position.x = motions.x * scale;
    axesHelper.position.y = -motions.y * scale;
    typeTwister.updateGeometry(motions.x * scale, -motions.y * scale);
    renderer.render( scene, camera );
    stats.end();
};
class TypeTwister extends THREE.Mesh {
    length;
    width;
    halfWidth;
    xSegmentsCount;
    ySegmentsCount;
    segmentWidth;
    segments;
    limit;
    constructor (x, y, length, width) {
        //Geometry setup
        const uvOffset = new THREE.Vector2(0,0);
        let segmentWidth = width / 10;
        let xSegmentsCount = Math.floor( length / segmentWidth );
        segmentWidth = length / xSegmentsCount;
        let ySegmentsCount = Math.round( width / segmentWidth );
        const segments = [];
        const points = [];
        for (let i = 0; i < xSegmentsCount; i++) {
            segments.push(new Segment(x + i * segmentWidth, y));
        };
        
        //Material setup
        const alphaTexture = new THREE.CanvasTexture( alphaMapCanvas, THREE.UVMapping, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.LinearFilter, THREE.LinearMipmapLinearFilter );
        alphaTexture.premultiplyAlpha = false;
        const colorTexture = new THREE.CanvasTexture( colorMapCanvas, THREE.UVMapping, THREE.RepeatWrapping, THREE.RepeatWrapping, THREE.LinearFilter, THREE.LinearMipmapLinearFilter );

        const material = new THREE.ShaderMaterial( {
            uniforms: {
                uColorTexture: { value: colorTexture },
                uAlphaTexture: { value: alphaTexture },
                uUVOffset: { type: 'v', value: uvOffset },
            },
            vertexShader: getVertexShadder(),
            fragmentShader: getFragmentShader()
        } );
        material.transparent = true;

        const geometry = new THREE.PlaneGeometry( length, width, xSegmentsCount-1, ySegmentsCount );
        const positions = new Float32Array( (xSegmentsCount) * (ySegmentsCount + 1) * 3 );
        for ( let i = 0; i < (xSegmentsCount) * (ySegmentsCount + 1); i ++ ) {
            positions[ 3 * i ] = 0;//Math.random();
            positions[ 3 * i + 1] = 0;//Math.random();
            positions[ 3 * i + 2] = 0;
        }
        geometry.setAttribute( 'position1', new THREE.BufferAttribute( positions, 3 ) );
        super (geometry, material);
        this.position.x = 0;
        this.position.y = 0;
        
        this.width = width;
        this.halfWidth = width / 2;
        this.limit = segmentWidth / width * 1.2;
        this.xSegmentsCount = xSegmentsCount;
        this.segmentWidth = segmentWidth;
        this.ySegmentsCount = ySegmentsCount;
        this.segments = segments;
        this.points = points;

        this.updateGeometry = (targetX, targetY) => {
            // this.position.x = targetX;
            // this.position.y = targetY;
            // We do not update geometry if obect didn't moved.
            const dx = (targetX - this.segments[0].x);
            const dy = (targetY - this.segments[0].y);
            // if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return false;
            // Update segments
            this.segments.forEach((link, i) => {
                if (i === 0) {
                    const d = Math.sqrt(dx * dx + dy * dy);
                    const max_speed = 200;
                    const speed_dump = 10;
                    
                    const k = d === 0 ? 1 : Math.min(max_speed, d)/d;
                    const ta = Math.atan2(dy, dx);
                    const da = deltaAngle(link.a, ta);
                    
                    link.a = ta - da * 0.8;
                    const ddx = k * d * Math.cos(link.a) / speed_dump;
                    const ddy = k * d * Math.sin(link.a) / speed_dump;
                    pathLength += Math.sqrt(ddx * ddx + ddy * ddy);
                    link.x += ddx;
                    link.y += ddy;
                    // this.position.x = -link.x;
                    // this.position.y = -link.y;
                } else {
                    const prev = this.segments[i - 1];
                    const a = Math.atan2(prev.y - link.y, prev.x - link.x);
                    if (i === 1) {
                        link.a = a;
                    } else {
                        const d = deltaAngle(a, prev.a);
                        const rd = Math.min(this.limit, Math.abs(d));
                        if (d > 0) {
                            link.a = prev.a - rd;
                        } else {
                            link.a = prev.a + rd;
                        }
                    }
                    link.x = prev.x - this.segmentWidth * Math.cos(link.a);
                    link.y = prev.y - this.segmentWidth * Math.sin(link.a);
                }
            });

            const positions = geometry.attributes.position1.array;
            // console.log(positions);
            for (let i = 0; i < positions.length; i+=3) {
                // console.log(i / 3,  positions[i], positions[i+1]);
            }
            let k;            
            this.segments.forEach((link, i) => {
                let a;
                if (i === 0) {
                    a = this.segments[i + 1].a;
                } else if (i === this.segments.length - 1) {
                    a = link.a;
                } else {
                    a = this.segments[i + 1].a + deltaAngle(this.segments[i + 1].a, link.a) / 2;
                }
                a += Math.PI / 2;
                for (let j = 0; j < this.ySegmentsCount + 1; j ++) {
                    // const p = this.points[this.ySegmentsCount * i + j];
                    const d = this.halfWidth - j * this.width / (this.ySegmentsCount);
                    const index = i * this.ySegmentsCount + j;
                    // positions[3 * index] = (link.x + d * Math.cos(a))/100;
                    // positions[3 * index + 1] = (link.x + d * Math.sin(a))/100;
                    // positions[3 * index + 0] = i * 0.1;
                    // positions[3 * index + 1] = j * 0.1;
                    // console.log(positions[3 * index + 0], positions[3 * index + 1], positions[3 * index + 2]);

                    
                    let px = link.x - d * Math.cos(a);
                    let py = link.y - d * Math.sin(a);
                    k = j * (this.xSegmentsCount) + i;
                    positions[3 * k + 0] = px;
                    positions[3 * k + 1] = py;
                    // console.log(k, px.toFixed(1), py.toFixed(1));
                }
            });
            this.geometry.attributes.position1.needsUpdate = true;
            uvOffset.x += 0.01;
            this.material.uniforms.uUVOffset.value = uvOffset;
        }
    }
}

const testTransparency = (tri, even) => {
    let x1, y0;
    let x0 = tri.uv0Optimized.x;
    let y1 = tri.uv1Optimized.y;
    if (even) {
        x1 = tri.uv2Optimized.x;
        y0 = tri.uv0Optimized.y;
    } else {
        x1 = tri.uv1Optimized.x;
        y0 = tri.uv2Optimized.y;
    }
    const width = Math.floor(x1 - x0);
    const height = Math.floor(y1 - y0);
    const imgData = mapCtx.getImageData(x0, y0, width, height);
    for (let y = 0; y < height; y++) {
        const edge = (1 - y / height) * width;
        for (let x = 0; x < width; x++) {
            if (even) {
                if (x > edge) break;
            } else {
                if (x <= edge) continue;
            }
            if (imgData.data[4 * (y * width + x) + 3] > 0) {
                tri.invisible = false;
                return;
            }
        }
    }
    tri.invisible = true;
}

const renderFrameOptimized = () => {
    ctx.clearRect(0, 0, canvas2d.width, canvas2d.height);
    rectsTester = new Array(typeTwister.segments.length);
    const pathOffset = pathLength / typeTwister.segmentWidth * 1.2;
    typeTwister.trisToDraw.forEach(tri => {
        if (rectsTester[tri.segmentID] === undefined) {
            const n = Math.floor(1000 * (typeTwister.segments.length - 1 - tri.segmentID + pathOffset)/typeTwister.segments.length * 3);
            mapCtx.fillStyle = colors[n % 1000];
            mapCtx.globalCompositeOperation = "source-atop";
            mapCtx.fillRect(tri.fillRect.x, 0, tri.fillRect.width, alphaMapCanvas.height);
            rectsTester[tri.segmentID] = true;
        }
    });
    typeTwister.trisToDraw.forEach(tri => {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(tri.p0.x, tri.p0.y);
        ctx.lineTo(tri.p1.x, tri.p1.y);
        ctx.lineTo(tri.p2.x, tri.p2.y);
        ctx.closePath();
        ctx.clip();
        let a, b, c, d, e, f, g, h, i, j, k, l, m, n, denom, pDenom, m11, m12, m21, m22, dx, dy;
        a = tri.uv2Optimized.x * tri.uv1Optimized.y;
        b = tri.uv1Optimized.x * tri.uv2Optimized.y;
        c = tri.uv2Optimized.y - tri.uv1Optimized.y;
        d = tri.uv1Optimized.x - tri.uv2Optimized.x;
        denom = tri.uv0Optimized.x * c - b + a + d * tri.uv0Optimized.y;
        if (denom == 0) {
            ctx.restore();
            return;
        }
        e = tri.p2.x - tri.p1.x;
        f = tri.p1.y - tri.p2.y;
        g = tri.uv1Optimized.y * tri.p2.x;
        h = tri.uv2Optimized.y * tri.p1.x;
        i = tri.uv1Optimized.y * tri.p2.y;
        j = tri.uv1Optimized.x * tri.p2.x;
        k = tri.uv1Optimized.x * tri.p2.y;
        l = tri.uv2Optimized.y * tri.p1.y;
        m = tri.uv2Optimized.x * tri.p1.x;
        n = tri.uv2Optimized.x * tri.p1.y;
        pDenom = 1 / denom;
        m11 = -(tri.uv0Optimized.y * e - g + h + (tri.uv1Optimized.y - tri.uv2Optimized.y) * tri.p0.x) * pDenom;
        m12 = (i + tri.uv0Optimized.y * f - l + c * tri.p0.y) * pDenom;
        m21 = (tri.uv0Optimized.x * e - j + m + d * tri.p0.x) * pDenom;
        m22 = -(k + tri.uv0Optimized.x * f - n + (tri.uv2Optimized.x - tri.uv1Optimized.x) * tri.p0.y) * pDenom;
        dx = (tri.uv0Optimized.x * (h - g) + tri.uv0Optimized.y * (j - m) + (a - b) * tri.p0.x) * pDenom;
        dy = (tri.uv0Optimized.x * (l - i) + tri.uv0Optimized.y * (k - n) + (a - b) * tri.p0.y) * pDenom;
        ctx.transform(m11, m12, m21, m22, dx, dy);
        ctx.drawImage(alphaMapCanvas,
            tri.fillRect.x, tri.fillRect.y, tri.fillRect.width, tri.fillRect.height,
            tri.fillRect.x, tri.fillRect.y, tri.fillRect.width, tri.fillRect.height);
        ctx.restore();
    });
};
const drawWireframe = () => {
    typeTwister.trisToDraw.forEach((tri, i) => {
        ctx.strokeStyle = '#000';
        ctx.beginPath();
        tri.original.forEach((p, j) => {
            if (j === 0) {
                ctx.moveTo(p.x, p.y);
            } else{
                ctx.lineTo(p.x, p.y);
            }
        });
        ctx.closePath();
        ctx.stroke();
    });
}
const drawPoints = (points, connect) => {
    let x, y;
    ctx.fillStyle = '#FFFFFF80';
    ctx.strokeStyle = '#FFF';
    typeTwister.points.forEach(link => {
        ctx.beginPath();
        ctx.arc(link.x, link.y, 6, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fill();
        if (!connect) return;
        ctx.beginPath();
        ctx.moveTo(x || link.x, y || link.y);
        ctx.lineTo(link.x, link.y);
        ctx.stroke();
        x = link.x;
        y = link.y;
    });
}
const drawTarget = () => {
    ctx.fillStyle = '#000000'
    ctx.beginPath();
    ctx.arc(targetPoint.x, targetPoint.y, 10, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
}

class Segment extends Point {
    a;
    constructor(x, y) {
        super(x, y);
        this.a = Math.PI;
    }
}

class Cap extends Point {
    a0;
    a1;
    gradient;
    constructor(x, y) {
        super(x, y);
    }
}

class Triangle {
    id;
    segmentID;
    p0;
    p1;
    p2;
    uv0;
    uv1;
    uv2;
    uv0Optimized;
    uv1Optimized;
    uv2Optimized;
    fillRect;
    original;
    invisible;
    a;
    constructor(p0, p1, p2, uv0, uv1, uv2) {
        this.p0 = p0;
        this.p1 = p1;
        this.p2 = p2;
        this.uv0 = uv0 || new Point(0, 0);
        this.uv1 = uv1 || new Point(1, 0);
        this.uv2 = uv2 || new Point(0, 1);
        this.original = [p0, p1, p2];
        this.fillRect = {x:0, y:0, width:10, height:10};
    }
}

//All starts here when DOM is ready
document.addEventListener("DOMContentLoaded", (event) => {
    document.fonts.ready.then(() => {
        initScene('NeueMachina');
    });
});