# Busy Beaver Resume Quest

A static, GitHub Pages-friendly playable resume for Weston Davis.

The site frames Weston's career as a left-to-right pixel-art journey: each level adds a capability across business, law, enterprise open source, partner programs, services operations, sales strategy, ecosystem consulting, and AI-native startup GTM.

## Files

- `index.html` - game shell, top bar, canvas, scene navigation, bottom HUD
- `resume-data.js` - scene content, proof bullets, capabilities, outfit, palette, and visual metadata
- `script.js` - canvas rendering, controls, scene navigation, HUD updates, and email copy behavior
- `styles.css` - responsive layout, HUD, controls, and visual styling
- `resume.html` - classic readable resume page

## Controls

- Left arrow or A: move back
- Right arrow or D: move forward
- Up arrow, W, or Space: jump
- Down arrow or S: tail slap
- Timeline dots or arrow buttons: jump between scenes
- Mobile: use the on-screen controls or scene navigation

## Local Preview

From this folder:

```sh
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173/
```

## Host On GitHub Pages

1. Push these files to a GitHub repository.
2. In repository settings, enable GitHub Pages.
3. Set the source to the main branch root.

## License

This project is licensed under the GNU Affero General Public License v3.0 or later. See `LICENSE`.
