/**
 * NEXUS CRYSTAL - AGPL 3.0
 * Author: Vikram Kumar Sinha
 */

// --- CONFIGURATION ---
const CONFIG = {
    layout: 'horizontal', // 'horizontal' | 'vertical'
    lineStyle: 'bezier',  // 'bezier' | 'orthogonal'
    nodeWidth: 180,
    gapX: 250,            // Horizontal spacing
    gapY: 100             // Vertical spacing
};

// --- DOM ELEMENTS ---
const refs = {
    input: document.getElementById('markdown-input'),
    canvas: document.getElementById('infinite-canvas'),
    svgLayer: document.getElementById('connections-layer'),
    nodesLayer: document.getElementById('nodes-layer'),
    count: document.getElementById('node-count'),
    searchCount: document.getElementById('search-results-count'),
    layoutSelect: document.getElementById('layout-mode'),
    lineSelect: document.getElementById('line-style')
};

// --- STATE ---
let state = {
    nodes: [],
    root: null,
    pan: { x: window.innerWidth/2, y: window.innerHeight/2 },
    zoom: 1,
    isDragging: false,
    lastMouse: {x:0, y:0},
    searchQuery: "",
    highlightedIds: new Set()
};

// --- SECURITY: XML/HTML ESCAPING ---
function escapeXML(str) {
    if (!str) return "";
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&apos;');
}

// --- INITIALIZATION ---
function init() {
    const savedMD = localStorage.getItem('nexus_md');
    if(savedMD) refs.input.value = savedMD;
    
    render();
    
    refs.input.addEventListener('input', () => { 
        localStorage.setItem('nexus_md', refs.input.value);
        render(); 
    });
    
    const pane = document.getElementById('canvas-pane');
    pane.addEventListener('mousedown', startPan);
    window.addEventListener('mousemove', doPan);
    window.addEventListener('mouseup', endPan);
    pane.addEventListener('wheel', doZoom);
    
    updateTransform();
}

// --- PARSER ---
function parseMarkdown(text) {
    const lines = text.split('\n');
    const root = { id: 'root', text: 'Root', level: 0, children: [], parent: null, color: '#000' };
    let stack = [root];
    let nodeList = [];
    const colors = ['#2563eb', '#db2777', '#d97706', '#059669', '#7c3aed', '#dc2626'];
    let colorIndex = 0;

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        if(!trimmed) return;
        
        let level = 0, content = '';
        if(trimmed.startsWith('#')) {
            const m = trimmed.match(/^(#+)\s+(.*)/);
            if(m) { level = m[1].length; content = m[2]; }
        } else if(trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            level = Math.floor(line.search(/\S/) / 2) + 2;
            content = trimmed.substring(2);
        } else return;

        // SANITIZE INPUT IMMEDIATELY FOR STORAGE, BUT RENDER AS TEXT LATER
        // We keep raw text in memory, but escape it when exporting to XML/SVG
        
        const node = {
            id: 'n' + index + '_' + Math.random().toString(36).substr(2,5),
            text: content,
            level: level,
            children: [],
            parent: null,
            w: CONFIG.nodeWidth,
            h: 0, 
            x: 0, y: 0
        };

        while(stack.length > 0 && stack[stack.length-1].level >= level) stack.pop();
        const parent = stack.length > 0 ? stack[stack.length-1] : root;
        
        node.parent = parent;
        node.color = level === 2 ? colors[colorIndex++ % colors.length] : (parent.color || '#000');
        
        parent.children.push(node);
        stack.push(node);
        nodeList.push(node);
    });

    const actualRoot = root.children.length > 0 ? root.children[0] : root;
    actualRoot.parent = null; 
    return { root: actualRoot, list: nodeList };
}

// --- LAYOUT ENGINE ---
function calculateLayout(node) {
    let counter = 0;

    function traverse(n, depth) {
        n.depth = depth;
        
        if (n.children.length === 0) {
            n.posIndex = counter++;
        } else {
            n.children.forEach(c => traverse(c, depth + 1));
            n.posIndex = (n.children[0].posIndex + n.children[n.children.length-1].posIndex) / 2;
        }

        if (CONFIG.layout === 'horizontal') {
            n.x = n.depth * CONFIG.gapX;
            n.y = n.posIndex * CONFIG.gapY;
        } else {
            n.y = n.depth * CONFIG.gapY * 1.5; 
            n.x = n.posIndex * (CONFIG.nodeWidth + 40); 
        }
    }
    traverse(node, 0);
}

// --- RENDERER ---
function render() {
    const result = parseMarkdown(refs.input.value);
    state.root = result.root;
    state.nodes = result.list;
    refs.count.innerText = state.nodes.length + " Nodes";

    // Traceback Search
    state.highlightedIds.clear();
    let searchActive = false;
    if(state.searchQuery) {
        searchActive = true;
        const query = state.searchQuery.toLowerCase();
        let count = 0;
        state.nodes.forEach(n => {
            if(n.text.toLowerCase().includes(query)) {
                count++;
                let curr = n;
                while(curr) {
                    state.highlightedIds.add(curr.id);
                    curr = curr.parent;
                }
            }
        });
        refs.searchCount.innerText = count > 0 ? count + " matches" : "No matches";
    } else {
        refs.searchCount.innerText = "";
    }

    calculateLayout(state.root);

    // Pass 1: Nodes
    refs.nodesLayer.innerHTML = '';
    refs.svgLayer.innerHTML = '';

    const fragment = document.createDocumentFragment();
    function renderNodeDOM(n) {
        const div = document.createElement('div');
        div.className = 'node ' + (n.level === 1 ? 'root' : '');
        div.textContent = n.text; // SAFE: textContent automatically escapes HTML
        div.id = n.id;
        div.style.left = n.x + 'px';
        div.style.top = n.y + 'px';
        if(n.level > 1) div.style.borderColor = n.color;
        
        if(searchActive) {
            if(state.highlightedIds.has(n.id)) div.classList.add('highlighted');
            else div.classList.add('dimmed');
        }

        fragment.appendChild(div);
        n.children.forEach(renderNodeDOM);
    }
    if(state.root) renderNodeDOM(state.root);
    refs.nodesLayer.appendChild(fragment);

    // Pass 2: Lines (Async to allow DOM layout)
    requestAnimationFrame(() => {
        const domNodes = refs.nodesLayer.children;
        for(let el of domNodes) {
            const n = state.nodes.find(x => x.id === el.id) || (state.root.id === el.id ? state.root : null);
            if(n) { n.h = el.offsetHeight; n.w = el.offsetWidth; }
        }

        function renderLines(n) {
            if(!n.children) return;
            n.children.forEach(c => {
                let start, end;
                if (CONFIG.layout === 'horizontal') {
                    start = { x: n.x + n.w, y: n.y + (n.h/2) };
                    end =   { x: c.x,       y: c.y + (c.h/2) };
                } else {
                    start = { x: n.x + (n.w/2), y: n.y + n.h };
                    end =   { x: c.x + (c.w/2), y: c.y };
                }

                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path.setAttribute("d", getPathD(start, end));
                path.style.stroke = c.color;
                
                const arrow = document.createElementNS("http://www.w3.org/2000/svg", "path");
                arrow.setAttribute("d", getArrowD(start, end));
                arrow.style.fill = c.color;
                arrow.style.stroke = "none";

                if(searchActive) {
                    if(state.highlightedIds.has(n.id) && state.highlightedIds.has(c.id)) {
                        path.classList.add('highlighted'); arrow.classList.add('highlighted');
                    } else {
                        path.classList.add('dimmed'); arrow.classList.add('dimmed');
                    }
                }

                refs.svgLayer.appendChild(path);
                refs.svgLayer.appendChild(arrow);
                renderLines(c);
            });
        }
        if(state.root) renderLines(state.root);
    });
}

// --- PATH GENERATORS ---
function getPathD(s, e) {
    if (CONFIG.lineStyle === 'orthogonal') {
        const midX = s.x + (e.x - s.x) / 2;
        const midY = s.y + (e.y - s.y) / 2;
        if(CONFIG.layout === 'horizontal') return `M ${s.x} ${s.y} L ${midX} ${s.y} L ${midX} ${e.y} L ${e.x} ${e.y}`;
        else return `M ${s.x} ${s.y} L ${s.x} ${midY} L ${e.x} ${midY} L ${e.x} ${e.y}`;
    } else {
        if(CONFIG.layout === 'horizontal') {
            const c1 = { x: s.x + (e.x-s.x)/2, y: s.y };
            const c2 = { x: s.x + (e.x-s.x)/2, y: e.y };
            return `M ${s.x} ${s.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${e.x} ${e.y}`;
        } else {
            const c1 = { x: s.x, y: s.y + (e.y-s.y)/2 };
            const c2 = { x: e.x, y: s.y + (e.y-s.y)/2 };
            return `M ${s.x} ${s.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${e.x} ${e.y}`;
        }
    }
}

function getArrowD(s, e) {
    if(CONFIG.layout === 'horizontal') return `M ${e.x-6} ${e.y-3} L ${e.x} ${e.y} L ${e.x-6} ${e.y+3} Z`;
    else return `M ${e.x-3} ${e.y-6} L ${e.x} ${e.y} L ${e.x+3} ${e.y-6} Z`;
}

// --- INTERACTIONS ---
const app = {
    updateSettings: () => {
        CONFIG.layout = refs.layoutSelect.value;
        CONFIG.lineStyle = refs.lineSelect.value;
        render();
    },
    searchNodes: (val) => { state.searchQuery = val.trim(); render(); },
    toggleSidebar: () => document.getElementById('editor-pane').classList.toggle('collapsed'),
    resetView: () => { state.pan = { x: window.innerWidth/2 - (CONFIG.layout==='vertical'?0:300), y: window.innerHeight/2 - 200 }; state.zoom = 1; updateTransform(); },
    zoomIn: () => { state.zoom *= 1.1; updateTransform(); },
    zoomOut: () => { state.zoom *= 0.9; updateTransform(); },
    
    downloadMD: () => downloadFile(refs.input.value, 'nexus.md', 'text/markdown'),

    // --- FIX 1: SECURE SVG EXPORT ---
    downloadSVG: () => {
        // Calculate Bounding Box
        let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
        function checkBounds(n) {
            if(n.x < minX) minX = n.x; if(n.y < minY) minY = n.y;
            if(n.x + n.w > maxX) maxX = n.x + n.w; if(n.y + n.h > maxY) maxY = n.y + n.h;
            if(n.children) n.children.forEach(checkBounds);
        }
        if(state.root) checkBounds(state.root);
        
        const pad = 60;
        const w = (maxX - minX) + pad*2;
        const h = (maxY - minY) + pad*2;
        const offX = -minX + pad;
        const offY = -minY + pad;

        let xml = `<?xml version="1.0" standalone="no"?>\n<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">`;
        xml += `<style>text { font-family: monospace; font-size: 12px; } .root { fill: #000; } .root-txt { fill: #fff; font-weight: bold; }</style>`;
        xml += `<rect width="100%" height="100%" fill="#f3f4f6" />`;
        xml += `<g transform="translate(${offX}, ${offY})">`;

        // Export Lines & Arrows (Force styles inline to prevent black fill artifacts)
        refs.svgLayer.querySelectorAll('path').forEach(p => {
             // Check if it's an arrow (has fill) or line (stroke only)
             const d = p.getAttribute('d');
             const stroke = p.style.stroke;
             const fill = p.style.fill;
             
             if (fill && fill !== 'none') {
                 // It is an arrow
                 xml += `<path d="${d}" fill="${fill}" stroke="none" />`;
             } else {
                 // It is a line - FORCE FILL NONE
                 xml += `<path d="${d}" stroke="${stroke}" fill="none" stroke-width="1.5" />`;
             }
        });

        // Export Nodes
        function exportNode(n) {
            const isRoot = n.level === 1;
            const bg = isRoot ? '#000' : '#fff';
            const txtColor = isRoot ? '#fff' : '#000';
            const border = isRoot ? '#000' : n.color;
            const safeText = escapeXML(n.text); // SANITIZE TEXT

            xml += `<g transform="translate(${n.x}, ${n.y})">`;
            xml += `<rect width="${n.w}" height="${n.h}" rx="6" fill="${bg}" stroke="${border}" stroke-width="1" />`;
            
            // Text Wrapping Simulation for SVG
            const lines = safeText.match(/.{1,25}/g) || [safeText];
            lines.forEach((l, i) => {
                xml += `<text x="10" y="${20 + (i*14)}" fill="${txtColor}">${l}</text>`;
            });
            xml += `</g>`;
            n.children.forEach(exportNode);
        }
        if(state.root) exportNode(state.root);

        xml += `</g></svg>`;
        downloadFile(xml, 'nexus-chart.svg', 'image/svg+xml');
    },

    // --- FIX 2: ROBUST HTML EXPORT ---
    downloadHTML: () => {
        // We use JSON.stringify to safely encode the user content, preventing code injection breaks
        const SAFE_MD = JSON.stringify(refs.input.value);
        const SAFE_CONFIG = JSON.stringify(CONFIG);

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Nexus Crystal Viewer</title>
    <style>
        body { margin: 0; overflow: hidden; background: #f3f4f6; font-family: monospace; }
        #canvas-pane { width: 100vw; height: 100vh; position: relative; cursor: grab; }
        .node { position: absolute; background: #fff; border: 1px solid #000; padding: 10px; border-radius: 6px; width: 180px; white-space: pre-wrap; font-size: 12px; box-shadow: 2px 2px 0 rgba(0,0,0,0.1); }
        .node.root { background: #000; color: #fff; }
        svg { position: absolute; top:0; left:0; overflow:visible; pointer-events:none; }
        path { fill: none; stroke-width: 1.5px; }
    </style>
</head>
<body>
    <div id="canvas-pane">
        <div id="infinite-canvas">
            <svg id="connections-layer"></svg>
            <div id="nodes-layer"></div>
        </div>
    </div>
    <script>
        const MD_SOURCE = ${SAFE_MD};
        const VIEW_CONFIG = ${SAFE_CONFIG};
        
        // Minimal Viewer Logic
        const canvas = document.getElementById('infinite-canvas');
        const svgLayer = document.getElementById('connections-layer');
        const nodesLayer = document.getElementById('nodes-layer');
        let pan = { x: window.innerWidth/2 - 200, y: 100 }, zoom = 1;
        let isDragging=false, lastMouse={x:0,y:0};
        window.CONFIG = VIEW_CONFIG;

        ${parseMarkdown.toString()}
        ${calculateLayout.toString()}
        ${getPathD.toString()}
        ${getArrowD.toString()}
        ${escapeXML.toString()}

        function renderViewer() {
            const res = parseMarkdown(MD_SOURCE);
            calculateLayout(res.root);
            
            const frag = document.createDocumentFragment();
            const nodes = res.list;
            nodes.forEach(n => {
                const d = document.createElement('div');
                d.className = 'node ' + (n.level===1?'root':'');
                d.textContent = n.text; // Text content prevents XSS
                d.id = n.id;
                d.style.left = n.x+'px'; d.style.top = n.y+'px';
                if(n.level>1) d.style.borderColor = n.color;
                frag.appendChild(d);
            });
            nodesLayer.appendChild(frag);

            setTimeout(() => {
                const domNodes = nodesLayer.children;
                for(let el of domNodes) {
                    const n = nodes.find(x => x.id === el.id);
                    if(n) { n.w = el.offsetWidth; n.h = el.offsetHeight; }
                }
                function lines(n) {
                    n.children.forEach(c => {
                        let s, e;
                        if(CONFIG.layout === 'horizontal') {
                            s = {x: n.x+n.w, y: n.y+n.h/2}; e = {x: c.x, y: c.y+c.h/2};
                        } else {
                            s = {x: n.x+n.w/2, y: n.y+n.h}; e = {x: c.x+c.w/2, y: c.y};
                        }
                        const p = document.createElementNS("http://www.w3.org/2000/svg","path");
                        p.setAttribute("d", getPathD(s,e)); p.style.stroke=c.color;
                        svgLayer.appendChild(p);
                        const a = document.createElementNS("http://www.w3.org/2000/svg","path");
                        a.setAttribute("d", getArrowD(s,e)); a.style.fill=c.color; a.style.stroke="none";
                        svgLayer.appendChild(a);
                        lines(c);
                    });
                }
                if(res.root) lines(res.root);
            }, 0);
        }
        renderViewer();

        const p = document.getElementById('canvas-pane');
        function up() { canvas.style.transform = \`translate(\${pan.x}px, \${pan.y}px) scale(\${zoom})\`; }
        p.onmousedown = e => { isDragging=true; lastMouse={x:e.clientX, y:e.clientY}; };
        window.onmousemove = e => { if(isDragging) { pan.x+=e.clientX-lastMouse.x; pan.y+=e.clientY-lastMouse.y; lastMouse={x:e.clientX, y:e.clientY}; up(); } };
        window.onmouseup = () => isDragging=false;
        p.onwheel = e => { e.preventDefault(); zoom *= e.deltaY>0?0.9:1.1; up(); };
        up();
    <\/script>
</body>
</html>`;
        downloadFile(html, 'nexus-viewer.html', 'text/html');
    }
};

function downloadFile(content, name, type) {
    const blob = new Blob([content], {type: type});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
}

function startPan(e) { 
    if(e.target.closest('.node') || e.target.closest('button') || e.target.closest('select')) return;
    state.isDragging = true; 
    state.lastMouse = {x: e.clientX, y: e.clientY}; 
    document.body.style.cursor = 'grabbing';
}
function doPan(e) {
    if(!state.isDragging) return;
    state.pan.x += e.clientX - state.lastMouse.x;
    state.pan.y += e.clientY - state.lastMouse.y;
    state.lastMouse = {x: e.clientX, y: e.clientY};
    updateTransform();
}
function endPan() { state.isDragging = false; document.body.style.cursor = 'default'; }
function doZoom(e) {
    e.preventDefault();
    state.zoom *= e.deltaY > 0 ? 0.9 : 1.1;
    updateTransform();
}
function updateTransform() {
    refs.canvas.style.transform = `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom})`;
}

init();
window.app = app;