# ProyectoOrquideas

SPA (Single Page Application) en JavaScript vanilla para el monitoreo y gestión de un sistema de riego / invernadero.

## Secciones

- **Dashboard**: métricas generales (humedad, temperatura, alertas).
- **Calendario**: programación de riegos (RF1/RF2).
- **Datos Históricos**: filtros, gráfico de humedad/temperatura (Chart.js) y tabla detallada con exportación a CSV (RF5).
- **Sensores**: listado de dispositivos activos y vinculación de nuevos sensores ESP32 (RF3).
- **Configuración**: perfil de usuario y seguridad (cambio de contraseña, cierre de sesión).

## Tecnologías

- HTML5 + Tailwind CSS (CDN)
- JavaScript Vanilla (SPA con navegación por pestañas)
- Chart.js
- Supabase (integración pendiente / TODOs)

## Uso

1. Abrir `index.html` en el navegador.
2. Navegar por las pestañas superiores.

## Estructura

```
Proyecto_Etapa_III/
├── index.html
└── app.js
```

## Estado

Proyecto en etapa III. Integración con Supabase pendiente (marcada con comentarios `// TODO`).


========================================================SEGUNDA PARTE===========================================================================


```markdown
# 🌸 Panel de Control de Orquídeas (Sistema Inteligente IoT)

Plataforma web de monitoreo y gestión ambiental diseñada para el cuidado inteligente de cultivos de orquídeas mediante componentes IoT simulados, persistencia en la nube con **Supabase (PostgreSQL)** y visualización de telemetría en tiempo real.

---

## 🛠️ Arquitectura e Implementación Realizada

Para desacoplar la captura de datos de los sensores respecto a la interfaz de monitoreo, se implementó una arquitectura orientada a eventos en tres capas:

1. **Base de Datos Relacional en la Nube (Supabase / PostgreSQL):**
   * Creación y despliegue del esquema relacional (`esquema_base_datos.sql`) compuesto por las tablas `usuarios`, `dispositivos_sensores`, `registros_ambientales` y `calendario_riego`.
   * Configuración de la API REST automática y habilitación de **Database Publications (`supabase_realtime`)** sobre la tabla `registros_ambientales` para emitir eventos `INSERT` en vivo.

2. **Conexión Frontend y Actualización en Tiempo Real (`index.html` + `app.js`):**
   * Integración del cliente oficial `@supabase/supabase-js` directamente en la aplicación web.
   * Reemplazo de los datos estáticos por consultas reales (`SELECT`, `INSERT`, `DELETE`) para alimentar los indicadores tipo dona (Humedad y Temperatura), los gráficos históricos de líneas (**Chart.js**), la gestión de dispositivos vinculados y el calendario interactivo de riego.
   * Implementación de una suscripción vía **WebSockets** (Supabase Realtime) que escucha cada nueva lectura insertada en la base de datos y actualiza los gráficos y tablas automáticamente sin necesidad de recargar la página.

3. **Simulador Externo de Nodos IoT (`pruebas/simulador_esp32.py`):**
   * Desarrollo de un script independiente en Python que emula el comportamiento de placas **ESP32** equipadas con sensores ambientales (como el DHT22).
   * Envío periódico de paquetes JSON mediante peticiones HTTP `POST` hacia el endpoint REST de Supabase, generando variaciones orgánicas de humedad relativa (%) y temperatura (°C) asociadas a los sensores registrados.

---

## 📁 Estructura del Proyecto

```text
ProyectoOrquideas/
├── index.html               # Interfaz principal del panel (Tailwind CSS + Chart.js + SDK Supabase)
├── app.js                   # Lógica SPA, consultas a Supabase y suscripción Realtime
├── esquema_base_datos.sql   # Script SQL de creación de tablas, índices y datos iniciales
├── pruebas/
│   └── simulador_esp32.py   # Script en Python que simula el envío continuo de lecturas IoT
└── README.md                # Documentación del proyecto

```

---

## 🚀 Cómo Ejecutar y Probar el Proyecto en Local

No es necesario crear una cuenta nueva en Supabase ni configurar tablas locales, ya que el proyecto apunta directamente a la instancia en la nube configurada para el equipo.

### Requisitos Previos

* **Visual Studio Code** con la extensión **Live Server** instalada.
* **Python 3** instalado (para ejecutar el simulador de sensores).

---

### Paso 1: Levantar el Panel Web

1. Clona o descarga este repositorio y abre la carpeta `ProyectoOrquideas` en **Visual Studio Code**.
2. Haz clic derecho sobre el archivo `index.html` y selecciona **"Open with Live Server"** (no abrir con doble clic como `file://`, ya que el navegador bloquea las peticiones hacia la API por seguridad).
3. El panel se abrirá en tu navegador (`http://127.0.0.1:5500/index.html`) cargando automáticamente los sensores, el calendario y los últimos registros almacenados en Supabase.

---

### Paso 2: Ejecutar el Simulador de Sensores IoT

1. Abre una terminal en Visual Studio Code (`Ctrl + ñ` o menú *Terminal > New Terminal*).
2. Instala la librería `requests` (solo la primera vez):
```bash
pip install requests

```


3. Navega hacia la carpeta de pruebas y ejecuta el script simulador:
```bash
cd ProyectoOrquideas/pruebas
python simulador_esp32.py

```


4. Verás en la consola cada lectura enviada cada 5 segundos (`✅ ESP32 - Invernadero 01 -> Humedad: ...`).
5. **Validación en tiempo real:** Mantén la ventana del navegador visible junto a la terminal; observarás cómo los gráficos de dona, la curva de evolución ambiental y la tabla de registros recientes se actualizan solos ante cada envío.
6. Para detener la simulación, presiona `Ctrl + C` en la terminal.

---

### Paso 3: Pruebas Funcionales Adicionales en la Interfaz

* **Vinculación de Dispositivos:** En la pestaña **Sensores**, puedes registrar una nueva placa indicando nombre, tipo de conexión (Wi-Fi/Bluetooth) y dirección MAC, o desvincular sensores existentes.
* **Programación de Riego:** En la pestaña **Calendario de Riego** (o mediante el botón `+ Agregar Evento`), puedes agendar nuevos horarios de riego que quedan persistidos en la base de datos y marcados en el calendario mensual.
* **Exportación de Datos:** En **Datos Históricos**, el botón **Exportar CSV** permite descargar el registro detallado de mediciones ambientales.

```

