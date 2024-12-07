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
                section: '13',  // Sección de Liguilla
                origin: '*'
            });

            const response = await fetch(`${this.WIKI_API}?${params}`);
            const data = await response.json();

            if (!data.parse || !data.parse.text) {
                throw new Error('Formato de respuesta inválido');
            }

            console.log('Datos obtenidos de Wikipedia:', data.parse.text['*'].substring(0, 500));
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

        // Función auxiliar para limpiar texto
        const limpiarTexto = texto => texto?.trim() || '';

        // Buscar secciones
        let etapaActual = '';
        const secciones = {
            'Cuartos de final': doc.querySelector('h3, h4, span[id*="Cuartos"]'),
            'Semifinales': doc.querySelector('h3, h4, span[id*="Semifinal"]')
        };

        for (const [etapa, seccion] of Object.entries(secciones)) {
            if (seccion) {
                console.log(`Procesando sección: ${etapa}`);
                let elemento = seccion;
                while (elemento) {
                    if (elemento.tagName === 'TABLE') {
                        const filas = elemento.querySelectorAll('tr');
                        filas.forEach((fila, index) => {
                            if (index === 0) return; // Saltar encabezados
                            
                            const celdas = fila.querySelectorAll('td');
                            if (celdas.length >= 5) {
                                const fecha = limpiarTexto(celdas[0].textContent);
                                if (fecha && !fecha.startsWith('--') && !fecha.includes('UTC')) {
                                    let [estadio, ciudad = ''] = (celdas[4]?.textContent || '').split(',').map(s => s.trim());
                                    
                                    const partido = {
                                        ID: partidos.length + 1,
                                        fecha: this.formatearFecha(fecha),
                                        local: limpiarTexto(celdas[1].textContent),
                                        marcador: limpiarTexto(celdas[2].textContent),
                                        visitante: limpiarTexto(celdas[3].textContent),
                                        estadio,
                                        ciudad,
                                        etapa
                                    };

                                    console.log('Partido encontrado:', partido);
                                    partidos.push(partido);
                                }
                            }
                        });
                    }
                    elemento = elemento.nextElementSibling;
                    if (elemento && (elemento.tagName === 'H2' || elemento.tagName === 'H3')) break;
                }
            }
        }

        console.log(`Total de partidos encontrados: ${partidos.length}`);
        console.log('Partidos:', partidos);
        return partidos;
    }

    formatearFecha(fecha) {
        const meses = {
            'enero': 'ENE', 'febrero': 'FEB', 'marzo': 'MAR',
            'abril': 'ABR', 'mayo': 'MAY', 'junio': 'JUN',
            'julio': 'JUL', 'agosto': 'AGO', 'septiembre': 'SEP',
            'octubre': 'OCT', 'noviembre': 'NOV', 'diciembre': 'DIC'
        };

        try {
            if (fecha.includes('de')) {
                const partes = fecha.split(' de ');
                const dia = parseInt(partes[0]);
                const mes = partes[1].toLowerCase();
                return `2024 ${meses[mes]} ${dia.toString().padStart(2, '0')}`;
            }
            return fecha;
        } catch (error) {
            console.error('Error al formatear fecha:', error);
            return fecha;
        }
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