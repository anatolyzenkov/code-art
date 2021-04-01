const PI2 = Math.PI;

const deltaAngle = (a0, a1) => {
    const da = (a1 - a0) % PI2;
    return ((2 * da) % PI2) - da;
};

const isLocalHost = () => location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.origin === 'file://';

const isMobileDevice = () => {
  try{ document.createEvent("TouchEvent"); return true; }
  catch(e){ return false; }
}

// Posted by Andy Langton on Tuesday, 4 December 2007
// https://andylangton.co.uk/blog/development/get-viewportwindow-size-width-and-height-javascript
const getViewport = () => {
    let viewPortWidth;
    let viewPortHeight;
    // the more standards compliant browsers (mozilla/netscape/opera/IE7) use window.innerWidth and window.innerHeight
    if (typeof window.innerWidth != "undefined") {
        viewPortWidth = window.innerWidth;
        viewPortHeight = window.innerHeight;
    }
    // IE6 in standards compliant mode (i.e. with a valid doctype as the first line in the document)
    else if (typeof document.documentElement != "undefined" && typeof document.documentElement.clientWidth != "undefined" && document.documentElement.clientWidth != 0) {
        viewPortWidth = document.documentElement.clientWidth;
        viewPortHeight = document.documentElement.clientHeight;
    }
    // older versions of IE
    else {
        viewPortWidth = document.getElementsByTagName("body")[0].clientWidth;
        viewPortHeight = document.getElementsByTagName("body")[0].clientHeight;
    }
    return [viewPortWidth, viewPortHeight];
};

const pointPolygonHitTest = (p, poly) => {
    // ray-casting algorithm based on
    // https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html/pnpoly.html
    let inside = false;
    if (poly[0].x !== undefined) {
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            let xi = poly[i].x, yi = poly[i].y;
            let xj = poly[j].x, yj = poly[j].y;
            let intersect = yi > p.y != yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi;
            if (intersect) inside = !inside;
        }
    } else {
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            let xi = poly[i][0], yi = poly[i][1];
            let xj = poly[j][0], yj = poly[j][1];
            let intersect = yi > p.y != yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi;
            if (intersect) inside = !inside;
        }
    }
    return inside;
};

const getDevicePixelRatio = () => {
  if (window.devicePixelRatio) return window.devicePixelRatio;
  return 1;
};

const clamp = (n, min, max) => {
  return Math.min(max || 1, Math.max(min || 0, n));
};

class MotionSimulator {
  x = 0;
  y = 0;
  _m = 0.3;
  _automatic = true;
  _a0 = Math.random() * PI2;
  _a1 = Math.random() * PI2;
  _a2 = Math.random() * PI2;
  _a3 = Math.random() * PI2;
  _a4 = Math.random() * PI2;
  _a5 = Math.random() * PI2;
  constructor() {
    document.addEventListener('touchmove', (e) => {
      const touch = e.touches[0] || e.changedTouches[0];
      this.x = touch.pageX;
      this.y = touch.pageY;
      e.preventDefault();
      manualSwitcher();
    });
    document.addEventListener('mousemove', (e) => {
      this.x = e.pageX;
      this.y = e.pageY;
      manualSwitcher();
    });
    let timeoutID = -1;
    const manualSwitcher = () => {
      this._automatic = false;
      clearTimeout(timeoutID);
      timeoutID = setTimeout(() => {
        this._automatic = true;
      }, 5000);
    }
    this.update = () => {
      if (this._automatic) {
        const w = getViewport()[0];
        const h = getViewport()[1];
        this._a1 += this._m * 0.012;
        this._a2 += this._m * 0.02;
        this._a3 += this._m * 0.03;
        this._a4 += this._m * 0.04;
        this._a5 += this._m * 0.1;
        this._a0 += this._m * 0.07 * Math.cos(this._a2) * Math.sin(this._a3);
        let r = Math.max(w, h)/4;
        r = r + r * 2 / 3 * Math.cos(this._a1) * Math.sin(this._a4) - r * 2 / 3 * Math.sin(this._a5);
        this.x = w/2 + r * Math.cos(this._a0);
        this.y = h/2 + r * Math.sin(this._a0);
      }
    }
  }
}
;