class API {
    constructor() {
        this.GITHUB_API = 'https://api.github.com';
        this.REPO_OWNER = 'AntonioIQ';
        this.REPO_NAME = 'quiniela-liguilla';
        this.accessToken = null; // Se configurará manualmente
    }

    setToken(token) {
        this.accessToken = token;
        console.log('Token configurado manualmente.');
    }

    async guardarPrediccion(prediccion) {
        if (!this.accessToken) {
            throw new Error('Token no configurado. Por favor, introduce el token manualmente.');
        }

        try {
            const response = await fetch(
                `${this.GITHUB_API}/repos/${this.REPO_OWNER}/${this.REPO_NAME}/issues`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        title: `Predicción: ${prediccion.local} vs ${prediccion.visitante}`,
                        body: JSON.stringify(prediccion),
                        labels: ['predicción'],
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Error al guardar predicción: ${errorData.message}`);
            }

            const data = await response.json();
            console.log('Predicción guardada:', data);
            return data;
        } catch (error) {
            console.error('Error al guardar predicción:', error);
            throw error;
        }
    }

    async obtenerPredicciones() {
        if (!this.accessToken) {
            throw new Error('Token no configurado. Por favor, introduce el token manualmente.');
        }

        try {
            const response = await fetch(
                `${this.GITHUB_API}/repos/${this.REPO_OWNER}/${this.REPO_NAME}/issues?labels=predicción`,
                {
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
                    },
                }
            );

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
}

const api = new API();
export default api;
