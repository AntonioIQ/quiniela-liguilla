export default class UI {
    constructor(quiniela) {
        this.quiniela = quiniela;
        this.inicializarElementos();
    }

    inicializarElementos() {
        // Elementos del formulario
        this.participanteInput = null;
        this.etapaSelect = null;
        this.partidoSelect = null;
        this.golesLocalInput = null;
        this.golesVisitanteInput = null;
        this.addPredictionBtn = null;

        // Tablas
        this.prediccionesTable = null;
        this.resultadosTable = null;
        this.puntuacionTable = null;
    }

    async inicializar() {
        try {
            console.log('Inicializando UI...');

            // Asignar elementos del DOM
            this.participanteInput = document.getElementById('participante');
            this.etapaSelect = document.getElementById('etapa');
            this.partidoSelect = document.getElementById('partido');
            this.golesLocalInput = document.getElementById('goles-local');
            this.golesVisitanteInput = document.getElementById('goles-visitante');
            this.addPredictionBtn = document.getElementById('add-prediction-btn');

            // Tablas
            this.prediccionesTable = document.getElementById('predicciones');
            this.resultadosTable = document.getElementById('resultados-oficiales');
            this.puntuacionTable = document.getElementById('tabla-puntuacion');

            // Inicializar eventos
            this.inicializarEventos();

            // Cargar datos iniciales
            await this.cargarDatos();

            // Actualizar datos cada 5 minutos
            setInterval(() => this.cargarDatos(), 300000);

            console.log('UI inicializada correctamente');
        } catch (error) {
            console.error('Error al inicializar UI:', error);
            this.mostrarError('Error al inicializar la aplicación');
        }
    }

    inicializarEventos() {
        console.log('Inicializando eventos...');
        this.etapaSelect.addEventListener('change', () => this.actualizarPartidosDisponibles());
        this.addPredictionBtn.addEventListener('click', () => this.agregarPrediccion());
    }

    async cargarDatos() {
        try {
            console.log('Cargando datos...');
            this.mostrarCargando();

            // Cargar etapas disponibles
            const etapas = this.quiniela.obtenerEtapas();
            console.log('Etapas disponibles:', etapas);

            // Actualizar selector de etapas
            this.etapaSelect.innerHTML = '<option value="">Selecciona una etapa</option>';
            etapas.forEach(etapa => {
                const option = document.createElement('option');
                option.value = etapa;
                option.textContent = etapa;
                this.etapaSelect.appendChild(option);
            });

            // Actualizar todas las tablas
            await Promise.all([
                this.actualizarResultadosOficiales(),
                this.actualizarTablaPuntuaciones(),
                this.actualizarPredicciones()
            ]);

            console.log('Datos cargados correctamente');
        } catch (error) {
            console.error('Error al cargar datos:', error);
            this.mostrarError('Error al cargar los datos');
        } finally {
            this.ocultarCargando();
        }
    }

    async actualizarResultadosOficiales() {
        try {
            const resultados = this.quiniela.obtenerResultadosActuales();
            const etapas = this.quiniela.obtenerEtapas();

            this.resultadosTable.innerHTML = '';
            
            etapas.forEach(etapa => {
                // Crear encabezado de etapa
                const headerRow = document.createElement('tr');
                headerRow.innerHTML = `
                    <th colspan="6" class="px-6 py-3 text-left text-lg font-semibold bg-gray-100">
                        ${etapa}
                    </th>
                `;
                this.resultadosTable.appendChild(headerRow);

                // Filtrar partidos por etapa
                const partidosEtapa = resultados.filter(r => r.etapa === etapa);
                
                partidosEtapa.forEach(partido => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td class="px-6 py-4 whitespace-nowrap">${partido.fecha}</td>
                        <td class="px-6 py-4">${this.capitalizarEquipo(partido.local)}</td>
                        <td class="px-6 py-4 text-center font-bold">${partido.marcador || '-'}</td>
                        <td class="px-6 py-4">${this.capitalizarEquipo(partido.visitante)}</td>
                        <td class="px-6 py-4">${partido.estadio || '-'}</td>
                        <td class="px-6 py-4">${partido.ciudad || '-'}</td>
                    `;
                    this.resultadosTable.appendChild(row);
                });
            });
        } catch (error) {
            console.error('Error al actualizar resultados:', error);
        }
    }

    async actualizarTablaPuntuaciones() {
        try {
            const puntuaciones = await this.quiniela.calcularPuntuaciones();
            if (!puntuaciones?.length) return;

            this.puntuacionTable.innerHTML = '';
            puntuaciones.forEach((puntuacion, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap">${index + 1}°</td>
                    <td class="px-6 py-4 font-medium">${puntuacion.participante}</td>
                    <td class="px-6 py-4 text-center font-bold">${puntuacion.puntosTotales}</td>
                    <td class="px-6 py-4 text-center">${puntuacion.aciertosExactos}</td>
                    <td class="px-6 py-4 text-center">${puntuacion.soloResultado}</td>
                `;
                this.puntuacionTable.appendChild(row);
            });
        } catch (error) {
            console.error('Error al actualizar puntuaciones:', error);
        }
    }

    async actualizarPredicciones() {
        try {
            const predicciones = await this.quiniela.cargarPredicciones();
            if (!predicciones?.length) return;

            this.prediccionesTable.innerHTML = '';
            predicciones.forEach(prediccion => {
                const partido = this.quiniela.obtenerPartidoPorId(prediccion.ID);
                if (!partido) return;

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-6 py-4">${prediccion.participante}</td>
                    <td class="px-6 py-4">${partido.etapa}</td>
                    <td class="px-6 py-4">${partido.fecha}</td>
                    <td class="px-6 py-4">${this.capitalizarEquipo(partido.local)} vs ${this.capitalizarEquipo(partido.visitante)}</td>
                    <td class="px-6 py-4 text-center">${prediccion.golesLocal} - ${prediccion.golesVisitante}</td>
                    <td class="px-6 py-4 text-center">${this.formatearPuntos(this.quiniela.calcularPuntosPrediccion(prediccion))}</td>
                `;
                this.prediccionesTable.appendChild(row);
            });
        } catch (error) {
            console.error('Error al actualizar predicciones:', error);
        }
    }

    actualizarPartidosDisponibles() {
        const etapa = this.etapaSelect.value;
        if (!etapa) {
            this.partidoSelect.innerHTML = '<option value="">Selecciona un partido</option>';
            return;
        }

        const partidos = this.quiniela.obtenerPartidosPorEtapa(etapa);
        
        this.partidoSelect.innerHTML = '<option value="">Selecciona un partido</option>';
        partidos.forEach(partido => {
            const option = document.createElement('option');
            option.value = partido.ID;
            option.textContent = `${partido.fecha} - ${this.capitalizarEquipo(partido.local)} vs ${this.capitalizarEquipo(partido.visitante)}`;
            this.partidoSelect.appendChild(option);
        });
    }

    formatearPuntos(puntos) {
        if (puntos === null) return '-';
        return `<span class="px-2 py-1 text-xs font-semibold rounded-full ${this.getPuntosClase(puntos)}">${puntos}</span>`;
    }

    getPuntosClase(puntos) {
        switch (puntos) {
            case 3: return 'bg-green-100 text-green-800';
            case 1: return 'bg-blue-100 text-blue-800';
            case 0: return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    capitalizarEquipo(equipo) {
        return equipo.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }

    mostrarCargando() {
        document.body.style.cursor = 'wait';
    }

    ocultarCargando() {
        document.body.style.cursor = 'default';
    }

    mostrarError(mensaje) {
        const alert = document.createElement('div');
        alert.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg z-50';
        alert.textContent = mensaje;
        document.body.appendChild(alert);
        setTimeout(() => alert.remove(), 3000);
    }

    mostrarExito(mensaje) {
        const alert = document.createElement('div');
        alert.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50';
        alert.textContent = mensaje;
        document.body.appendChild(alert);
        setTimeout(() => alert.remove(), 3000);
    }
}