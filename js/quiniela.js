// js/quiniela.js

export default class Quiniela {
    constructor(api) {
        this.api = api;
        this.partidos = [];
        this.predicciones = [];
    }

    async inicializar() {
        try {
            console.log('Inicializando quiniela...');
            // Cargar partidos desde Wikipedia
            this.partidos = await this.api.obtenerResultadosWiki();
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
            this.predicciones = await this.api.obtenerPredicciones();
            return this.predicciones;
        } catch (error) {
            console.error('Error al cargar predicciones:', error);
            this.predicciones = [];
            return [];
        }
    }

    obtenerResultadosActuales() {
        return this.partidos;
    }

    async guardarPrediccion(prediccion) {
        try {
            // Validar la predicción
            if (!this.validarPrediccion(prediccion)) {
                throw new Error('Predicción inválida');
            }

            // Verificar si ya existe una predicción para este participante y partido
            const existente = this.predicciones.find(p => 
                p.participante === prediccion.participante &&
                p.fecha === prediccion.fecha && 
                p.local === prediccion.local && 
                p.visitante === prediccion.visitante
            );

            if (existente) {
                throw new Error('Ya existe una predicción tuya para este partido');
            }

            // Guardar en GitHub
            const resultado = await this.api.guardarPrediccion(prediccion);
            
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

    calcularPuntosPrediccion(prediccion) {
        console.log('Calculando puntos para:', prediccion);
        // Buscar el resultado real
        const partido = this.partidos.find(p => 
            p.fecha === prediccion.fecha && 
            p.local === prediccion.local && 
            p.visitante === prediccion.visitante
        );

        if (!partido || !partido.marcador) {
            console.log('Partido no encontrado o sin resultado');
            return null;
        }

        const [golesLocalReal, golesVisitanteReal] = partido.marcador.split('-').map(Number);
        console.log('Resultado real:', golesLocalReal, '-', golesVisitanteReal);
        console.log('Predicción:', prediccion.golesLocal, '-', prediccion.golesVisitante);

        // Resultado exacto
        if (prediccion.golesLocal === golesLocalReal && 
            prediccion.golesVisitante === golesVisitanteReal) {
            return 3;
        }

        // Solo ganador o empate
        const diferenciaPrediccion = prediccion.golesLocal - prediccion.golesVisitante;
        const diferenciaReal = golesLocalReal - golesVisitanteReal;

        if ((diferenciaPrediccion > 0 && diferenciaReal > 0) ||
            (diferenciaPrediccion === 0 && diferenciaReal === 0) ||
            (diferenciaPrediccion < 0 && diferenciaReal < 0)) {
            return 1;
        }

        return 0;
    }

    async calcularPuntuaciones() {
        const puntuacionesPorParticipante = {};

        this.predicciones.forEach(prediccion => {
            if (!puntuacionesPorParticipante[prediccion.participante]) {
                puntuacionesPorParticipante[prediccion.participante] = {
                    participante: prediccion.participante,
                    puntosTotales: 0,
                    aciertosExactos: 0,
                    soloResultado: 0
                };
            }

            const puntos = this.calcularPuntosPrediccion(prediccion);
            if (puntos === 3) {
                puntuacionesPorParticipante[prediccion.participante].aciertosExactos++;
                puntuacionesPorParticipante[prediccion.participante].puntosTotales += 3;
            } else if (puntos === 1) {
                puntuacionesPorParticipante[prediccion.participante].soloResultado++;
                puntuacionesPorParticipante[prediccion.participante].puntosTotales += 1;
            }
        });

        return Object.values(puntuacionesPorParticipante);
    }
}
