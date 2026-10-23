# MineSafe AI — Complete Driver Dashboard

A ready-to-run educational prototype with a React/Vite dashboard and Flask API. Includes driver/vehicle profile, simulated subsystem health, hazard scenarios, risk score, recommended actions, readiness status, and event history with CSV export.

> **Important safety boundary:** This is a software demonstration. Camera, AI detections, distance, drowsiness, alcohol screening, visibility, speed, controller and emergency-stop results are not connected to real devices. “STOP REQUESTED” is only a displayed recommendation. Do not connect this demo to or rely on it for a real mine vehicle or any life-safety decision.

## Requirements
- Windows 10/11
- Node.js 20 LTS or newer (npm included)
- Python 3.10 or newer

## Run on Windows (first time)

### 1. Extract the ZIP
Extract `MineSafe_AI_Complete_Driver_Dashboard.zip` to a folder you can find, for example:
`C:\Users\YourName\Documents\MineSafe_AI_Complete_Driver_Dashboard`

### 2. Start the backend
Open VS Code, choose **File → Open Folder**, and select the extracted folder.

Open a terminal: **Terminal → New Terminal**, then run:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python app.py
```

Keep this terminal open. If PowerShell blocks activation, use Command Prompt terminal and run:
```bat
cd backend
py -m venv .venv
.venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt
python app.py
```

The API runs at `http://127.0.0.1:5000`. You can verify it by opening `http://127.0.0.1:5000/api/health` in a browser; it should show `{"ok":true,...}`.

### 3. Start the frontend
Open a **second** VS Code terminal (leave backend running), return to the project root and run:

```powershell
cd ..
npm install
npm run dev
```

If the second terminal opens at the project root already, run only:
```powershell
npm install
npm run dev
```

Open the local URL Vite prints, usually `http://localhost:5173`.

## How to use
1. Open **Driver & vehicle** and fill in all four fields. Select **Save profile**.
2. Open **System health** and confirm each demo status is `OK`.
3. Return to **Overview** and select **Activate safety demo**.
4. Use **Demo scenario simulator** to try Safe path, Person warning, Critical obstacle, Low visibility, and Attention alert.
5. Open **Safety events** to inspect event records or export CSV.
6. Set any system check to `FAULT` to test the activation interlock. The demo activation should be blocked until all checks are set back to `OK`.

## Project layout

```text
MineSafe_AI_Complete_Driver_Dashboard/
├── index.html
├── package.json
├── vite.config.js
├── README.md
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   └── styles.css
└── backend/
    ├── app.py
    └── requirements.txt
```

## Troubleshooting
- **`npm` is not recognized:** install Node.js LTS, close/reopen VS Code, and check `node -v` and `npm -v`.
- **`py` is not recognized:** install Python 3.10+ and enable the option to add Python to PATH.
- **`ModuleNotFoundError: flask`:** activate the backend virtual environment and run `pip install -r requirements.txt` from the `backend` folder.
- **Frontend says backend disconnected:** make sure `python app.py` is still running in the first terminal.
- **Port 5000 already in use:** stop the other app using that port, or change the Flask port in `backend/app.py` and the proxy target in `vite.config.js` to match.
- **Blank page:** inspect the browser console and VS Code terminal for errors; confirm `npm install` completed.

## Real hardware integration is a separate engineering stage
This project does not contain trained object-detection weights, a connected camera stream, sensor drivers, a validated drowsiness/alcohol detector, a vehicle-control protocol, or a safety-certified stop circuit. These need device-specific implementation, testing, and qualified safety engineering. Do not represent simulated data as real readings.
