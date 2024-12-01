class API {
    constructor() {
        this.GITHUB_API = 'https://api.github.com';
        this.WIKI_API = 'https://es.wikipedia.org/w/api.php';
        // Inicializar con valores del localStorage si existen
        this.REPO_OWNER = localStorage.getItem('repo_owner') || '';
        this.REPO_NAME = localStorage.getItem('repo_name') || '';
        this.accessToken = localStorage.getItem('github_token');
    }

    async obtenerResultadosWiki() {
        try {
            // Primero obtenemos todas las secciones para encontrar la de Liguilla
            const params = new URLSearchParams({
                action: 'parse',
                page: 'Torneo_Apertura_2024_(México)',
                format: 'json',
                prop: 'sections|text',
                origin: '*',
                formatversion: '2'
            });

            console.log('Obteniendo secciones de Wikipedia...');
            const url = `${this.WIKI_API}?${params}`;
            const response = await fetch(url, {
                headers: { 'Accept': 'application/json' },
                mode: 'cors'
            });
            const data = await response.json();

            if (data.parse && data.parse.sections) {
                const liguillaSectionId = data.parse.sections.find(
                    section => section.line.toLowerCase().includes('liguilla')
                )?.index;

                if (liguillaSectionId) {
                    const paramsWithSection = new URLSearchParams({
                        action: 'parse',
                        page: 'Torneo_Apertura_2024_(México)',
                        format: 'json',
                        prop: 'text',
                        section: liguillaSectionId.toString(),
                        origin: '*'
                    });

                    const sectionResponse = await fetch(`${this.WIKI_API}?${paramsWithSection}`, {
                        headers: { 'Accept': 'application/json' },
                        mode: 'cors'
                    });
                    const sectionData = await sectionResponse.json();

                    if (sectionData.parse && sectionData.parse.text) {
                        return this.procesarTablaLiguilla(sectionData.parse.text['*']);
                    }
                }
            }

            throw new Error('No se encontró la sección de la Liguilla');
        } catch (error) {
            console.error('Error al obtener datos de Wikipedia:', error);
            throw error;
        }
    }

    procesarTablaLiguilla(htmlContent) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const tables = doc.querySelectorAll('table');
        const partidos = [];
        const fechasValidas = ['27 de noviembre', '28 de noviembre', '30 de noviembre', '1 de diciembre'];

        tables.forEach(table => {
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
                        partidos.push(partido);
                    }
                }
            });
        });

        return partidos;
    }

    setCredentials(owner, repo, token) {
        this.REPO_OWNER = owner;
        this.REPO_NAME = repo;
        this.accessToken = token;
        
        localStorage.setItem('repo_owner', owner);
        localStorage.setItem('repo_name', repo);
        localStorage.setItem('github_token', token);
    }

    async guardarPrediccion(prediccion) {
        if (!this.accessToken) {
            throw new Error('No hay token de acceso');
        }

        try {
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

            return await response.json();
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
            return issues.map(issue => JSON.parse(issue.body));
        } catch (error) {
            console.error('Error al obtener predicciones:', error);
            return [];
        }
    }
}

const api = new API();
export default api;