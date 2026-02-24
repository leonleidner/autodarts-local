# Autodarts Local 1vs1

A local 1vs1 Dart scoreboard application that connects to the official Autodarts Board API, providing a seamless live overlay and manual score correction tool.

## Features

- Real-time connection to your physical Autodarts board (`http://IP:3180/api/state`).
- Accurate 501 / 301 logic (Single In, Double/Single Out).
- Advanced Manual Input Grid (Double, Triple, Miss, undo, Next).
- Detailed Score History (`Chalkboard`) showing remaining scores for each turn.
- A beautiful, Autodarts-inspired UI.

---

## 🚀 Quick Start (Linux / Mac / Windows)

You can clone this repository and start the game immediately on any system running Node.js.

### 1. Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.
Check if Node.js is installed by running:
```bash
node -v
npm -v
```

### 2. Clone the Repository
Open your terminal and clone the code from GitHub:
```bash
git clone https://github.com/leonleidner/autodarts-local.git
cd autodarts-local
```

### 3. Install Dependencies
Install the required Node.js packages (Express and Axios):
```bash
npm install
```

### 4. Start the Application
Start the proxy server and the web interface:
```bash
node server.js
```

### 5. Play
Open your web browser and navigate to:
```
http://localhost:3000
```
Enter your Autodarts board IP, select your game settings, and click **Connect & Play**!
