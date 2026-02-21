# Daybound Extension

This is a Chrome Extension that replaces your New Tab page with a timezone dashboard.

## Installation

1. **Build the project**:
   Run `npm run build` to generate the `dist` folder.

2. **Load into Chrome**:
   - Open Chrome and navigate to `chrome://extensions`.
   - Enable **Developer mode** (toggle in top right).
   - Click **Load unpacked**.
   - Select the `dist` folder generated in step 1.

3. **Usage**:
   - Open a new tab.
   - You should see the Daybound dashboard.
   - Add timezones using the input at the top.
   - Configure settings via the Settings icon.

## Development

- `src/app/App.tsx`: Main application logic.
- `src/app/components`: UI components.
- `src/utils`: Timezone helpers.

The extension uses `chrome.storage.sync` for persistence if available, falling back to `localStorage` for development preview.