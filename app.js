document.addEventListener('DOMContentLoaded', async () => {
  /* =====================================================
   * CONFIG SUPABASE
   * ===================================================== */
  const SUPABASE_URL = 'https://vqlmwrrweewflfzdtujf.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_7HH-Vm4lFXzIH1qzRlvEoA_gFvZ7wqE';

  let supabase = null;
  try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Cliente Supabase inicializado');
  } catch (error) {
    console.error('❌ Error al inicializar Supabase:', error);
  }

  const $ = (id) => document.getElementById(id);

  /* =====================================================
   * VARIABLES GLOBALES DE GRAFICOS Y ESTADO
   * ===================================================== */
  let humidityDonut = null;
  let temperatureDonut = null;
  let mainHistoricalChart = null;
  let historyChart = null;
  let usuarioActualId = null;

  /* =====================================================
   * INICIALIZACION DE GRAFICOS (Chart.js)
   * ===================================================== */
  function createDonut(canvasId, value, max, color) {
    const canvas = $(canvasId);
    if (!canvas) return null;
    return new Chart(canvas, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [value, Math.max(max - value, 0)],
          backgroundColor: [color, '#E5E7EB'],
          borderWidth: 0
        }]
      },
      options: {
        cutout: '75%',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } }
      }
    });
  }

  function updateDonuts(humidity, temperature) {
    if (humidityDonut) {
      humidityDonut.data.datasets[0].data = [humidity, Math.max(100 - humidity, 0)];
      humidityDonut.update();
    }
    if (temperatureDonut) {
      temperatureDonut.data.datasets[0].data = [temperature, Math.max(40 - temperature, 0)];
      temperatureDonut.update();
    }
    if ($('humidity-value')) $('humidity-value').textContent = humidity + '%';
    if ($('temperature-value')) $('temperature-value').textContent = temperature + '\u00B0C';
  }

  function createLineChart(canvasId) {
    const canvas = $(canvasId);
    if (!canvas) return null;
    return new Chart(canvas, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Humedad (%)',
            data: [],
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59,130,246,0.15)',
            tension: 0.35,
            yAxisID: 'yHumidity'
          },
          {
            label: 'Temperatura (\u00B0C)',
            data: [],
            borderColor: '#F97316',
            backgroundColor: 'rgba(249,115,22,0.15)',
            tension: 0.35,
            yAxisID: 'yTemperature'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'bottom' } },
        scales: {
          yHumidity: { type: 'linear', position: 'left', title: { display: true, text: '%' }, min: 40, max: 100 },
          yTemperature: { type: 'linear', position: 'right', title: { display: true, text: '\u00B0C' }, min: 10, max: 35, grid: { drawOnChartArea: false } }
        }
      }
    });
  }

  humidityDonut = createDonut('humidityDonut', 0, 100, '#3B82F6');
  temperatureDonut = createDonut('temperatureDonut', 0, 40, '#F97316');
  mainHistoricalChart = createLineChart('historyChart');
  historyChart = createLineChart('historicalChartTab');

  /* =====================================================
   * FUNCIONES DE CARGA DESDE SUPABASE
   * ===================================================== */
  async function cargarUsuarioInicial() {
    if (!supabase) return;
    const { data, error } = await supabase.from('usuarios').select('*').limit(1).single();
    if (error) {
      console.warn('No se pudo obtener usuario:', error.message);
      return;
    }
    if (data) {
      usuarioActualId = data.id_usuario;
      if ($('nombre-completo')) $('nombre-completo').value = data.nombre;
      if ($('correo-perfil')) $('correo-perfil').value = data.correo;
    }
  }

  async function cargarRegistrosAmbientales() {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('registros_ambientales')
      .select('*, dispositivos_sensores(nombre)')
      .order('fecha_hora_lectura', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error cargando registros ambientales:', error.message);
      return;
    }

    if (!data || data.length === 0) return;

    // 1. Actualizar Donuts con la lectura más reciente
    const ultimo = data[0];
    updateDonuts(Number(ultimo.humedad_relativa), Number(ultimo.temperatura_celsius));

    // 2. Actualizar tabla de "Registros Recientes" en el Panel Principal
    const tbody = $('logs-body');
    if (tbody) {
      tbody.innerHTML = data.slice(0, 5).map((r) => {
        const hora = new Date(r.fecha_hora_lectura).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
        return `<tr>
          <td class="py-2">${hora}</td>
          <td class="py-2">${r.humedad_relativa}%</td>
          <td class="py-2">${r.temperatura_celsius}&deg;C</td>
        </tr>`;
      }).join('');
    }

    // 3. Actualizar tabla detallada en pestaña "Datos Históricos"
    const tbodyDetallado = document.querySelector('#vista-historicos tbody');
    if (tbodyDetallado) {
      tbodyDetallado.innerHTML = data.map((r) => {
        const fechaHora = new Date(r.fecha_hora_lectura).toLocaleString('es-CL', {
          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        const nombreSensor = r.dispositivos_sensores?.nombre || `Sensor #${r.id_sensor}`;
        return `<tr class="hover:bg-gray-50">
          <td class="py-2">${fechaHora}</td>
          <td class="py-2">${nombreSensor}</td>
          <td class="py-2">${r.humedad_relativa}%</td>
          <td class="py-2">${r.temperatura_celsius}°C</td>
        </tr>`;
      }).join('');
    }

    // 4. Actualizar ambos gráficos de línea (en orden cronológico)
    const cronologico = [...data].reverse();
    const labels = cronologico.map((r) =>
      new Date(r.fecha_hora_lectura).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
    );
    const humedades = cronologico.map((r) => Number(r.humedad_relativa));
    const temperaturas = cronologico.map((r) => Number(r.temperatura_celsius));

    [mainHistoricalChart, historyChart].forEach((chart) => {
      if (chart) {
        chart.data.labels = labels;
        chart.data.datasets[0].data = humedades;
        chart.data.datasets[1].data = temperaturas;
        chart.update();
      }
    });
  }

  async function cargarSensores() {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('dispositivos_sensores')
      .select('*')
      .order('id_sensor', { ascending: true });

    if (error) {
      console.error('Error cargando sensores:', error.message);
      return;
    }

    // Renderizar en Panel Principal
    const listaPanel = document.querySelector('#vista-panel section:nth-child(2) ul');
    if (listaPanel && data) {
      listaPanel.innerHTML = data.map((s) => `
        <li class="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
          <span class="flex items-center gap-3">
            <span class="font-medium">${s.nombre} (${s.tipo_sensor})</span>
          </span>
          <span class="flex items-center gap-2 text-sm ${s.estado_conexion ? 'text-green-600' : 'text-red-500'} font-semibold">
            <span class="h-2.5 w-2.5 rounded-full ${s.estado_conexion ? 'bg-green-500' : 'bg-red-500'}"></span>
            ${s.estado_conexion ? 'Conectado' : 'Desconectado'}
          </span>
        </li>
      `).join('');
    }

    // Renderizar en pestaña Sensores
    const listaSensoresTab = document.querySelector('#vista-sensores .space-y-4');
    if (listaSensoresTab && data) {
      listaSensoresTab.innerHTML = data.map((s) => `
        <div class="border border-gray-200 rounded-lg p-4 mb-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-semibold text-gray-800">${s.nombre}</p>
              <p class="text-sm text-gray-500">Tipo: ${s.tipo_sensor} | MAC: ${s.mac_address}</p>
              <p class="text-sm ${s.estado_conexion ? 'text-green-600' : 'text-red-500'} font-semibold flex items-center gap-2 mt-1">
                <span class="h-2.5 w-2.5 rounded-full ${s.estado_conexion ? 'bg-green-500' : 'bg-red-500'}"></span>
                ${s.estado_conexion ? 'Conectado' : 'Desconectado'}
              </p>
            </div>
            <button type="button" onclick="eliminarSensor(${s.id_sensor})" class="text-red-500 hover:text-red-700 text-sm font-semibold">Desvincular</button>
          </div>
        </div>
      `).join('');
    }
  }

  window.eliminarSensor = async (idSensor) => {
    if (!supabase) return;
    const { error } = await supabase.from('dispositivos_sensores').delete().eq('id_sensor', idSensor);
    if (!error) cargarSensores();
  };

  /* =====================================================
   * CALENDARIO DE RIEGO (Lectura y Escritura)
   * ===================================================== */
  const calTitle = $('cal-title');
  const calGrid = $('cal-grid');
  const today = new Date();
  let calYear = today.getFullYear();
  let calMonth = today.getMonth();
  const wateringDays = new Set();

  function renderCalendar() {
    if (!calTitle || !calGrid) return;
    const first = new Date(calYear, calMonth, 1);
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const monthLabel = first.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    calTitle.textContent = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
    calGrid.innerHTML = '';

    for (let i = 0; i < first.getDay(); i++) {
      calGrid.appendChild(document.createElement('span'));
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const cell = document.createElement('span');
      cell.textContent = d;
      cell.className = 'py-1 rounded-md hover:bg-green-100 cursor-pointer';
      const isToday = d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
      if (isToday) cell.className += ' bg-green-900 text-white font-semibold hover:bg-green-900';
      else if (wateringDays.has(`${calYear}-${calMonth}-${d}`)) cell.className += ' bg-blue-100 text-blue-700 font-semibold';
      calGrid.appendChild(cell);
    }
  }

  async function cargarRiegos() {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('calendario_riego')
      .select('*')
      .order('fecha_hora_programada', { ascending: true });

    if (error) {
      console.error('Error cargando riegos:', error.message);
      return;
    }

    wateringDays.clear();
    if (data) {
      data.forEach((ev) => {
        const f = new Date(ev.fecha_hora_programada);
        wateringDays.add(`${f.getFullYear()}-${f.getMonth()}-${f.getDate()}`);
      });

      // Lista en Panel Principal
      const nextList = $('next-watering-list');
      if (nextList) {
        nextList.innerHTML = data.slice(0, 3).map((ev) => {
          const f = new Date(ev.fecha_hora_programada);
          const textoFecha = f.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'short' });
          const textoHora = f.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
          return `<li class="flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2">
            <span>🔔</span> ${textoFecha} a las ${textoHora}
          </li>`;
        }).join('');
      }

      // Lista en pestaña Calendario
      const tabList = $('lista-proximos-riegos');
      if (tabList) {
        tabList.innerHTML = data.map((ev) => {
          const f = new Date(ev.fecha_hora_programada);
          const textoFecha = f.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
          const textoHora = f.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
          return `<li class="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
            <div class="flex items-center gap-3">
              <span class="text-blue-500 text-xl">💧</span>
              <div>
                <p class="font-medium text-gray-800 capitalize">${textoFecha}</p>
                <p class="text-sm text-gray-500">${textoHora} ${ev.notas ? '— ' + ev.notas : ''}</p>
              </div>
            </div>
            <button type="button" onclick="eliminarRiego(${ev.id_evento_riego})" class="text-red-500 hover:text-red-700 text-lg">🗑️</button>
          </li>`;
        }).join('');
      }
    }
    renderCalendar();
  }

  window.eliminarRiego = async (idEvento) => {
    if (!supabase) return;
    const { error } = await supabase.from('calendario_riego').delete().eq('id_evento_riego', idEvento);
    if (!error) cargarRiegos();
  };

  /* =====================================================
   * NAVEGACION POR PESTANAS (SPA)
   * ===================================================== */
  const navLinks = document.querySelectorAll('nav a[data-target]');
  const views = document.querySelectorAll('[id^="vista-"]');

  function showView(targetId) {
    views.forEach((view) => view.classList.add('hidden'));
    const target = $(targetId);
    if (target) target.classList.remove('hidden');

    navLinks.forEach((link) => {
      const isActive = link.dataset.target === targetId;
      link.classList.remove('font-semibold', 'border-b-2', 'border-white', 'pb-1', 'opacity-80', 'hover:opacity-100');
      if (isActive) link.classList.add('font-semibold', 'border-b-2', 'border-white', 'pb-1');
      else link.classList.add('opacity-80', 'hover:opacity-100');
    });
  }

  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      showView(link.dataset.target);
    });
  });

  // Botón "+ Agregar Evento" del panel principal redirige a la pestaña de calendario
  const btnAgregarEvento = document.querySelector('#vista-panel button');
  if (btnAgregarEvento && btnAgregarEvento.textContent.includes('Agregar Evento')) {
    btnAgregarEvento.addEventListener('click', () => showView('vista-calendario'));
  }

  const calPrev = $('cal-prev');
  const calNext = $('cal-next');
  if (calPrev) calPrev.addEventListener('click', () => {
    calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar();
  });
  if (calNext) calNext.addEventListener('click', () => {
    calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar();
  });

  /* =====================================================
   * FORMULARIOS (INSERTS EN SUPABASE)
   * ===================================================== */
  const formRiego = $('form-riego');
  if (formRiego) {
    formRiego.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!supabase || !usuarioActualId) return;

      const formData = new FormData(formRiego);
      const hora = formData.get('hora');
      const notas = formData.get('notas');
      const dias = formData.getAll('dias');

      // Crear fecha programada para mañana a la hora elegida (simulación)
      const [hh, mm] = hora.split(':');
      const fechaProg = new Date();
      fechaProg.setDate(fechaProg.getDate() + 1);
      fechaProg.setHours(Number(hh), Number(mm), 0, 0);

      const { error } = await supabase.from('calendario_riego').insert([{
        id_usuario: usuarioActualId,
        fecha_hora_programada: fechaProg.toISOString(),
        notas: notas || `Días: ${dias.join(', ')}`
      }]);

      if (error) {
        alert('Error guardando riego: ' + error.message);
      } else {
        formRiego.reset();
        cargarRiegos();
      }
    });
  }

  const formSensor = $('form-sensor');
  if (formSensor) {
    formSensor.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!supabase) return;

      const formData = new FormData(formSensor);
      const { error } = await supabase.from('dispositivos_sensores').insert([{
        nombre: formData.get('nombre'),
        tipo_sensor: formData.get('tipo'),
        mac_address: formData.get('mac'),
        estado_conexion: true
      }]);

      if (error) {
        alert('Error vinculando sensor: ' + error.message);
      } else {
        formSensor.reset();
        cargarSensores();
      }
    });
  }

  /* =====================================================
   * SIMULADOR DE LECTURA IOT DESDE CONSOLA / REALTIME
   * ===================================================== */
  // Puedes ejecutar simularLecturaIoT() en la consola del navegador para probar inserciones en vivo
  window.simularLecturaIoT = async (idSensor = 1) => {
    if (!supabase) return;
    const hum = (Math.random() * (86 - 76) + 76).toFixed(2);
    const temp = (Math.random() * (24 - 19) + 19).toFixed(2);

    const { error } = await supabase.from('registros_ambientales').insert([{
      id_sensor: idSensor,
      humedad_relativa: Number(hum),
      temperatura_celsius: Number(temp)
    }]);

    if (error) console.error('Error simulando lectura:', error.message);
    else {
      console.log(`📡 Nueva lectura enviada -> Humedad: ${hum}%, Temp: ${temp}°C`);
      cargarRegistrosAmbientales();
    }
  };

  /* =====================================================
   * EXPORTAR CSV
   * ===================================================== */
  const btnExportarCsv = $('btn-exportar-csv');
  if (btnExportarCsv) {
    btnExportarCsv.addEventListener('click', () => {
      const tabla = document.querySelector('#vista-historicos table');
      if (!tabla) return;

      const headers = Array.from(tabla.querySelectorAll('thead th')).map((th) => th.textContent.trim());
      const rows = Array.from(tabla.querySelectorAll('tbody tr')).map((tr) =>
        Array.from(tr.querySelectorAll('td')).map((td) => td.textContent.trim())
      );

      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => '"' + cell.replace(/"/g, '""') + '"').join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'historial_condiciones.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  }

  /* =====================================================
   * EJECUCION INICIAL
   * ===================================================== */
  showView('vista-panel');
  await cargarUsuarioInicial();
  await Promise.all([
    cargarSensores(),
    cargarRegistrosAmbientales(),
    cargarRiegos()
  ]);

  /* =====================================================
   * SUSCRIPCION EN TIEMPO REAL (Escucha inserciones del script)
   * ===================================================== */
  if (supabase) {
    supabase
      .channel('cambios-ambientales')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'registros_ambientales' },
        (payload) => {
          console.log('⚡ Nueva lectura recibida desde IoT:', payload.new);
          cargarRegistrosAmbientales();
        }
      )
      .subscribe();
  }
});