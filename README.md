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
If you are on Ubuntu/Debian/Raspberry Pi, you can install node and npm via the official NodeSource repository (recommended):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```
*Note: The above command installs both `node` and `npm`.*

Check if Node.js is installed correctly by running:
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

---

## 🔁 Auto-Start on Boot (Linux / Raspberry Pi)

If you want the application to automatically start whenever you turn on your Linux PC or Raspberry Pi, the easiest and most robust method is using **PM2** (a process manager for Node.js).

### 1. Install PM2 Globally
Open your terminal and run:
`sudo npm install pm2@latest -g`

### 2. Start the App via PM2
Make sure you are in the `autodarts-local` directory, then run:
`pm2 start server.js --name "autodarts-local"`

*The server is now running in the background and will restart automatically if it crashes.*

### 3. Generate the Startup Script
Run this command to get the startup command for your specific Linux system:
`pm2 startup`

**Important:** PM2 will output a command at the very end (starting with `sudo env PATH...`). **Copy that exact command and run it in your terminal.**

### 4. Save the Current State
Once you have run the command from the step above, tell PM2 to freeze and save your currently running apps so it knows what to load on boot:
`pm2 save`

That's it! You can now restart your computer, and the Autodarts Local 1vs1 server will automatically boot up in the background.
