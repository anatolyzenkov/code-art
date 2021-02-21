// Screen parameters
const resolution = Math.min(2, getDevicePixelRatio());
let canvas2d;
let ctx;
let targetPoint;
const DEBUG = isLocalHost();
let stats;

// Geometry parameters
const sizeFactor = Math.max(getViewport()[0], getViewport()[1]) / 1200;
const length_factor = isMobileDevice() ? 4000 : 6000;
const length = length_factor * resolution * sizeFactor;
const width = 300 * resolution * sizeFactor;
const halfWidth = width/2;
const distance_factor = isMobileDevice() ? 26 : 20;
const distance = distance_factor * resolution * sizeFactor;
const limit = distance / width * 2;
const linksCount = length / distance;
const links = [];
const points = [];
const tris = [];
const tris_to_draw = [];

// Paint parameters
const gradient_stops = [];
const base_color = '#f2c0c1';
const color0 = '#f76c55';
const color1 = '#11545c';

const initScene = () => {
    // Add Stats
    stats = new Stats();
    if (DEBUG) {
        stats.showPanel(0);
        document.body.appendChild(stats.dom);
    }
    // Setup canvas
    canvas2d = document.createElement('canvas');
    canvas2d.id = 'canvas2d';
    canvas2d.width = getViewport()[0] * resolution;
    canvas2d.height = getViewport()[1] * resolution;
    canvas2d.style.width = getViewport()[0] + 'px';
    canvas2d.style.height = getViewport()[1] + 'px';
    ctx = canvas2d.getContext('2d');
    document.body.appendChild(canvas2d);
    // Setup geometry. Links
    for (let i = 0; i < linksCount; i++) {
        links.push(new Link(canvas2d.width + i * distance, canvas2d.height));
        points.push(new Point(), new Point());
    }
    // Setup geometry. Points and Triangles
    points.every((p, i) => {
        if (i % 2) {
            tris.push(new Triangle(p, points[i + 1], points[i + 2]));
        } else {
            tris.push(new Triangle(p, points[i + 1], points[i + 2]));
        }
        return i < points.length - 3;
    });
    // Setup geometry. Gradient stops
    const count = 12;
    for (let i = 1; i < count; i++) {
        const stop0 = (1 + Math.cos(Math.PI * clamp(i/count + 1/count/4 + 0.001)))/2;
        const stop1 = (1 + Math.cos(Math.PI * clamp(i/count - 1/count/4 - 0.001)))/2;
        const color = i % 4 ? color0 : color1;
        if (i%2) {
            gradient_stops.push({'stop': stop0, 'color': i % 2 ? base_color : color });
            gradient_stops.push({'stop': stop1, 'color': i % 2 ? base_color : color });
        } else {
            gradient_stops.push({'stop': (1 - stop0), 'color': i % 2 ? base_color : color });
            gradient_stops.push({'stop': (1 - stop1), 'color': i % 2 ? base_color : color });
        }
    }
    // Setup events
    document.ontouchmove = (e) => {
        const touch = e.touches[0] || e.changedTouches[0];
        targetPoint.x = touch.pageX * 2;
        targetPoint.y = touch.pageY * 2;
        e.preventDefault();
        target.active = false;
    };
    document.onmousemove = (e) => {
        targetPoint.x = e.pageX * 2;
        targetPoint.y = e.pageY * 2;
        target.active = false;
    };
    let timeoutID = -1;
    window.onresize = () => {
        clearTimeout(timeoutID);
        timeoutID = setTimeout(() => {
            canvas2d.width = getViewport()[0] * resolution;
            canvas2d.height = getViewport()[1] * resolution;
            canvas2d.style.width = getViewport()[0] + 'px';
            canvas2d.style.height = getViewport()[1] + 'px';
        }, 300);
    };
    // Setup states
    targetPoint = new Point(canvas2d.width/2, canvas2d.height/2);
};

const updateFrame = () => {
    stats.begin();
    if (target.active) updateTarget();
    const geometryChanged = updateGeometry();
    if (geometryChanged) {
        renderFrame();
    }
    stats.end();
    requestAnimationFrame(updateFrame);
};

target = {
    a0: Math.random() * PI2,
    a1: Math.random() * PI2,
    a2: Math.random() * PI2,
    a3: Math.random() * PI2,
    a4: Math.random() * PI2,
    a5: Math.random() * PI2,
    active: true,
}
const updateTarget = () => {
    if (!target.active) return;
    // Until no user interactions
    // target moves chaotic on the screen
    const m = 0.3;
    target.a1 += m * 0.012;
    target.a2 += m * 0.02;
    target.a3 += m * 0.03;
    target.a4 += m * 0.04;
    target.a5 += m * 0.1;
    target.a0 += m * 0.07 * Math.cos(target.a2) * Math.sin(target.a3);
    let r = Math.max(canvas2d.width, canvas2d.height)/4;
    r = r + r * 2 / 3 * Math.cos(target.a1) * Math.sin(target.a4) - r * 2 / 3 * Math.sin(target.a5);
    targetPoint.x = canvas2d.width/2 + r * Math.cos(target.a0);
    targetPoint.y = canvas2d.height/2 + r * Math.sin(target.a0);
}

const updateGeometry = () => {
    // Do not update if not changed
    const dx = (targetPoint.x - links[0].x);
    const dy = (targetPoint.y - links[0].y);
    if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return false;
    // Update links
    links.forEach((link, i) => {
        if (i === 0) {
            const d = Math.sqrt(dx * dx + dy * dy);
            const max_speed = 300 * sizeFactor;
            const speed_dump = 10 * sizeFactor;
            
            const k = Math.min(max_speed, d)/d;
            const ta = Math.atan2(dy, dx);
            const da = deltaAngle(link.a, ta);
            
            link.a = ta - da * 0.8;
            link.x += k * d * Math.cos(link.a) / speed_dump;
            link.y += k * d * Math.sin(link.a) / speed_dump;
        } else {
            const prev = links[i - 1];
            const a = Math.atan2(prev.y - link.y, prev.x - link.x);
            if (i === 1) {
                link.a = a;
            } else {
                const d = deltaAngle(a, prev.a);
                const rd = Math.min(limit, Math.abs(d));
                if (d > 0) {
                    link.a = prev.a - rd;
                } else {
                    link.a = prev.a + rd;
                }
            }
            link.x = prev.x - distance * Math.cos(link.a);
            link.y = prev.y - distance * Math.sin(link.a);
        }
        if (i < links.length - 1) {
            tris[2 * i].a = link.a + Math.PI / 2;
            tris[2 * i + 1].a = link.a - Math.PI / 2;
        }
    });
    // Update points
    links.forEach((link, i) => {
        let a;
        if (i === 0) {
            a = links[i + 1].a;
        } else if (i === links.length - 1) {
            a = link.a;
        } else {
            a = links[i + 1].a + deltaAngle(links[i + 1].a, link.a) / 2;
        }
        a += Math.PI / 2;
        let p = points[2 * i];
        p.x = link.x + halfWidth * Math.cos(a);
        p.y = link.y + halfWidth * Math.sin(a);
        p = points[2 * i + 1];
        p.x = link.x - halfWidth * Math.cos(a);
        p.y = link.y - halfWidth * Math.sin(a);
    });
    // Update triangles optimized
    tris_to_draw.length = 0
    tris.forEach((tri, i) => {
        const p0 = tri.p0;
        const p1 = tri.p1;
        const p2 = tri.p2;
        //Triangle on screen test
        if (p0.x < 0 && p1.x < 0 && p2.x < 0) return;
        if (p0.y < 0 && p1.y < 0 && p2.y < 0) return;
        if (p0.x > canvas2d.width && p1.x > canvas2d.width && p2.x > canvas2d.width) return;
        if (p0.y > canvas2d.height && p1.y > canvas2d.height && p2.y > canvas2d.height) return;
        //Further geometry optimisation possible
        //
        // Gradient calculation for triangle
        const p0p1 = new Point(p1.x - p0.x, p1.y - p0.y);
        const p0p2 = new Point(p2.x - p0.x, p2.y - p0.y);
        const dq = p0p2.x * p0p2.x + p0p2.y * p0p2.y;
        const dot = p0p1.x * p0p2.x + p0p1.y * p0p2.y
        const t = dot / dq;
        const px = p0.x + p0p2.x * t;
        const py = p0.y + p0p2.y * t;
        tri.gradient = ctx.createLinearGradient(p1.x, p1.y, px, py);
        gradient_stops.forEach(s => {
            tri.gradient.addColorStop(s.stop, s.color);
        });
        tris_to_draw.unshift(tri);
    });
    return true;
};

const renderFrame = () => {
    ctx.clearRect(0, 0, canvas2d.width, canvas2d.height);
    //Draw links
    /*
    ctx.fillStyle = '#FFF';
    links.forEach(link => {
        ctx.beginPath();
        ctx.arc(link.x, link.y, 10, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fill();
    });
     */

    //Draw points
    /*
    points.forEach((link, i) => {
        ctx.fillStyle = '#FF0000'
        ctx.beginPath();
        ctx.arc(link.x, link.y, 10, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fill();
    });
    */
    // /*
    tris_to_draw.forEach((tri, i) => {
        ctx.beginPath();
        ctx.fillStyle = tri.gradient;
        ctx.strokeStyle = tri.gradient;
        tri.original.forEach((p, j) => {
            if (j === 0) {
                ctx.moveTo(p.x, p.y);
            } else{
                ctx.lineTo(p.x, p.y);
            }
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    });
    // */
    //Draw target
    /*
    ctx.fillStyle = '#000000'
    ctx.beginPath();
    ctx.arc(targetPoint.x, targetPoint.y, 10, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
    */
};

class Point {
    x;
    y;
    constructor(x, y) {
        this.x = x || 0;
        this.y = y || 0;
    }
}

class Link extends Point {
    a
    constructor(x, y) {
        super(x, y);
        this.a = Math.PI;
    }
}

class Triangle {
    p0;
    p1;
    p2;
    original;
    gradient;
    a;
    constructor(p0, p1, p2) {
        this.p0 = p0;
        this.p1 = p1;
        this.p2 = p2;
        this.original = [p0, p1, p2];
    }
}

//All starts here
initScene();
updateFrame();