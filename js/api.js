import secrets from './config.secrets.js'; // Importamos el archivo con el token

class API {
    constructor() {
        this.GITHUB_API = 'https://api.github.com';
        this.WIKI_API = 'https://es.wikipedia.org/w/api.php';
        this.REPO_OWNER = 'AntonioIQ';
        this.REPO_NAME = 'quiniela-liguilla';
        this.accessToken = null;

        // En producción, cargamos el token desde los secretos
        if (location.hostname === 'antonioiq.github.io') {
            this.accessToken = secrets.TOKEN_INYECTADO;
        }
    }

    async authenticateWithGithub() {
        try {
            if (this.accessToken) {
                return true;
            }

            // Si no hay token, pedimos al usuario
            const token = prompt('Por favor, ingresa tu GitHub Personal Access Token:');
            if (token) {
                this.accessToken = token;
                localStorage.setItem('github_token', token);
                return true;
            }

            throw new Error('No se proporcionó un token de acceso');
        } catch (error) {
            console.error('Error en autenticación:', error);
            return false;
        }
    }

    // Resto del código se mantiene igual...
    async guardarPrediccion(prediccion) {
        if (!this.accessToken) {
            throw new Error('No hay token de acceso');
        }

        try {
            const response = await fetch(`${this.GITHUB_API}/repos/${this.REPO_OWNER}/${this.REPO_NAME}/issues`, {
                method: 'POST',
                headers: {
                    Authorization: `token ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: `Predicción: ${prediccion.local} vs ${prediccion.visitante}`,
                    body: JSON.stringify(prediccion),
                    labels: ['prediccion'],
                }),
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
                `${this.GITHUB_API}/repos/${this.REPO_OWNER}/${this.REPO_NAME}/issues?labels=prediccion`,
                {
                    headers: {
                        Authorization: `token ${this.accessToken}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error('Error al obtener predicciones');
            }

            const issues = await response.json();
            return issues.map((issue) => JSON.parse(issue.body));
        } catch (error) {
            console.error('Error al obtener predicciones:', error);
            throw error;
        }
    }
}

const api = new API();
export default api;
