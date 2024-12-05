class API {
    constructor() {
        this.GITHUB_API = 'https://api.github.com';
        this.WIKI_API = 'https://es.wikipedia.org/w/api.php';
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
        
        // Fechas válidas incluyendo semifinales
        const fechasValidas = [
            '27 de noviembre',
            '28 de noviembre',
            '30 de noviembre',
            '1 de diciembre',
            '4 de diciembre',
            '5 de diciembre',
            '7 de diciembre',
            '8 de diciembre'
        ];

        // Procesar cuartos de final
        const procesarSeccion = (sectionId) => {
            const section = doc.querySelector(sectionId);
            if (!section) return;

            let currentElement = section;
            while (currentElement = currentElement.nextElementSibling) {
                if (currentElement.tagName === 'TABLE') {
                    const rows = currentElement.querySelectorAll('tr');
                    rows.forEach(row => {
                        const cells = row.querySelectorAll('th, td');
                        if (cells.length > 1) {
                            const fecha = cells[0]?.textContent?.trim() || '';
                            
                            if (fechasValidas.some(f => fecha.toLowerCase().includes(f))) {
                                let local = '', visitante = '', marcador = '', estadio = '', ciudad = '';
                                
                                // Diferentes estructuras para cuartos y semifinales
                                if (sectionId === '#Cuartos_de_final') {
                                    local = cells[1]?.textContent?.trim() || '';
                                    marcador = cells[2]?.textContent?.trim().split('(')[0].trim() || '-';
                                    visitante = cells[3]?.textContent?.trim() || '';
                                    const lugar = cells[4]?.textContent?.trim() || '';
                                    [estadio, ciudad] = lugar.split(',').map(s => s.trim());
                                } else if (sectionId === '#Semifinales') {
                                    if (!fecha.includes('UTC')) {
                                        local = cells[1]?.textContent?.trim() || '';
                                        marcador = 'vs.';
                                        visitante = cells[3]?.textContent?.trim() || '';
                                        const lugar = cells[4]?.textContent?.trim() || '';
                                        [estadio, ciudad] = lugar.split(',').map(s => s.trim());
                                    }
                                }

                                if (fecha && local && visitante) {
                                    const partido = {
                                        fecha: this.formatearFecha(fecha),
                                        local: local.toLowerCase(),
                                        marcador: marcador,
                                        visitante: visitante.toLowerCase(),
                                        estadio: estadio || '',
                                        ciudad: ciudad || ''
                                    };
                                    console.log('Partido encontrado:', partido);
                                    partidos.push(partido);
                                }
                            }
                        }
                    });
                }
            }
        };

        // Procesar cada sección
        procesarSeccion('#Cuartos_de_final');
        procesarSeccion('#Semifinales');

        // Ordenar por fecha
        partidos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

        console.log('Total de partidos encontrados:', partidos.length);
        console.log('Partidos:', partidos);
        return partidos;
    }

    formatearFecha(fechaTexto) {
        try {
            const meses = {
                'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
                'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
                'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
            };
            
            const partes = fechaTexto.split(' de ');
            if (partes.length === 3) {
                const dia = partes[0].padStart(2, '0');
                const mes = meses[partes[1].toLowerCase()];
                const año = partes[2];
                return `${dia}/${mes}/${año}`;
            }
            return fechaTexto;
        } catch (error) {
            console.error('Error al formatear fecha:', error);
            return fechaTexto;
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