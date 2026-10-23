from datetime import datetime
from threading import Lock
from uuid import uuid4

from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
lock = Lock()

HEALTH_KEYS = {
    "camera", "distance_sensor", "ai_model",
    "controller", "emergency_circuit", "battery"
}
VALID_HEALTH = {"OK", "FAULT", "NOT_CONNECTED"}
SCENARIOS = {
    "safe": {
        "risk_score": 8, "detected_object": "None",
        "object_distance_m": None, "visibility": "Normal",
        "vehicle_speed_kmh": 8, "vehicle_action": "MONITORING",
        "recommended_action": "Continue monitoring",
        "driver_attention": "NOT CONNECTED"
    },
    "person_warning": {
        "risk_score": 48, "detected_object": "Person (simulated)",
        "object_distance_m": 4.2, "visibility": "Normal",
        "vehicle_speed_kmh": 5, "vehicle_action": "SLOW DOWN ADVISED",
        "recommended_action": "Warn operator and reduce speed",
        "driver_attention": "NOT CONNECTED"
    },
    "critical_obstacle": {
        "risk_score": 92, "detected_object": "Obstacle (simulated)",
        "object_distance_m": 0.8, "visibility": "Normal",
        "vehicle_speed_kmh": 0, "vehicle_action": "STOP REQUESTED",
        "recommended_action": "Emergency stop recommendation",
        "driver_attention": "NOT CONNECTED"
    },
    "low_visibility": {
        "risk_score": 63, "detected_object": "Low visibility (simulated)",
        "object_distance_m": None, "visibility": "Low (simulated)",
        "vehicle_speed_kmh": 3, "vehicle_action": "SLOW DOWN ADVISED",
        "recommended_action": "Reduce speed and request inspection",
        "driver_attention": "NOT CONNECTED"
    },
    "drowsiness": {
        "risk_score": 71, "detected_object": "Attention alert (simulated)",
        "object_distance_m": None, "visibility": "Normal",
        "vehicle_speed_kmh": 0, "vehicle_action": "ATTENTION ALERT",
        "recommended_action": "Pause operation and check operator",
        "driver_attention": "ALERT SIMULATED — NOT A DIAGNOSIS"
    }
}

state = {
    "system_active": False,
    "scenario": "safe",
    "profile": {
        "driver_name": "", "driver_id": "",
        "vehicle_id": "MS-VEH-001", "shift": "Day shift"
    },
    "health": {key: "OK" for key in HEALTH_KEYS},
    "events": []
}


def now_string():
    return datetime.now().astimezone().strftime("%Y-%m-%d %H:%M:%S %Z")


def add_event(level, title, details):
    event = {
        "id": str(uuid4()),
        "timestamp": now_string(),
        "level": level,
        "title": title,
        "details": details
    }
    state["events"].insert(0, event)
    state["events"] = state["events"][:250]
    return event


def status_payload():
    scenario_data = SCENARIOS[state["scenario"]].copy()
    if not state["system_active"]:
        scenario_data["vehicle_action"] = "STANDBY"
        scenario_data["vehicle_speed_kmh"] = 0
    return {
        "system_active": state["system_active"],
        "scenario": state["scenario"],
        "profile": state["profile"].copy(),
        "health": state["health"].copy(),
        "events": state["events"].copy(),
        **scenario_data
    }


@app.get("/api/health")
def health_check():
    return jsonify({"ok": True, "service": "MineSafe AI demo backend"})


@app.get("/api/status")
def get_status():
    with lock:
        return jsonify(status_payload())


@app.post("/api/profile")
def save_profile():
    body = request.get_json(silent=True) or {}
    required = ["driver_name", "driver_id", "vehicle_id", "shift"]
    cleaned = {key: str(body.get(key, "")).strip() for key in required}
    missing = [key for key in required if not cleaned[key]]
    if missing:
        return jsonify({"error": "Please complete all required driver and vehicle fields."}), 400
    if len(cleaned["driver_name"]) > 100 or any(len(cleaned[key]) > 60 for key in ["driver_id", "vehicle_id", "shift"]):
        return jsonify({"error": "One or more profile fields are too long."}), 400
    with lock:
        state["profile"] = cleaned
        add_event("INFO", "Driver profile saved", f"Profile saved for {cleaned['driver_name']} · {cleaned['vehicle_id']}.")
        return jsonify({"message": "Driver profile saved.", "status": status_payload()})


@app.post("/api/health")
def update_health():
    body = request.get_json(silent=True) or {}
    key, status = body.get("key"), body.get("status")
    if key not in HEALTH_KEYS or status not in VALID_HEALTH:
        return jsonify({"error": "Invalid subsystem or status."}), 400
    with lock:
        state["health"][key] = status
        if status == "OK":
            add_event("INFO", "System check passed", f"{key.replace('_', ' ').title()} set to OK in demo.")
        else:
            add_event("WARNING", "System check changed", f"{key.replace('_', ' ').title()} set to {status} in demo.")
        return jsonify({"message": f"{key.replace('_', ' ').title()} status updated to {status}.", "status": status_payload()})


@app.post("/api/activate")
def activate():
    with lock:
        missing_profile = not all(state["profile"].get(k) for k in ["driver_name", "driver_id", "vehicle_id", "shift"])
        failed = [key for key, value in state["health"].items() if value != "OK"]
        if missing_profile:
            return jsonify({"error": "Save a complete driver profile before activation."}), 400
        if failed:
            return jsonify({"error": "Activation blocked by demo health checks: " + ", ".join(failed)}), 409
        state["system_active"] = True
        add_event("INFO", "Safety demo activated", "Simulation activated. No physical vehicle control is connected.")
        return jsonify({"message": "Safety demo activated. Simulation only.", "status": status_payload()})


@app.post("/api/deactivate")
def deactivate():
    with lock:
        state["system_active"] = False
        add_event("INFO", "Safety demo deactivated", "Demo returned to standby.")
        return jsonify({"message": "Safety demo deactivated.", "status": status_payload()})


@app.post("/api/scenario")
def set_scenario():
    body = request.get_json(silent=True) or {}
    scenario = body.get("scenario")
    if scenario not in SCENARIOS:
        return jsonify({"error": "Unknown scenario."}), 400
    with lock:
        state["scenario"] = scenario
        item = SCENARIOS[scenario]
        if item["risk_score"] >= 80:
            level = "CRITICAL"
        elif item["risk_score"] >= 30:
            level = "WARNING"
        else:
            level = "INFO"
        add_event(level, f"Scenario applied: {scenario.replace('_', ' ').title()}",
                  f"Risk {item['risk_score']}/100 · {item['recommended_action']}. Demo data only.")
        return jsonify({"message": f"Scenario '{scenario.replace('_', ' ')}' applied.", "status": status_payload()})


@app.post("/api/events/clear")
def clear_events():
    with lock:
        state["events"] = []
        add_event("INFO", "Event history cleared", "A new audit entry was created after clearing demo history.")
        return jsonify({"message": "Event history cleared.", "status": status_payload()})


@app.errorhandler(404)
def not_found(_error):
    return jsonify({"error": "API endpoint not found."}), 404


if __name__ == "__main__":
    print("MineSafe AI demo API starting at http://127.0.0.1:5000")
    print("SIMULATION ONLY — this API does not control real vehicle hardware.")
    app.run(host="127.0.0.1", port=5000, debug=True)
