class API {
    constructor() {
        this.GITHUB_API = 'https://api.github.com';
        this.WIKI_API = 'https://es.wikipedia.org/w/api.php';
        this.REPO_OWNER = 'AntonioIQ';
        this.REPO_NAME = 'quiniela-liguilla';
    }

    async authenticateWithGithub() {
        console.log('Autenticación gestionada mediante GitHub Actions.');
        return true;
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

            console.log('Intentando obtener datos de Wikipedia...');
            const response = await fetch(`${this.WIKI_API}?${params}`);
            const data = await response.json();

            if (data.parse && data.parse.sections) {
                const liguillaSectionId = data.parse.sections.find((section) =>
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

                    const sectionResponse = await fetch(`${this.WIKI_API}?${paramsWithSection}`);
                    const sectionData = await sectionResponse.json();

                    if (sectionData.parse && sectionData.parse.text) {
                        return this.procesarTablaLiguilla(sectionData.parse.text['*']);
                    }
                }
            }

            throw new Error('No se encontró la sección de la Liguilla');
        } catch (error) {
            console.error('Error detallado:', error);
            throw error;
        }
    }

    procesarTablaLiguilla(htmlContent) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const tables = doc.querySelectorAll('table');
        const partidos = [];
        const fechasValidas = ['27 de noviembre', '28 de noviembre', '30 de noviembre', '1 de diciembre'];

        tables.forEach((table) => {
            const rows = table.querySelectorAll('tr');
            rows.forEach((row) => {
                const cells = row.querySelectorAll('th, td');
                if (cells.length > 1) {
                    const fecha = cells[0]?.textContent?.trim().toLowerCase() || '';
                    if (fechasValidas.some((f) => fecha.includes(f))) {
                        const partido = {
                            fecha: fecha,
                            local: cells[1]?.textContent?.trim().toLowerCase() || '',
                            marcador: cells[2]?.textContent?.trim().split('(')[0].trim() || '',
                            visitante: cells[3]?.textContent?.trim().toLowerCase() || '',
                            estadio: cells[4]?.textContent?.trim().split(',')[0] || '',
                        };
                        partidos.push(partido);
                    }
                }
            });
        });

        console.log('Partidos encontrados:', partidos);
        return partidos;
    }

    async guardarPrediccion(prediccion) {
        try {
            const response = await fetch(
                `https://api.github.com/repos/${this.REPO_OWNER}/${this.REPO_NAME}/actions/workflows/guardar-prediccion.yml/dispatches`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ghp_fake_token_for_local_dev`, // Solo para desarrollo local
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        ref: 'main', // Rama principal
                        inputs: {
                            data: JSON.stringify(prediccion),
                        },
                    }),
                }
            );

            if (!response.ok) {
                throw new Error('Error al guardar la predicción mediante Actions');
            }

            console.log('Predicción enviada al flujo de trabajo correctamente.');
            return await response.json();
        } catch (error) {
            console.error('Error al guardar predicción:', error);
            throw error;
        }
    }
}

const api = new API();
export default api;
