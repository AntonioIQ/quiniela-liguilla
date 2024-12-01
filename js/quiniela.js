import api from './api.js';

class Quiniela {
    constructor() {
        this.predicciones = [];
    }

    async inicializar() {
        try {
            console.log("Intentando obtener datos de Wikipedia...");
            const resultados = await api.obtenerResultadosWiki();
            console.log("Resultados obtenidos:", resultados);
            // Aquí puedes parsear y utilizar los datos según tus necesidades
        } catch (error) {
            console.error("Error al inicializar la quiniela:", error);
        }
    }

    async cargarPredicciones() {
        try {
            const predicciones = await api.obtenerPredicciones();
            this.predicciones = predicciones || [];
        } catch (error) {
            console.error("Error al cargar predicciones:", error);
        }
    }

    async guardarPrediccion(prediccion) {
        try {
            await api.guardarPrediccion(prediccion);
            this.predicciones.push(prediccion);
        } catch (error) {
            console.error("Error al guardar predicción:", error);
        }
    }
}

export default new Quiniela();
