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

    formatearFecha(fechaTexto) {
        const meses = {
            'enero': 'ENE', 'febrero': 'FEB', 'marzo': 'MAR',
            'abril': 'ABR', 'mayo': 'MAY', 'junio': 'JUN',
            'julio': 'JUL', 'agosto': 'AGO', 'septiembre': 'SEP',
            'octubre': 'OCT', 'noviembre': 'NOV', 'diciembre': 'DIC'
        };

        try {
            if (fechaTexto.includes('de')) {
                const partes = fechaTexto.split(' de ');
                const dia = parseInt(partes[0]);
                const mes = partes[1].toLowerCase();
                return `2024 ${meses[mes]} ${dia.toString().padStart(2, '0')}`;
            }
            return fechaTexto;
        } catch {
            return fechaTexto;
        }
    }

    fechaParaOrdenar(fechaStr) {
        const meses = { 'NOV': 11, 'DIC': 12 };
        try {
            const [año, mes, dia] = fechaStr.split(' ');
            return new Date(parseInt(año), meses[mes], parseInt(dia));
        } catch {
            return new Date(2025, 0, 1); // fecha futura para valores inválidos
        }
    }

    async obtenerResultadosWiki() {
        try {
            console.log('Iniciando obtención de datos de Wikipedia...');
            const params = new URLSearchParams({
                action: 'parse',
                page: 'Torneo_Apertura_2024_(México)',
                format: 'json',
                prop: 'text',
                section: '13', // Sección de Liguilla
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

        const procesarTabla = (tabla, etapa) => {
            const filas = tabla.querySelectorAll('tr');
            filas.forEach((fila, index) => {
                if (index === 0) return; // Saltar encabezados
                
                const celdas = fila.querySelectorAll('td');
                if (celdas.length >= 5) {
                    const fecha = celdas[0]?.textContent.trim();
                    const local = celdas[1]?.textContent.trim();
                    const marcador = celdas[2]?.textContent.trim();
                    const visitante = celdas[3]?.textContent.trim();
                    const lugar = celdas[4]?.textContent.trim();

                    if (fecha && !fecha.startsWith('--') && !fecha.includes('UTC')) {
                        const [estadio, ciudad] = lugar.split(',').map(s => s.trim());
                        partidos.push({
                            fecha: this.formatearFecha(fecha),
                            local,
                            marcador,
                            visitante,
                            etapa,
                            estadio,
                            ciudad,
                            id: `${etapa}-${local}-${visitante}`.replace(/\s+/g, '-').toLowerCase()
                        });
                    }
                }
            });
        };

        // Procesar tablas de cuartos de final y semifinales
        const fechasRelevantes = /27 de noviembre|28 de noviembre|30 de noviembre|1 de diciembre|diciembre de 2024/;
        const tablas = doc.querySelectorAll('table.wikitable');
        
        tablas.forEach(tabla => {
            const encabezadoPrevio = tabla.previousElementSibling;
            if (encabezadoPrevio) {
                const textoEncabezado = encabezadoPrevio.textContent.toLowerCase();
                if (textoEncabezado.includes('cuartos de final')) {
                    procesarTabla(tabla, 'Cuartos de final');
                } else if (textoEncabezado.includes('semifinales')) {
                    procesarTabla(tabla, 'Semifinales');
                }
            }
        });

        // Ordenar partidos por fecha
        partidos.sort((a, b) => {
            const fechaA = this.fechaParaOrdenar(a.fecha);
            const fechaB = this.fechaParaOrdenar(b.fecha);
            return fechaA - fechaB;
        });

        // Asignar IDs secuenciales
        partidos.forEach((partido, index) => {
            partido.ID = index + 1;
        });

        console.log('Partidos procesados:', partidos);
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