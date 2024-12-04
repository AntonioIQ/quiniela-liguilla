// js/api.js

export default class API {
    constructor() {
        this.GITHUB_API = 'https://api.github.com';
        this.WIKI_API = 'https://es.wikipedia.org/w/api.php';
        // Inicializar con valores del localStorage si existen
        this.REPO_OWNER = localStorage.getItem('repo_owner') || '';
        this.REPO_NAME = localStorage.getItem('repo_name') || '';
        this.accessToken = localStorage.getItem('github_token') || '';
        console.log('API initialized with token:', this.accessToken ? 'present' : 'missing');
    }

    setCredentials(owner, repo, token) {
        this.REPO_OWNER = owner;
        this.REPO_NAME = repo;
        this.accessToken = token;

        localStorage.setItem('repo_owner', owner);
        localStorage.setItem('repo_name', repo);
        localStorage.setItem('github_token', token);
        console.log('Credentials set successfully');
    }

    async obtenerResultadosWiki() {
        try {
            console.log('Iniciando obtención de datos de Wikipedia...');
            const params = new URLSearchParams({
                action: 'parse',
                page: 'Torneo_Apertura_2024_(México)',
                format: 'json',
                prop: 'text',
                origin: '*',
                formatversion: '2',
                utf8: '1',
                redirects: '1'
            });

            const url = `${this.WIKI_API}?${params.toString()}`;
            console.log('URL de Wikipedia:', url);

            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                mode: 'cors'
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const data = await response.json();
            console.log('Datos de Wikipedia:', data);

            if (!data.parse || !data.parse.text) {
                throw new Error('Formato de respuesta inválido');
            }

            return this.procesarTablaLiguilla(data.parse.text);
        } catch (error) {
            console.error('Error al obtener datos de Wikipedia:', error);
            throw error;
        }
    }

    procesarTablaLiguilla(htmlContent) {
        console.log('Procesando tabla de la Liguilla...');
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent['*'], 'text/html');
        const secciones = doc.querySelectorAll('h3, h4, table.wikitable');

        const partidos = [];
        let fechaActual = '';
        let etapaActual = '';

        secciones.forEach((element) => {
            if (element.tagName === 'H3' || element.tagName === 'H4') {
                // Título de sección (Cuartos de final, Semifinales, etc.)
                etapaActual = element.textContent.trim();
                console.log('Etapa actual:', etapaActual);
            } else if (element.tagName === 'TABLE') {
                // Tabla de partidos
                const rows = element.querySelectorAll('tr');
                rows.forEach((row) => {
                    const cells = row.querySelectorAll('th, td');
                    if (cells.length >= 5) {
                        // Verificar si la primera celda es una fecha
                        const posibleFecha = cells[0]?.textContent?.trim();
                        if (this.esFechaValida(posibleFecha)) {
                            fechaActual = this.convertirFecha(posibleFecha);
                        }

                        const local = cells[1]?.textContent?.trim().toLowerCase() || '';
                        const marcadorText = cells[2]?.textContent?.trim() || '';
                        const visitante = cells[3]?.textContent?.trim().toLowerCase() || '';
                        const estado = cells[4]?.textContent?.trim().toLowerCase() || '';

                        // Extraer el marcador
                        const marcadorMatch = marcadorText.match(/(\d+)\s*[-:]\s*(\d+)/);
                        const marcador = marcadorMatch ? `${marcadorMatch[1]}-${marcadorMatch[2]}` : null;

                        const partido = {
                            fecha: fechaActual,
                            etapa: etapaActual,
                            local: local,
                            marcador: marcador,
                            visitante: visitante,
                            estado: estado
                        };

                        console.log('Partido encontrado:', partido);
                        partidos.push(partido);
                    }
                });
            }
        });

        console.log('Total de partidos encontrados:', partidos.length);
        return partidos;
    }

    esFechaValida(texto) {
        // Verificar si el texto es una fecha válida (por ejemplo, '27 de noviembre')
        const fechaRegex = /^\d{1,2}\s+de\s+\w+$/i;
        return fechaRegex.test(texto);
    }

    convertirFecha(texto) {
        // Convertir texto de fecha a formato 'YYYY-MM-DD'
        const meses = {
            'enero': '01',
            'febrero': '02',
            'marzo': '03',
            'abril': '04',
            'mayo': '05',
            'junio': '06',
            'julio': '07',
            'agosto': '08',
            'septiembre': '09',
            'octubre': '10',
            'noviembre': '11',
            'diciembre': '12'
        };

        const partes = texto.toLowerCase().split(' de ');
        if (partes.length !== 2) return texto;

        const dia = partes[0].padStart(2, '0');
        const mes = meses[partes[1]] || '01';
        const anio = new Date().getFullYear(); // Asumimos el año actual

        return `${anio}-${mes}-${dia}`;
    }

    async guardarPrediccion(prediccion) {
        if (!this.accessToken) {
            throw new Error('No hay token de acceso');
        }

        try {
            console.log('Guardando predicción:', prediccion);
            const response = await fetch(`${this.GITHUB_API}/repos/${this.REPO_OWNER}/${this.REPO_NAME}/issues`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: `Predicción: ${prediccion.local} vs ${prediccion.visitante}`,
                    body: JSON.stringify(prediccion),
                    labels: ['prediccion']
                })
            });

            if (!response.ok) {
                throw new Error('Error al guardar la predicción');
            }

            const result = await response.json();
            console.log('Predicción guardada:', result);
            return result;
        } catch (error) {
            console.error('Error al guardar predicción:', error);
            throw error;
        }
    }

    async obtenerPredicciones() {
        if (!this.accessToken) {
            throw new Error('No hay token de acceso');
        }

        try {
            console.log('Obteniendo predicciones...');
            const response = await fetch(
                `${this.GITHUB_API}/repos/${this.REPO_OWNER}/${this.REPO_NAME}/issues?labels=prediccion&state=open&per_page=100`, {
                headers: {
                    'Authorization': `token ${this.accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Error al obtener predicciones');
            }

            const issues = await response.json();
            const predicciones = issues.map(issue => JSON.parse(issue.body));
            console.log('Predicciones obtenidas:', predicciones);
            return predicciones;
        } catch (error) {
            console.error('Error al obtener predicciones:', error);
            throw error;
        }
    }

    // Puedes agregar métodos adicionales si es necesario
}
