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
            // Primero obtener las secciones
            const paramsSections = new URLSearchParams({
                action: 'parse',
                page: 'Torneo_Apertura_2024_(México)',
                format: 'json',
                prop: 'sections',
                origin: '*',
                formatversion: '2'
            });

            const sectionsResponse = await fetch(`${this.WIKI_API}?${paramsSections}`);
            const sectionsData = await sectionsResponse.json();
            console.log('Secciones encontradas:', sectionsData);
            
            // Encontrar la sección de Liguilla
            const liguillaSection = sectionsData.parse.sections.find(
                section => section.line.toLowerCase().includes('liguilla')
            );

            if (!liguillaSection) {
                throw new Error('No se encontró la sección de Liguilla');
            }

            console.log('Sección de Liguilla encontrada:', liguillaSection);

            // Ahora obtener el contenido de esa sección
            const params = new URLSearchParams({
                action: 'parse',
                page: 'Torneo_Apertura_2024_(México)',
                format: 'json',
                prop: 'text',
                section: liguillaSection.index.toString(),
                origin: '*',
                formatversion: '2'
            });

            const response = await fetch(`${this.WIKI_API}?${params}`);
            const data = await response.json();
            console.log('Datos de la sección:', data);

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

        // Función auxiliar para extraer partidos de una sección
        const procesarSeccion = (seccionId) => {
            const seccion = doc.querySelector(seccionId);
            if (!seccion) return;

            const tablas = seccion.parentElement.querySelectorAll('table.vevent');
            tablas.forEach(tabla => {
                const rows = tabla.querySelectorAll('tr');
                rows.forEach(row => {
                    // Verificar si la fila contiene datos de partido (debe tener celdas y no ser encabezado)
                    if (row.querySelectorAll('td').length > 0 && !row.textContent.includes('UTC')) {
                        const fecha = row.querySelector('td:first-child')?.textContent?.trim();
                        const local = row.querySelector('td a:first-of-type')?.textContent?.trim();
                        const visitante = row.querySelector('td a:last-of-type')?.textContent?.trim();
                        let marcador = row.querySelector('td:nth-child(3)')?.textContent?.trim() || 'vs.';

                        // Limpiar marcador
                        marcador = marcador.split('(')[0].trim();
                        if (marcador.includes(':')) {
                            const [gLocal, gVisitante] = marcador.split(':').map(g => g.trim());
                            marcador = `${gLocal}-${gVisitante}`;
                        }

                        if (fecha && local && visitante) {
                            const partido = {
                                fecha: fecha.toLowerCase(),
                                local: local.toLowerCase(),
                                marcador: marcador,
                                visitante: visitante.toLowerCase()
                            };
                            console.log('Partido encontrado:', partido);
                            partidos.push(partido);
                        }
                    }
                });
            });
        };

        // Procesar cada sección
        ['#Cuartos_de_final', '#Semifinales', '#Final'].forEach(seccion => {
            procesarSeccion(seccion);
        });

        console.log('Total de partidos encontrados:', partidos.length);
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