import time
import random
import requests
from datetime import datetime

# Credenciales de tu proyecto Supabase
SUPABASE_URL = "https://vqlmwrrweewflfzdtujf.supabase.co"
SUPABASE_KEY = "sb_publishable_7HH-Vm4lFXzIH1qzRlvEoA_gFvZ7wqE"

ENDPOINT = f"{SUPABASE_URL}/rest/v1/registros_ambientales"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

# IDs de los sensores creados en tu tabla dispositivos_sensores
SENSORES = [
    {"id": 1, "nombre": "ESP32 - Invernadero 01"},
    {"id": 2, "nombre": "ESP32 - Invernadero 02"},
    {"id": 3, "nombre": "invernadero tres"}
]

INTERVALO_SEGUNDOS = 5  # Cada cuánto tiempo envía lectura

print("🌱 Iniciando simulador de sensores IoT (Presiona Ctrl+C para detener)...\n")

# Valores iniciales realistas para orquídeas
humedad_actual = 81.0
temp_actual = 21.5

try:
    while True:
        sensor = random.choice(SENSORES)
        
        # Variación suave (random walk) para que el gráfico se vea orgánico y no saltos locos
        humedad_actual = round(max(65.0, min(92.0, humedad_actual + random.uniform(-1.2, 1.2))), 2)
        temp_actual = round(max(17.0, min(27.0, temp_actual + random.uniform(-0.4, 0.4))), 2)

        payload = {
            "id_sensor": sensor["id"],
            "humedad_relativa": humedad_actual,
            "temperatura_celsius": temp_actual
        }

        response = requests.post(ENDPOINT, json=payload, headers=HEADERS)

        hora = datetime.now().strftime("%H:%M:%S")
        if response.status_code in (200, 201):
            print(f"[{hora}] ✅ {sensor['nombre']} -> Humedad: {humedad_actual}% | Temp: {temp_actual}°C")
        else:
            print(f"[{hora}] ❌ Error {response.status_code}: {response.text}")

        time.sleep(INTERVALO_SEGUNDOS)

except KeyboardInterrupt:
    print("\n🛑 Simulación detenida.")