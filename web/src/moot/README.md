# Custom Moot Court Components Slot (`web/src/moot`)

This directory is designated for your existing moot-court React components.

### How to integrate your components:
1. Copy your React `.jsx` or `.tsx` files into this directory (`web/src/moot/`).
2. Re-export them from `web/src/moot/index.js`.
3. In `web/src/App.jsx` or any component, you can import them:
   ```jsx
   import { YourCustomComponent } from './moot';
   ```

### Props Passed from Banthry Courtroom:
- `session`: The active moot session object (session_id, user_role, student_name, case).
- `onAction`: Callback handler for dispatching courtroom events (speech, objections, citation checks).
- `benchState`: Current status of the Bench (`speaking`, `listening`, `deliberating`, `gavelling`).
