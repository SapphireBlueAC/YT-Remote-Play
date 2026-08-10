# YTMDesktop Seamless Remote: Development Sprints

A bug-free, incremental roadmap to building a cloud-relayed remote control for YTMDesktop. This architecture ensures real-time control while completely bypassing mobile hotspot isolation and Windows Firewall restrictions.

---

## Sprint 1: Local API Sandbox & Auth (The Proof of Concept)
**Goal:** Verify you can control the YTMDesktop player via code before introducing the cloud.
**Target Environment:** Dell laptop (Local environment)

*   **Step 1.1:** Open YTMDesktop, ensure the Companion Server is enabled, and navigate to `http://localhost:9863` in your browser to verify the API is running.
*   **Step 1.2:** Initialize a blank Node.js project (`npm init -y`) and install `socket.io-client`.
*   **Step 1.3:** Write a tiny script to connect to `http://localhost:9863`.
*   **Step 1.4:** Implement the authentication handshake. Send the `request-auth` event, accept it in the YTMDesktop GUI, and save the returned token.
*   **Step 1.5:** Test a simple command script: emit a `track-pause` or `track-play` event to confirm the player responds.

---

## Sprint 2: The Cloud Relay (The Middleman)
**Goal:** Build and deploy a secure, low-latency WebSocket server to route commands between devices.
**Target Environment:** Google Cloud Platform (GCP) or local testing

*   **Step 2.1:** Initialize a new Node.js project using Express and `socket.io`.
*   **Step 2.2:** Set up basic WebSocket connections and log when a client connects.
*   **Step 2.3:** Implement "Rooms" or basic routing. For example, have the PC connect as a `listener` and the phone connect as a `controller`.
*   **Step 2.4:** Write the relay logic: When the server receives a `remote-command` from the phone, immediately `emit` it to the PC. When it receives `state-update` from the PC, emit it to the phone.
*   **Step 2.5:** Deploy the relay server to your GCP infrastructure (a small App Engine or Compute Engine instance in the Mumbai/Delhi region for lowest latency).

---

## Sprint 3: The Local Bridge (The Daemon)
**Goal:** Connect the local YTMDesktop API to the new Cloud Relay.
**Target Environment:** Dell laptop (running in the background)

*   **Step 3.1:** Create a Node.js script that utilizes two instances of `socket.io-client`.
*   **Step 3.2:** Connect Instance A to the local YTMDesktop server (`localhost:9863`) using the auth token from Sprint 1.
*   **Step 3.3:** Connect Instance B to your deployed GCP Cloud Relay.
*   **Step 3.4:** Pipe the data: 
    *   Listen for `state-update` (track info, volume, play state) from YTMDesktop (Instance A) and push it to the Cloud Relay (Instance B).
    *   Listen for `command` (play, pause, skip) from the Cloud Relay (Instance B) and push it to YTMDesktop (Instance A).
*   **Step 3.5:** Add auto-reconnect logic (e.g., using `pm2` or basic error handling) so the script survives network drops.

---

## Sprint 4: The React Frontend (The Remote UI)
**Goal:** Build the user interface to control playback.
**Target Environment:** React web application

*   **Step 4.1:** Scaffold a new React application (Vite is recommended).
*   **Step 4.2:** Install `socket.io-client` and connect the React app to your GCP Cloud Relay URL.
*   **Step 4.3:** Build the UI components: Play/Pause button, Next/Prev buttons, and a Volume slider.
*   **Step 4.4:** Wire up the state. Bind the buttons to emit the respective commands to the WebSocket.
*   **Step 4.5:** Wire up the UI to listen for `state-update` events from the WebSocket so the UI displays the currently playing song title, artist, and album art dynamically.

---

## Sprint 5: PWA Conversion & Polishing
**Goal:** Make the web app look and behave exactly like a native app on your smartphone.
**Target Environment:** OnePlus smartphone 

*   **Step 5.1:** Add a `manifest.json` file to your React public directory, defining the app name, icons, and setting `"display": "standalone"`.
*   **Step 5.2:** Add a basic Service Worker to cache the UI assets (optional, but good for offline-ready loading).
*   **Step 5.3:** Deploy the React app (Firebase Hosting, Vercel, or Netlify).
*   **Step 5.4:** Open the deployed URL on your phone's browser, select "Add to Home Screen", and launch it as a full-screen native app.
*   **Step 5.5:** Conduct End-to-End testing: Start music on the PC, ensure the phone syncs instantly, change tracks, and adjust volume to confirm zero bugs and sub-50ms latency.
