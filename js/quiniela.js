import api from './api.js';

class Quiniela {
    constructor() {
        this.partidos = [];
        this.predicciones = [];
    }

    async inicializar() {
        try {
            console.log('Inicializando quiniela...');
            // Cargar partidos desde Wikipedia
            this.partidos = await api.obtenerResultadosWiki();
            console.log('Partidos cargados:', this.partidos);
            
            // Cargar predicciones desde GitHub
            await this.cargarPredicciones();
            return true;
        } catch (error) {
            console.error('Error al inicializar quiniela:', error);
            return false;
        }
    }

    async cargarPredicciones() {
        try {
            this.predicciones = await api.obtenerPredicciones();
            console.log('Predicciones cargadas:', this.predicciones);
            return this.predicciones;
        } catch (error) {
            console.error('Error al cargar predicciones:', error);
            this.predicciones = [];
            return [];
        }
    }

    async guardarPrediccion(prediccion) {
        try {
            // Validar la predicción
            if (!this.validarPrediccion(prediccion)) {
                throw new Error('Predicción inválida');
            }

            // Verificar si ya existe una predicción para este participante y partido
            if (this.predicciones.some(p => 
                p.participante === prediccion.participante &&
                p.fecha === prediccion.fecha && 
                p.local === prediccion.local && 
                p.visitante === prediccion.visitante)) {
                throw new Error('Ya existe una predicción tuya para este partido');
            }

            // Guardar en GitHub
            const resultado = await api.guardarPrediccion(prediccion);
            
            // Actualizar lista local
            this.predicciones.push(prediccion);
            
            return resultado;
        } catch (error) {
            console.error('Error al guardar predicción:', error);
            throw error;
        }
    }

    validarPrediccion(prediccion) {
        // Validar que todos los campos necesarios estén presentes
        if (!prediccion.participante || !prediccion.fecha || !prediccion.local || !prediccion.visitante || 
            prediccion.golesLocal === undefined || prediccion.golesVisitante === undefined) {
            return false;
        }

        // Validar que los goles sean números no negativos
        if (prediccion.golesLocal < 0 || prediccion.golesVisitante < 0) {
            return false;
        }

        // Validar el nombre del participante
        if (prediccion.participante.length < 2) {
            throw new Error('El nombre del participante debe tener al menos 2 caracteres');
        }

        // Validar que el partido existe en la lista de partidos
        const partidoExiste = this.partidos.some(p => 
            p.fecha === prediccion.fecha && 
            p.local === prediccion.local && 
            p.visitante === prediccion.visitante
        );

        if (!partidoExiste) {
            throw new Error('El partido seleccionado no es válido');
        }

        return true;
    }

    obtenerFechasDisponibles() {
        return [...new Set(this.partidos.map(p => p.fecha))].sort();
    }

    obtenerEquiposLocales(fecha) {
        return [...new Set(this.partidos
            .filter(p => p.fecha === fecha)
            .map(p => p.local))]
            .sort();
    }

    obtenerEquiposVisitantes(fecha, local) {
        return this.partidos
            .filter(p => p.fecha === fecha && p.local === local)
            .map(p => p.visitante)
            .sort();
    }
}

const quiniela = new Quiniela();
export default quiniela;