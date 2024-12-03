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
    }

    async obtenerResultadosWiki() {
        try {
            console.log('Iniciando obtención de datos de Wikipedia...');
            const params = new URLSearchParams({
                action: 'parse',
                page: 'Torneo_Apertura_2024_(México)',
                format: 'json',
                prop: 'sections|text',
                origin: '*',
                formatversion: '2'
            });

            const url = `${this.WIKI_API}?${params}`;
            console.log('URL de Wikipedia:', url);
            
            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json'
                },
                mode: 'cors'
            });
            console.log('Respuesta de Wikipedia:', response);
            
            const data = await response.json();
            console.log('Datos de Wikipedia:', data);

            if (!data.parse || !data.parse.sections) {
                throw new Error('Formato de respuesta inválido');
            }

            const sections = data.parse.sections;
            console.log('Secciones encontradas:', sections);

            const liguillaSectionId = sections.find(
                section => section.line.toLowerCase().includes('liguilla')
            )?.index;

            if (!liguillaSectionId) {
                throw new Error('Sección de Liguilla no encontrada');
            }

            console.log('ID de sección de Liguilla:', liguillaSectionId);

            const contentParams = new URLSearchParams({
                action: 'parse',
                page: 'Torneo_Apertura_2024_(México)',
                format: 'json',
                prop: 'text',
                section: liguillaSectionId.toString(),
                origin: '*'
            });

            const contentResponse = await fetch(`${this.WIKI_API}?${contentParams}`, {
                headers: {
                    'Accept': 'application/json'
                },
                mode: 'cors'
            });
            
            const contentData = await contentResponse.json();
            console.log('Datos de contenido:', contentData);

            if (!contentData.parse || !contentData.parse.text) {
                throw new Error('No se encontró el contenido de la sección');
            }

            const resultados = this.procesarTablaLiguilla(contentData.parse.text['*']);
            console.log('Resultados procesados:', resultados);
            return resultados;

        } catch (error) {
            console.error('Error detallado en Wikipedia:', error);
            throw error;
        }
    }

    procesarTablaLiguilla(htmlContent) {
        console.log('Procesando tabla de la Liguilla...');
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const tables = doc.querySelectorAll('table');
        const partidos = [];
        const fechasValidas = ['27 de noviembre', '28 de noviembre', '30 de noviembre', '1 de diciembre'];

        tables.forEach((table, index) => {
            console.log(`Procesando tabla ${index + 1}...`);
            const rows = table.querySelectorAll('tr');
            rows.forEach(row => {
                const cells = row.querySelectorAll('th, td');
                if (cells.length > 1) {
                    const fecha = cells[0]?.textContent?.trim().toLowerCase() || '';
                    if (fechasValidas.some(f => fecha.includes(f))) {
                        const partido = {
                            fecha: fecha,
                            local: cells[1]?.textContent?.trim().toLowerCase() || '',
                            marcador: cells[2]?.textContent?.trim().split('(')[0].trim() || '',
                            visitante: cells[3]?.textContent?.trim().toLowerCase() || '',
                            estadio: cells[4]?.textContent?.trim().split(',')[0] || ''
                        };
                        console.log('Partido encontrado:', partido);
                        partidos.push(partido);
                    }
                }
            });
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
                console.error('Error response:', response);
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
                console.error('Error response:', response);
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

    async eliminarPrediccion(issueNumber) {
        if (!this.accessToken) {
            throw new Error('No hay token de acceso');
        }

        try {
            console.log('Eliminando predicción:', issueNumber);
            const response = await fetch(
                `${this.GITHUB_API}/repos/${this.REPO_OWNER}/${this.REPO_NAME}/issues/${issueNumber}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    state: 'closed'
                })
            });

            if (!response.ok) {
                console.error('Error response:', response);
                throw new Error('Error al eliminar la predicción');
            }

            const result = await response.json();
            console.log('Predicción eliminada:', result);
            return result;
        } catch (error) {
            console.error('Error al eliminar predicción:', error);
            throw error;
        }
    }
}

const api = new API();
export default api;