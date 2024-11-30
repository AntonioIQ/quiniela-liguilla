// Configuración
const GITHUB_API = 'https://api.github.com';
const WIKI_API = 'https://es.wikipedia.org/w/api.php';
const REPO_OWNER = ''; // Tu usuario de GitHub
const REPO_NAME = ''; // Nombre de tu repositorio

class API {
    constructor() {
        this.accessToken = localStorage.getItem('github_token');
    }

    // Autenticación con GitHub
    async authenticateWithGithub() {
        // Aquí implementaremos OAuth con GitHub
        // Por ahora, usaremos un token personal
        const token = prompt('Por favor ingresa tu GitHub Personal Access Token:');
        if (token) {
            this.accessToken = token;
            localStorage.setItem('github_token', token);
            return true;
        }
        return false;
    }

    // Obtener resultados de Wikipedia
    async obtenerResultadosWiki() {
        try {
            const params = new URLSearchParams({
                action: 'parse',
                page: 'Torneo_Apertura_2024_(México)',
                format: 'json',
                prop: 'text',
                section: '13',
                origin: '*'
            });

            const response = await fetch(`${WIKI_API}?${params}`);
            const data = await response.json();
            
            if (!data.parse || !data.parse.text) {
                throw new Error('No se encontraron datos');
            }

            // Procesar el HTML recibido
            const parser = new DOMParser();
            const doc = parser.parseFromString(data.parse.text['*'], 'text/html');
            return this.procesarTablaLiguilla(doc);
        } catch (error) {
            console.error('Error al obtener datos de Wikipedia:', error);
            throw error;
        }
    }

    // Procesar la tabla de la liguilla
    procesarTablaLiguilla(doc) {
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
                        partidos.push({
                            fecha: fecha,
                            local: cells[1]?.textContent?.trim().toLowerCase() || '',
                            marcador: cells[2]?.textContent?.trim().split('(')[0].trim() || '',
                            visitante: cells[3]?.textContent?.trim().toLowerCase() || ''
                        });
                    }
                }
            });
        });

        return partidos;
    }

    // Guardar predicción en GitHub Issues
    async guardarPrediccion(prediccion) {
        if (!this.accessToken) {
            throw new Error('No hay token de acceso');
        }

        try {
            const response = await fetch(`${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/issues`, {
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

    // Obtener predicciones del usuario
    async obtenerPredicciones() {
        if (!this.accessToken) {
            throw new Error('No hay token de acceso');
        }

        try {
            const response = await fetch(
                `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/issues?labels=prediccion`, {
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
            throw error;
        }
    }

    // Eliminar predicción
    async eliminarPrediccion(issueNumber) {
        if (!this.accessToken) {
            throw new Error('No hay token de acceso');
        }

        try {
            const response = await fetch(
                `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}`, {
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
                throw new Error('Error al eliminar la predicción');
            }

            return await response.json();
        } catch (error) {
            console.error('Error al eliminar predicción:', error);
            throw error;
        }
    }
}

// Exportar una instancia única
window.api = new API();