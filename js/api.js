export default class API {
    constructor() {
        this.GITHUB_API = 'https://api.github.com';
        this.WIKI_API = 'https://es.wikipedia.org/w/api.php';
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
                section: '13',
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

            return this.procesarTablaLiguilla(data.parse.text['*']);
        } catch (error) {
            console.error('Error al obtener datos de Wikipedia:', error);
            throw error;
        }
    }

    procesarTablaLiguilla(htmlContent) {
        console.log('Contenido HTML recibido:', htmlContent);
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');

        // Buscar todas las subsecciones de la Liguilla
        const subsecciones = [...doc.querySelectorAll('h3, h4')].filter((header) => {
            const texto = header.textContent.trim().toLowerCase();
            return texto.includes('cuartos de final') || 
                   texto.includes('semifinales') || 
                   texto.includes('final') ||
                   texto.includes('ida') ||
                   texto.includes('vuelta');
        });

        const partidos = [];
        const fechasValidas = ['27 de noviembre', '28 de noviembre', '30 de noviembre', '1 de diciembre', '2 de diciembre', '3 de diciembre', '7 de diciembre', '10 de diciembre', '14 de diciembre', '17 de diciembre'];

        subsecciones.forEach((subseccion) => {
            console.log('Procesando subsección:', subseccion.textContent.trim());
            
            // Buscar la siguiente tabla después del encabezado
            let nodoActual = subseccion.nextElementSibling;
            let tablaEncontrada = false;

            while (nodoActual && !tablaEncontrada && nodoActual.tagName !== 'H3' && nodoActual.tagName !== 'H4') {
                if (nodoActual.tagName === 'TABLE') {
                    const rows = nodoActual.querySelectorAll('tr');
                    rows.forEach((row) => {
                        const cells = row.querySelectorAll('td');
                        if (cells.length >= 4) {
                            const fecha = cells[0]?.textContent?.trim().toLowerCase() || '';
                            
                            // Solo procesar si es una fecha válida
                            if (fechasValidas.some(f => fecha.includes(f))) {
                                const local = cells[1]?.textContent?.trim().toLowerCase() || '';
                                const marcadorText = cells[2]?.textContent?.trim() || '';
                                const visitante = cells[3]?.textContent?.trim().toLowerCase() || '';

                                // Procesar marcador
                                const marcadorMatch = marcadorText.match(/(\d+)\s*[-:]\s*(\d+)/);
                                const marcador = marcadorMatch ? `${marcadorMatch[1]}-${marcadorMatch[2]}` : null;

                                if (fecha && local && visitante) {
                                    partidos.push({
                                        fecha,
                                        local,
                                        visitante,
                                        marcador: marcador || '-',
                                        etapa: subseccion.textContent.trim()
                                    });
                                    console.log('Partido encontrado:', { fecha, local, visitante, marcador });
                                }
                            }
                        }
                    });
                    tablaEncontrada = true;
                }
                nodoActual = nodoActual.nextElementSibling;
            }
        });

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
}