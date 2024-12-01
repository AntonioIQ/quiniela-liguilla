import api from './api.js';
import quiniela from './quiniela.js';

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
        this.prediccionesTable = document.getElementById('predicciones');

        this.inicializarEventos();
        this.inicializarQuiniela();
    }

    async inicializarEventos() {
        // Eventos de selección
        this.fechaSelect.addEventListener('change', () => this.actualizarEquiposLocales());
        this.localSelect.addEventListener('change', () => this.actualizarEquiposVisitantes());

        // Evento de agregar predicción
        this.addPredictionBtn.addEventListener('click', () => this.agregarPrediccion());
    }

    async inicializarQuiniela() {
        try {
            this.mostrarCargando();
            const success = await quiniela.inicializar();
            if (success) {
                this.cargarFechas();
                this.actualizarTablaPredicciones();
            }
        } catch (error) {
            this.mostrarError('Error al inicializar la quiniela');
            console.error(error);
        } finally {
            this.ocultarCargando();
        }
    }

    cargarFechas() {
        const fechas = quiniela.obtenerFechasDisponibles();
        this.fechaSelect.innerHTML = '<option value="">Selecciona una fecha</option>';
        fechas.forEach(fecha => {
            const option = document.createElement('option');
            option.value = fecha;
            option.textContent = this.formatearFecha(fecha);
            this.fechaSelect.appendChild(option);
        });
    }

    actualizarEquiposLocales() {
        const fecha = this.fechaSelect.value;
        const equipos = quiniela.obtenerEquiposLocales(fecha);
        
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
        
        this.visitanteSelect.innerHTML = '<option value="">Selecciona equipo visitante</option>';
        equipos.forEach(equipo => {
            const option = document.createElement('option');
            option.value = equipo;
            option.textContent = this.capitalizarEquipo(equipo);
            this.visitanteSelect.appendChild(option);
        });
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

            // Validaciones básicas
            if (!prediccion.fecha) {
                this.mostrarError('Por favor selecciona una fecha');
                return;
            }
            if (!prediccion.local) {
                this.mostrarError('Por favor selecciona el equipo local');
                return;
            }
            if (!prediccion.visitante) {
                this.mostrarError('Por favor selecciona el equipo visitante');
                return;
            }

            await quiniela.guardarPrediccion(prediccion);
            this.actualizarTablaPredicciones();
            this.limpiarFormulario();
            this.mostrarExito('Pronóstico guardado correctamente');
        } catch (error) {
            this.mostrarError(error.message);
        }
    }

    async actualizarTablaPredicciones() {
        try {
            const predicciones = await quiniela.cargarPredicciones();
            this.prediccionesTable.innerHTML = '';

            predicciones.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                       .forEach(prediccion => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap">${prediccion.participante}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${this.formatearFecha(prediccion.fecha)}</td>
                    <td class="px-6 py-4">${this.capitalizarEquipo(prediccion.local)}</td>
                    <td class="px-6 py-4 text-center font-bold">${prediccion.golesLocal} - ${prediccion.golesVisitante}</td>
                    <td class="px-6 py-4">${this.capitalizarEquipo(prediccion.visitante)}</td>
                `;
                this.prediccionesTable.appendChild(row);
            });
        } catch (error) {
            this.mostrarError('Error al cargar las predicciones');
            console.error(error);
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