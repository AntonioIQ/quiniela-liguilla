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

            // Verificar si ya existe una predicción para este partido
            const existente = this.predicciones.find(p => 
                p.participante === prediccion.participante &&
                p.ID === prediccion.ID
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
        // Validar campos necesarios
        if (!prediccion.participante || !prediccion.ID || 
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

        // Validar que el partido existe
        const partidoExiste = this.partidos.some(p => p.ID === prediccion.ID);
        if (!partidoExiste) {
            throw new Error('El partido seleccionado no es válido');
        }

        return true;
    }

    obtenerPartidoPorId(id) {
        return this.partidos.find(p => p.ID === id);
    }

    parsearMarcador(marcador) {
        // Manejar diferentes formatos de marcador
        if (!marcador || marcador === 'vs.' || marcador === 'vs') {
            return null;
        }

        // Extraer solo el resultado principal (antes del paréntesis si existe)
        const resultadoPrincipal = marcador.split('(')[0].trim();
        const [golesLocal, golesVisitante] = resultadoPrincipal.split(':').map(Number);
        
        return { golesLocal, golesVisitante };
    }

    calcularPuntosPrediccion(prediccion) {
        console.log('Calculando puntos para:', prediccion);
        const partido = this.obtenerPartidoPorId(prediccion.ID);

        if (!partido || !partido.marcador) {
            console.log('Partido no encontrado o sin resultado');
            return null;
        }

        const resultadoReal = this.parsearMarcador(partido.marcador);
        if (!resultadoReal) {
            console.log('Partido aún no jugado');
            return null;
        }

        console.log('Resultado real:', resultadoReal);
        console.log('Predicción:', prediccion.golesLocal, '-', prediccion.golesVisitante);

        // Resultado exacto
        if (prediccion.golesLocal === resultadoReal.golesLocal && 
            prediccion.golesVisitante === resultadoReal.golesVisitante) {
            return 3;
        }

        // Solo ganador o empate
        const diferenciaPrediccion = prediccion.golesLocal - prediccion.golesVisitante;
        const diferenciaReal = resultadoReal.golesLocal - resultadoReal.golesVisitante;

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

        return Object.values(puntuacionesPorParticipante)
            .sort((a, b) => b.puntosTotales - a.puntosTotales);
    }

    obtenerPartidosPorEtapa(etapa) {
        return this.partidos.filter(p => p.etapa === etapa);
    }

    obtenerEtapas() {
        return [...new Set(this.partidos.map(p => p.etapa))];
    }
}