import quiniela from './quiniela.js';

class UI {
    constructor() {
        this.participanteInput = document.getElementById('participante');
        this.fechaSelect = document.getElementById('fecha');
        this.localSelect = document.getElementById('local');
        this.visitanteSelect = document.getElementById('visitante');
        this.golesLocalInput = document.getElementById('goles-local');
        this.golesVisitanteInput = document.getElementById('goles-visitante');
        this.addPredictionBtn = document.getElementById('add-prediction-btn');
        this.prediccionesTable = document.getElementById('predicciones');

        this.inicializarEventos();
    }

    inicializarEventos() {
        this.addPredictionBtn.addEventListener('click', () => this.agregarPrediccion());
    }

    async agregarPrediccion() {
        try {
            const prediccion = {
                participante: this.participanteInput.value,
                fecha: this.fechaSelect.value,
                local: this.localSelect.value,
                visitante: this.visitanteSelect.value,
                golesLocal: parseInt(this.golesLocalInput.value),
                golesVisitante: parseInt(this.golesVisitanteInput.value),
            };

            await quiniela.guardarPrediccion(prediccion);
            this.actualizarTabla();
        } catch (error) {
            console.error("Error al agregar predicción:", error);
        }
    }

    actualizarTabla() {
        this.prediccionesTable.innerHTML = ''; // Limpiar tabla antes de actualizar
        quiniela.predicciones.forEach((prediccion) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${prediccion.participante}</td>
                <td>${prediccion.fecha}</td>
                <td>${prediccion.local}</td>
                <td>${prediccion.golesLocal} - ${prediccion.golesVisitante}</td>
                <td>${prediccion.visitante}</td>
            `;
            this.prediccionesTable.appendChild(row);
        });
    }
}

export default UI;
