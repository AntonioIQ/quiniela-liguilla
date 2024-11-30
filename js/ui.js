import api from './api.js';
import quiniela from './quiniela.js';

class UI {
    constructor() {
        // Secciones principales
        this.loginSection = document.getElementById('login-section');
        this.quinielaSection = document.getElementById('quiniela-section');

        // Elementos del formulario
        this.fechaSelect = document.getElementById('fecha');
        this.localSelect = document.getElementById('local');
        this.visitanteSelect = document.getElementById('visitante');
        this.golesLocalInput = document.getElementById('goles-local');
        this.golesVisitanteInput = document.getElementById('goles-visitante');
        this.addPredictionBtn = document.getElementById('add-prediction-btn');
        this.prediccionesTable = document.getElementById('predicciones');
        this.githubLoginBtn = document.getElementById('github-login');

        this.inicializarEventos();
    }

    async inicializarEventos() {
        // Evento de login con GitHub
        this.githubLoginBtn.addEventListener('click', async () => {
            try {
                const success = await api.authenticateWithGithub();
                if (success) {
                    await this.inicializarQuiniela();
                }
            } catch (error) {
                this.mostrarError('Error al iniciar sesión');
            }
        });

        // Eventos de selección
        this.fechaSelect.addEventListener('change', () => this.actualizarEquiposLocales());
        this.localSelect.addEventListener('change', () => this.actualizarEquiposVisitantes());

        // Evento de agregar predicción
        this.addPredictionBtn.addEventListener('click', () => this.agregarPrediccion());

        // Inicializar si hay token guardado
        if (localStorage.getItem('github_token')) {
            await this.inicializarQuiniela();
        }
    }

    async inicializarQuiniela() {
        try {
            this.mostrarCargando();
            const success = await quiniela.inicializar();
            if (success) {
                this.mostrarSeccionQuiniela();
                this.cargarFechas();
                this.actualizarTablaPredicciones();
            }
        } catch (error) {
            this.mostrarError('Error al inicializar la quiniela');
        } finally {
            this.ocultarCargando();
        }
    }

    mostrarSeccionQuiniela() {
        this.loginSection.classList.add('hidden');
        this.quinielaSection.classList.remove('hidden');
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
            const prediccion = {
                fecha: this.fechaSelect.value,
                local: this.localSelect.value,
                visitante: this.visitanteSelect.value,
                golesLocal: parseInt(this.golesLocalInput.value),
                golesVisitante: parseInt(this.golesVisitanteInput.value)
            };

            await quiniela.guardarPrediccion(prediccion);
            this.actualizarTablaPredicciones();
            this.limpiarFormulario();
            this.mostrarExito('Predicción guardada correctamente');
        } catch (error) {
            this.mostrarError(error.message);
        }
    }

    async actualizarTablaPredicciones() {
        const predicciones = await quiniela.cargarPredicciones();
        this.prediccionesTable.innerHTML = '';

        predicciones.forEach(prediccion => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">${this.formatearFecha(prediccion.fecha)}</td>
                <td class="px-6 py-4">${this.capitalizarEquipo(prediccion.local)}</td>
                <td class="px-6 py-4">${prediccion.golesLocal} - ${prediccion.golesVisitante}</td>
                <td class="px-6 py-4">${this.capitalizarEquipo(prediccion.visitante)}</td>
                <td class="px-6 py-4">
                    <button class="text-red-600 hover:text-red-900" 
                            onclick="ui.eliminarPrediccion(${prediccion.id})">
                        Eliminar
                    </button>
                </td>
            `;
            this.prediccionesTable.appendChild(row);
        });
    }

    async eliminarPrediccion(id) {
        if (confirm('¿Estás seguro de eliminar esta predicción?')) {
            try {
                await api.eliminarPrediccion(id);
                this.actualizarTablaPredicciones();
                this.mostrarExito('Predicción eliminada correctamente');
            } catch (error) {
                this.mostrarError('Error al eliminar la predicción');
            }
        }
    }

    formatearFecha(fecha) {
        return fecha.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }

    capitalizarEquipo(equipo) {
        return equipo.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }

    limpiarFormulario() {
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
        alert.className = 'notification fixed top-4 right-4 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg';
        alert.textContent = mensaje;
        document.body.appendChild(alert);
        setTimeout(() => alert.remove(), 3000);
    }

    mostrarExito(mensaje) {
        const alert = document.createElement('div');
        alert.className = 'notification fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg';
        alert.textContent = mensaje;
        document.body.appendChild(alert);
        setTimeout(() => alert.remove(), 3000);
    }
}

const ui = new UI();
export default ui;