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
        
        // Tablas
        this.prediccionesTable = document.getElementById('predicciones');
        this.resultadosTable = document.getElementById('resultados-oficiales');
        this.puntuacionTable = document.getElementById('tabla-puntuacion');

        this.inicializarEventos();
        this.inicializarQuiniela();
    }

    async inicializarEventos() {
        this.fechaSelect.addEventListener('change', () => this.actualizarEquiposLocales());
        this.localSelect.addEventListener('change', () => this.actualizarEquiposVisitantes());
        this.addPredictionBtn.addEventListener('click', () => this.agregarPrediccion());

        // Actualizar cada minuto
        setInterval(() => this.actualizarResultadosYPuntuaciones(), 60000);
    }

    async inicializarQuiniela() {
        try {
            this.mostrarCargando();
            const success = await quiniela.inicializar();
            if (success) {
                this.cargarFechas();
                await this.actualizarResultadosYPuntuaciones();
            }
        } catch (error) {
            this.mostrarError('Error al inicializar la quiniela');
            console.error(error);
        } finally {
            this.ocultarCargando();
        }
    }

    async actualizarResultadosYPuntuaciones() {
        await this.actualizarTablaResultados();
        await this.actualizarTablaPuntuacion();
        await this.actualizarTablaPredicciones();
    }

    async actualizarTablaResultados() {
        try {
            const resultados = await quiniela.obtenerResultadosActuales();
            this.resultadosTable.innerHTML = '';

            resultados.forEach(resultado => {
                const row = document.createElement('tr');
                const estado = this.calcularEstadoPartido(resultado.fecha);
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap">${this.formatearFecha(resultado.fecha)}</td>
                    <td class="px-6 py-4">${this.capitalizarEquipo(resultado.local)}</td>
                    <td class="px-6 py-4 text-center font-bold">
                        ${resultado.marcador || 'Pendiente'}
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
            console.error('Error al actualizar puntuaciones:', error);
        }
    }

    async actualizarTablaPredicciones() {
        try {
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

    // ... resto de métodos existentes (cargarFechas, actualizarEquiposLocales, etc.) ...

    formatearFecha(fecha) {
        return fecha.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
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