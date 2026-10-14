# PS4 Database - NoPayStation Style

A sleek, dark-themed web interface to browse and download PS4 PKG games, heavily inspired by the NoPayStation Database UI.

## Live Demo

[View on GitHub Pages](https://DimZeofficial.github.io/PS4-Content/)

## Features
- **Game Grid:** Displays games with cover art, region, firmware, and size.
- **Advanced Search:** Filter by region, firmware, and search by title or ID.
- **Sorting:** Sort by title, release date, or size.
- **Pagination:** Smooth paginated results with scroll-to-top.
- **Game Details:** Modal and dedicated page showing download links, mirrors, passwords, and metadata.
- **Wishlist:** Save games locally with persistent storage.
- **Smooth Animations:** Page transitions, scroll reveals, and subtle micro-interactions.
- **Ambient Background:** Slow-falling animated orbs for a modern feel.
- **Multiple Themes:** Dark, Light, Ocean, Cyberpunk, Forest, Amber, Violet (cycle or dropdown).
- **Responsive Design:** Works on desktop and mobile.

## Project Structure
```
ps4-database/
├── index.html              # Main homepage with game listings
├── game-detail.html        # Game detail page
├── search.html             # Advanced search results page
├── wishlist.html           # Wishlist page
├── .nojekyll               # Prevents Jekyll processing on GitHub Pages
├── assets/
│   ├── css/
│   │   ├── base.css        # Reset, variables, animations, orbs
│   │   ├── layout.css      # Grid, flex, container styles
│   │   ├── components.css  # Cards, buttons, modals, pagination
│   │   └── themes.css      # Multi-theme color schemes
│   └── js/
│       ├── app.js          # Main application logic + animations
│       ├── data.js         # Data fetching/loading layer
│       ├── ui.js           # DOM manipulation, rendering
│       └── search.js       # Search, filter, sort logic
├── data/
│   └── games.json          # Main game database (from sources)
└── README.md
```

## Local Development
Since the app uses `fetch()` to load `data/games.json`, run it through a local web server (opening `index.html` directly with `file://` will be blocked by CORS).

### Option 1: VS Code Live Server (Recommended)
1. Open the `PS4-Content` folder in VS Code
2. Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension
3. Right-click `index.html` → `Open with Live Server`

### Option 2: Node.js
```bash
npx serve .
```

### Option 3: Python
```bash
python -m http.server 8000
```

Open `http://localhost:8000` in your browser.

## Deploy to GitHub Pages

1. Push this repo to GitHub
2. Go to `Settings → Pages` on your repository
3. Under `Build and deployment`, set `Source` to `Deploy from a branch`
4. Select `Branch: main` and `Folder: /(root)`
5. Save — your site will be live at `https://DimZeofficial.github.io/PS4-Content/`

All internal links, assets and JSON use relative paths (`./`) so it works both locally and on GitHub Pages with no extra config.

## Customization
- **Adding Games:** Edit `data/games.json` to add new games. Follow the existing JSON schema.
- **Styling/Themes:** Modify CSS variables in `assets/css/base.css` or theme definitions in `assets/css/themes.css`.
- **Download Links:** For `pkgps4.click`, the slug is auto-derived as lowercase + spaces → hyphens (e.g. `EA SPORTS FC 27` → `ea-sports-fc-27`).
 
