# 💎 Nexus
**The Air-Gapped, Mathematical Visualization Engine.**

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%20v3-red.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Security: Zero Trust](https://img.shields.io/badge/Security-Local--Only-green.svg)](https://thevikramsinha.github.io/nexus/)
[![Version: 3.1](https://img.shields.io/badge/Release-Crystal-blue.svg)]()

> "Logic should be crisp. Data should be private."

**Nexus** is a strict, mathematical visualization engine that converts Markdown into high-fidelity vector mindmaps and org charts. It runs 100% client-side with **Zero Dependencies**, **Zero Tracking**, and **Zero Latency**.

**🚀 Live Application:** [https://thevikramsinha.github.io/nexus/](https://thevikramsinha.github.io/nexus/)

---

## ✨ Features

### 1. Dual Layout Engine
Switch instantly between architectural paradigms without rewriting data:
* **↔ Horizontal Mode (Mindmap):** Grows left-to-right. Perfect for flowcharts and logic trees.
* **↕ Vertical Mode (Org Chart):** Grows top-to-bottom. Ideal for hierarchies and sitemaps.

### 2. Precision Rendering
* **Orthogonal Routing:** Professional, 90-degree "Manhattan" lines with directional arrows.
* **Bézier Curves:** Organic, smooth connections for high-level brainstorming.
* **Smart Layout:** Dynamic spacing calculations prevent node overlap.

### 3. Traceback Search
Unlike standard "find" tools, Nexus focuses on **Context**:
* **Lineage Highlighting:** Searching for a node highlights its entire path back to the Root.
* **Focus Mode:** Non-matching nodes are visually dimmed (Ghost Effect), allowing you to focus on the signal, not the noise.

### 4. Robust Exports
* **Interactive HTML Viewer:** Exports a standalone, single-file HTML viewer (`nexus-viewer.html`) containing your data and the rendering engine. Share it with clients—no internet required.
* **Clean SVG:** Generates publication-ready vector graphics. Fixed XML namespaces and "fill=none" attributes ensure compatibility with Adobe Illustrator and Inkscape.
* **Markdown:** Bi-directional sync preserves your source code.

### 5. Zero-Trust Security
* **Air-Gapped Logic:** The application makes **no** external network requests.
* **XSS-Proof:** Built-in sanitization engine (`escapeXML`) neutralizes code injection attacks in your documentation.
* **Local Storage:** Your work is saved strictly to your browser's sandbox.

---

## 🛠️ Installation (Local)
Nexus is dependency-free. You do not need `npm`, `node`, or `python`.

1.  Clone this repository:
    ```bash
    git clone [https://github.com/thevikramsinha/nexus.git](https://github.com/thevikramsinha/nexus.git)
    ```
2.  Open `index.html` in any modern browser (Chrome, Edge, Firefox, Safari).
3.  That's it.

---

## 🎮 Controls

| Action | Control |
| :--- | :--- |
| **Pan Canvas** | Click & Drag (Empty Space) |
| **Zoom** | Mouse Wheel / Buttons |
| **Search** | Type in Toolbar (Auto-traces path) |
| **Change Layout** | Toolbar Dropdown (Horz/Vert) |
| **Change Lines** | Toolbar Dropdown (Curved/90°) |

---

## ⚖️ License & Legal
**Copyright © 2026 Vikram Kumar Sinha**

This program is free software: you can redistribute it and/or modify it under the terms of the **GNU Affero General Public License** as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

### 🛑 Why AGPL-3.0?
The AGPL-3.0 is the most restrictive open-source license to prevent cloud providers from exploiting this engine without contributing back.

1.  **Network Use counts as Distribution:** If you host Nexus on a server and let users access it, you **must** provide them with the source code.
2.  **Copyleft:** If you modify Nexus, your modifications must also be released under AGPL-3.0.
3.  **No Proprietary Forks:** You cannot take this code, close it, and sell it as a proprietary SaaS product.

See the [GNU Affero General Public License](https://www.gnu.org/licenses/agpl-3.0.html) for more details.

---

**[Vikram Kumar Sinha](https://thevikramsinha.github.io/)** // *Building the decentralized web, one node at a time.*
