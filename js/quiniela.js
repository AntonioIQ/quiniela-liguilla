import api from './api.js';

class Quiniela {
    constructor() {
        this.partidos = [];
        this.predicciones = [];
    }

    async inicializar() {
        try {
            // Cargar partidos desde Wikipedia
            this.partidos = await api.obtenerResultadosWiki();
            // Cargar predicciones del usuario desde GitHub
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

    calcularPuntos(prediccion, resultado) {
        // Si no hay resultado aún, retornar null
        if (!resultado.marcador) return null;

        const [golesLocalReal, golesVisitanteReal] = resultado.marcador.split(':').map(Number);
        
        // Puntos por acertar el resultado exacto
        if (prediccion.golesLocal === golesLocalReal && 
            prediccion.golesVisitante === golesVisitanteReal) {
            return 3;
        }

        // Puntos por acertar el ganador o empate
        const diferenciaPrediccion = prediccion.golesLocal - prediccion.golesVisitante;
        const diferenciaReal = golesLocalReal - golesVisitanteReal;

        if ((diferenciaPrediccion > 0 && diferenciaReal > 0) ||
            (diferenciaPrediccion === 0 && diferenciaReal === 0) ||
            (diferenciaPrediccion < 0 && diferenciaReal < 0)) {
            return 1;
        }

        return 0;
    }

    obtenerTablaPuntos() {
        const tablaPuntos = {};

        this.predicciones.forEach(prediccion => {
            const partido = this.partidos.find(p => 
                p.fecha === prediccion.fecha && 
                p.local === prediccion.local && 
                p.visitante === prediccion.visitante
            );

            if (partido && partido.marcador) {
                const puntos = this.calcularPuntos(prediccion, partido);
                if (!tablaPuntos[prediccion.participante]) {
                    tablaPuntos[prediccion.participante] = 0;
                }
                tablaPuntos[prediccion.participante] += puntos;
            }
        });

        return Object.entries(tablaPuntos)
            .sort(([,a], [,b]) => b - a)
            .map(([participante, puntos]) => ({ participante, puntos }));
    }
}

const quiniela = new Quiniela();
export default quiniela;