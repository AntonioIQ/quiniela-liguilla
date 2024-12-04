class UI {
    constructor() {
        // Elementos del formulario
        this.participanteInput = document.getElementById('participante');
        this.fechaSelect = document.getElementById('fecha');
        this.localSelect = document.getElementById('local');
        this.visitanteSelect = document.getElementById('visitante');
        this.golesLocalInput = document.getElementById('goles-local');
        this.golesVisitanteInput = document.getElementById('goles-visitante');
        this.addPredictionBtn = document.getElementById('add-prediction-btn');
        
        // Tablas
        this.prediccionesTable = document.getElementById('predicciones');
        this.resultadosTable = document.getElementById('resultados-oficiales');
        this.puntuacionTable = document.getElementById('tabla-puntuacion');

        // Iniciar la aplicación después de que todo esté cargado
        this.inicializar();
    }

    async inicializar() {
        try {
            console.log('Iniciando aplicación...');
            // Primero inicializar la quiniela
            await quiniela.inicializar();
            // Luego configurar eventos
            this.inicializarEventos();
            // Finalmente cargar datos
            await this.cargarDatos();
            // Actualizar cada 5 minutos
            setInterval(() => this.cargarDatos(), 300000);
            console.log('Aplicación inicializada correctamente');
        } catch (error) {
            console.error('Error al inicializar:', error);
            this.mostrarError('Error al inicializar la aplicación');
        }
    }

    inicializarEventos() {
        console.log('Inicializando eventos...');
        // Eventos de selección
        this.fechaSelect.addEventListener('change', () => this.actualizarEquiposLocales());
        this.localSelect.addEventListener('change', () => this.actualizarEquiposVisitantes());
        this.addPredictionBtn.addEventListener('click', () => this.agregarPrediccion());
    }

    async cargarDatos() {
        try {
            console.log('Cargando datos...');
            this.mostrarCargando();
            
            // Cargar fechas disponibles
            const fechas = quiniela.obtenerFechasDisponibles();
            console.log('Fechas disponibles:', fechas);
            
            // Actualizar selector de fechas
            this.fechaSelect.innerHTML = '<option value="">Selecciona una fecha</option>';
            fechas.forEach(fecha => {
                const option = document.createElement('option');
                option.value = fecha;
                option.textContent = this.formatearFecha(fecha);
                this.fechaSelect.appendChild(option);
            });

            // Actualizar todas las tablas
            await Promise.all([
                this.actualizarTablaResultados(),
                this.actualizarTablaPuntuacion(),
                this.actualizarTablaPredicciones()
            ]);
        } catch (error) {
            console.error('Error al cargar datos:', error);
            this.mostrarError('Error al cargar los datos');
        } finally {
            this.ocultarCargando();
        }
    }

    actualizarEquiposLocales() {
        const fecha = this.fechaSelect.value;
        const equipos = quiniela.obtenerEquiposLocales(fecha);
        console.log('Equipos locales para', fecha, ':', equipos);
        
        this.localSelect.innerHTML = '<option value="">Selecciona equipo local</option>';
        equipos.forEach(equipo => {
            const option = document.createElement('option');
            option.value = equipo;
            option.textContent = this.capitalizarEquipo(equipo);
            this.localSelect.appendChild(option);
        });

        this.visitanteSelect.innerHTML = '<option value="">Selecciona equipo visitante</option>';
    }

    actualizarEquiposVisitantes() {
        const fecha = this.fechaSelect.value;
        const local = this.localSelect.value;
        const equipos = quiniela.obtenerEquiposVisitantes(fecha, local);
        console.log('Equipos visitantes para', fecha, local, ':', equipos);
        
        this.visitanteSelect.innerHTML = '<option value="">Selecciona equipo visitante</option>';
        equipos.forEach(equipo => {
            const option = document.createElement('option');
            option.value = equipo;
            option.textContent = this.capitalizarEquipo(equipo);
            this.visitanteSelect.appendChild(option);
        });
    }

    async actualizarTablaResultados() {
        try {
            console.log('Actualizando tabla de resultados...');
            const resultados = await quiniela.obtenerResultadosActuales();
            
            this.resultadosTable.innerHTML = '';
            resultados.forEach(resultado => {
                const row = document.createElement('tr');
                const estado = this.calcularEstadoPartido(resultado.fecha);
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap">${this.formatearFecha(resultado.fecha)}</td>
                    <td class="px-6 py-4">${this.capitalizarEquipo(resultado.local)}</td>
                    <td class="px-6 py-4 text-center font-bold">
                        ${resultado.marcador || '- : -'}
                    </td>
                    <td class="px-6 py-4">${this.capitalizarEquipo(resultado.visitante)}</td>
                    <td class="px-6 py-4">
                        <span class="px-2 py-1 text-xs font-semibold rounded-full ${this.getEstadoClase(estado)}">
                            ${estado}
                        </span>
                    </td>
                `;
                this.resultadosTable.appendChild(row);
            });
        } catch (error) {
            console.error('Error al actualizar resultados:', error);
        }
    }

    async actualizarTablaPuntuacion() {
        try {
            console.log('Actualizando tabla de puntuación...');
            const puntuaciones = await quiniela.calcularPuntuaciones();
            
            this.puntuacionTable.innerHTML = '';
            puntuaciones.sort((a, b) => b.puntosTotales - a.puntosTotales)
                       .forEach((puntuacion, index) => {
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
            console.error('Error al actualizar puntuación:', error);
        }
    }

    async actualizarTablaPredicciones() {
        try {
            console.log('Actualizando tabla de predicciones...');
            const predicciones = await quiniela.cargarPredicciones();
            
            this.prediccionesTable.innerHTML = '';
            predicciones.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                       .forEach(prediccion => {
                const puntos = quiniela.calcularPuntosPredicion(prediccion);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap">${prediccion.participante}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${this.formatearFecha(prediccion.fecha)}</td>
                    <td class="px-6 py-4">${this.capitalizarEquipo(prediccion.local)}</td>
                    <td class="px-6 py-4 text-center font-bold">${prediccion.golesLocal} - ${prediccion.golesVisitante}</td>
                    <td class="px-6 py-4">${this.capitalizarEquipo(prediccion.visitante)}</td>
                    <td class="px-6 py-4 text-center">
                        ${puntos !== null ? 
                            `<span class="px-2 py-1 text-xs font-semibold rounded-full ${this.getPuntosClase(puntos)}">
                                ${puntos}
                            </span>` : 
                            '-'}
                    </td>
                `;
                this.prediccionesTable.appendChild(row);
            });
        } catch (error) {
            console.error('Error al actualizar predicciones:', error);
        }
    }

    async agregarPrediccion() {
        try {
            const participante = this.participanteInput.value.trim();
            if (!participante) {
                this.mostrarError('Por favor ingresa el nombre del participante');
                return;
            }

            const prediccion = {
                participante: participante,
                fecha: this.fechaSelect.value,
                local: this.localSelect.value,
                visitante: this.visitanteSelect.value,
                golesLocal: parseInt(this.golesLocalInput.value),
                golesVisitante: parseInt(this.golesVisitanteInput.value),
                timestamp: new Date().toISOString()
            };

            await quiniela.guardarPrediccion(prediccion);
            await this.cargarDatos();
            this.limpiarFormulario();
            this.mostrarExito('Pronóstico guardado correctamente');
        } catch (error) {
            this.mostrarError(error.message);
        }
    }

    calcularEstadoPartido(fecha) {
        const fechaPartido = new Date(fecha.split(' de ').reverse().join(' '));
        const ahora = new Date();
        
        if (ahora < fechaPartido) return 'Pendiente';
        if (ahora.getTime() - fechaPartido.getTime() < 2 * 60 * 60 * 1000) return 'En Juego';
        return 'Finalizado';
    }

    getEstadoClase(estado) {
        switch (estado) {
            case 'Pendiente': return 'bg-gray-100 text-gray-800';
            case 'En Juego': return 'bg-green-100 text-green-800';
            case 'Finalizado': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    getPuntosClase(puntos) {
        switch (puntos) {
            case 3: return 'bg-green-100 text-green-800';
            case 1: return 'bg-blue-100 text-blue-800';
            case 0: return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    formatearFecha(fecha) {
        return fecha.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }

    capitalizarEquipo(equipo) {
        return equipo.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }

    limpiarFormulario() {
        this.participanteInput.value = '';
        this.fechaSelect.value = '';
        this.localSelect.value = '';
        this.visitanteSelect.value = '';
        this.golesLocalInput.value = '0';
        this.golesVisitanteInput.value = '0';
    }

    mostrarCargando() {
        document.body.style.cursor = 'wait';
    }

    ocultarCargando() {
        document.body.style.cursor = 'default';
    }

    mostrarError(mensaje) {
        const alert = document.createElement('div');
        alert.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg notification';
        alert.textContent = mensaje;
        document.body.appendChild(alert);
        setTimeout(() => alert.remove(), 3000);
    }

    mostrarExito(mensaje) {
        const alert = document.createElement('div');
        alert.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg notification';
        alert.textContent = mensaje;
        document.body.appendChild(alert);
        setTimeout(() => alert.remove(), 3000);
    }
}

const ui = new UI();
export default ui;