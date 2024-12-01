class API {
    constructor() {
        this.GITHUB_API = 'https://api.github.com';
        this.WIKI_API = 'https://es.wikipedia.org/w/api.php';
        this.REPO_OWNER = 'AntonioIQ';
        this.REPO_NAME = 'quiniela-liguilla';
        this.accessToken = null;
    }

    setToken(token) {
        this.accessToken = token;
        console.log('Token configurado manualmente.');
    }

    async obtenerResultadosWiki() {
        try {
            const params = new URLSearchParams({
                action: 'parse',
                page: 'Torneo_Apertura_2024_(México)',
                format: 'json',
                prop: 'sections|text',
                origin: '*',
                formatversion: '2',
            });

            const response = await fetch(`${this.WIKI_API}?${params}`);
            const data = await response.json();

            if (data.parse && data.parse.sections) {
                const liguillaSectionId = data.parse.sections.find(section =>
                    section.line.toLowerCase().includes('liguilla')
                )?.index;

                if (liguillaSectionId) {
                    const paramsWithSection = new URLSearchParams({
                        action: 'parse',
                        page: 'Torneo_Apertura_2024_(México)',
                        format: 'json',
                        prop: 'text',
                        section: liguillaSectionId.toString(),
                        origin: '*',
                    });

                    const sectionResponse = await fetch(
                        `${this.WIKI_API}?${paramsWithSection}`
                    );
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

        tables.forEach(table => {
            const rows = table.querySelectorAll('tr');
            rows.forEach(row => {
                const cells = row.querySelectorAll('th, td');
                if (cells.length > 1) {
                    const partido = {
                        fecha: cells[0]?.textContent?.trim() || '',
                        local: cells[1]?.textContent?.trim() || '',
                        marcador: cells[2]?.textContent?.trim() || '',
                        visitante: cells[3]?.textContent?.trim() || '',
                        estadio: cells[4]?.textContent?.trim() || '',
                    };
                    partidos.push(partido);
                }
            });
        });

        console.log('Partidos encontrados:', partidos);
        return partidos;
    }
}

const api = new API();
export default api;
