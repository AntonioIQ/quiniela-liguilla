import api from './api.js';

class Quiniela {
    constructor() {
        this.partidos = [];
    }

    async inicializar() {
        try {
            console.log('Inicializando Quiniela...');
            this.partidos = await api.obtenerResultadosWiki();
        } catch (error) {
            console.error('Error al inicializar quiniela:', error);
            throw error;
        }
    }

    obtenerFechasDisponibles() {
        return [...new Set(this.partidos.map(partido => partido.fecha))];
    }

    obtenerEquiposLocales(fecha) {
        return this.partidos
            .filter(partido => partido.fecha === fecha)
            .map(partido => partido.local);
    }

    obtenerEquiposVisitantes(fecha, local) {
        return this.partidos
            .filter(partido => partido.fecha === fecha && partido.local === local)
            .map(partido => partido.visitante);
    }
}

const quiniela = new Quiniela();
export default quiniela;
