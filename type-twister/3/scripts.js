// Screen parameters
const colors = new Array();
const colorSteps = 256;
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
    scene.background = new THREE.Color( 0x9c9fa5 );
    // scene.background = new THREE.Color( 0x000000 );
    camera = new THREE.OrthographicCamera( getViewport()[0] / - 2, getViewport()[0] / 2, getViewport()[1] / 2, getViewport()[1] / - 2, 1, 10000 );
    camera.position.z = 50;
    // camera.position.y = 50;
    camera.lookAt(0,0,0);
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setSize( getViewport()[0], getViewport()[1] );
    document.body.appendChild( renderer.domElement );
    // Renderer screen fit
    const onResize = () => {
        renderer.setSize( getViewport()[0], getViewport()[1] );
        camera.left = - getViewport()[0] / 2;
        camera.right = getViewport()[0] / 2;
        camera.top = getViewport()[1] / 2;
        camera.bottom = - getViewport()[1] / 2;
        camera.updateProjectionMatrix ();
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
    const font = '900 190px ' + fontName;
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
    colorMapCanvas = getCanvas(colorSteps, colorSteps, 'canvas2d');
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
    const length = alphaMapCanvas.width;
    const width = alphaMapCanvas.height;
    typeTwister = new TypeTwister(x, y, length, width, alphaMapCanvas);
    scene.add( typeTwister );
    
    axesHelper = new THREE.AxesHelper( 5 );
    scene.add( axesHelper );
}
const getVertexShadder = () => {
    const vertexShadder = '\
        varying vec2 vUv;\
        void main() {\
            vUv = uv;\
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\
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
    axesHelper.position.x = motions.x;
    axesHelper.position.y = -motions.y;
    typeTwister.updateGeometry(motions.x, -motions.y);
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
        colorTexture.repeat.set(3, 3);

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
        material.depthTest = true;
        material.depthFunc = THREE.NotEqualDepth;
        material.stencilFunc = THREE.AlwaysStencilFunc;

        const wireframe = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
        wireframe.wireframe = true;
        wireframe.wireframeLinewidth = 4;

        const geometry = new THREE.PlaneGeometry( length, width, xSegmentsCount-1, ySegmentsCount );
        const positions = new Float32Array( (xSegmentsCount) * (ySegmentsCount + 1) * 3 );
        for ( let i = 0; i < (xSegmentsCount) * (ySegmentsCount + 1); i ++ ) {
            positions[ 3 * i ] = 0;
            positions[ 3 * i + 1] = 0;
            positions[ 3 * i + 2] = 0;
        }
        geometry.setAttribute( 'position1', new THREE.BufferAttribute( positions, 3 ) );
        super (geometry, material);
        // super (geometry, wireframe);
        this.position.x = 0;
        this.position.y = 0;
        
        this.length = length;
        this.width = width;
        this.halfWidth = width / 2;
        this.limit = segmentWidth / width * 1.2;
        this.xSegmentsCount = xSegmentsCount;
        this.segmentWidth = segmentWidth;
        this.ySegmentsCount = ySegmentsCount;
        this.segments = segments;
        this.points = points;

        this.updateGeometry = (targetX, targetY) => {
            const dx = (targetX - this.segments[0].x);
            const dy = (targetY - this.segments[0].y);
            let offset;
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
                    offset = Math.sqrt(ddx * ddx + ddy * ddy);
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

            const positions = geometry.attributes.position.array;
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
                    const d = this.halfWidth - j * this.width / (this.ySegmentsCount);
                    const k = j * (this.xSegmentsCount) + i;
                    positions[3 * k + 0] = link.x - d * Math.cos(a);
                    positions[3 * k + 1] = link.y - d * Math.sin(a);
                    positions[3 * k + 2] = -i;
                }
            });
            this.geometry.attributes.position.needsUpdate = true;
            uvOffset.x -= offset / this.length;
            this.material.uniforms.uUVOffset.value = uvOffset;
        }
    }
}


class Segment extends Point {
    a;
    constructor(x, y) {
        super(x, y);
        this.a = Math.PI;
    }
}

//All starts here when DOM is ready
document.addEventListener("DOMContentLoaded", (event) => {
    document.fonts.ready.then(() => {
        initScene('NeueMachina');
    });
});