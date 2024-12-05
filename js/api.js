class API {
    constructor() {
        this.GITHUB_API = 'https://api.github.com';
        this.WIKI_API = 'https://es.wikipedia.org/w/api.php';
        // Inicializar con valores del localStorage si existen
        this.REPO_OWNER = localStorage.getItem('repo_owner') || '';
        this.REPO_NAME = localStorage.getItem('repo_name') || '';
        this.accessToken = localStorage.getItem('github_token');
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
                formatversion: '2'
            });

            const response = await fetch(`${this.WIKI_API}?${params}`);
            const data = await response.json();

            if (!data.parse || !data.parse.text) {
                throw new Error('Formato de respuesta inválido');
            }

            return this.procesarTablaLiguilla(data.parse.text['*']);
        } catch (error) {
            console.error('Error al obtener datos de Wikipedia:', error);
            throw error;
        }
    }

    procesarTablaLiguilla(htmlContent) {
        console.log('Procesando tabla de la Liguilla...');
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const partidos = [];

        // Función auxiliar para extraer texto limpio
        const limpiarTexto = (texto) => {
            return texto?.trim().toLowerCase() || '';
        };

        // Función para procesar una tabla de partido
        const procesarTabla = (tabla, fase) => {
            if (!tabla) return null;

            const filas = tabla.querySelectorAll('tr');
            let partido = null;

            filas.forEach(fila => {
                const celdas = Array.from(fila.querySelectorAll('td'));
                
                if (celdas.length >= 4) {
                    const fechaTexto = limpiarTexto(celdas[0]?.textContent);
                    if (fechaTexto && !fechaTexto.includes('utc')) {
                        const local = limpiarTexto(celdas[1]?.textContent);
                        const marcador = limpiarTexto(celdas[2]?.textContent).split('(')[0].trim();
                        const visitante = limpiarTexto(celdas[3]?.textContent);

                        if (local && visitante) {
                            partido = {
                                fase,
                                fecha: fechaTexto,
                                local,
                                marcador: marcador || 'vs',
                                visitante,
                                id: `${fase}-${local}-${visitante}`.replace(/\s+/g, '-')
                            };
                        }
                    }
                }
            });

            return partido;
        };

        // Procesar cuartos de final
        const cuartosSection = doc.querySelector('#Cuartos_de_final');
        if (cuartosSection) {
            let element = cuartosSection;
            while (element = element.nextElementSibling) {
                if (element.tagName === 'TABLE') {
                    const partido = procesarTabla(element, 'cuartos');
                    if (partido) {
                        partidos.push(partido);
                    }
                }
                // Detenerse cuando llegue a la siguiente sección principal
                if (element.tagName === 'H2') break;
            }
        }

        // Procesar semifinales
        const semisSection = doc.querySelector('#Semifinales');
        if (semisSection) {
            let element = semisSection;
            while (element = element.nextElementSibling) {
                if (element.tagName === 'TABLE') {
                    const partido = procesarTabla(element, 'semifinal');
                    if (partido) {
                        partidos.push(partido);
                    }
                }
                if (element.tagName === 'H2') break;
            }
        }

        console.log('Total de partidos encontrados:', partidos.length);
        console.log('Partidos:', partidos);
        return partidos;
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
                `${this.GITHUB_API}/repos/${this.REPO_OWNER}/${this.REPO_NAME}/issues?labels=prediccion&state=open`, {
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
}

export default API;