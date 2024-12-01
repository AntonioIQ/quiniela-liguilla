class API {
    constructor() {
        this.GITHUB_API = 'https://api.github.com';
        this.REPO_OWNER = 'AntonioIQ';
        this.REPO_NAME = 'quiniela-liguilla';
    }

    async guardarPrediccion(prediccion) {
        try {
            const response = await fetch(
                `https://api.github.com/repos/${this.REPO_OWNER}/${this.REPO_NAME}/actions/workflows/guardar-prediccion.yml/dispatches`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${GITHUB_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        ref: 'main',
                        inputs: { data: JSON.stringify(prediccion) },
                    }),
                }
            );

            if (!response.ok) {
                throw new Error('Error al guardar predicción');
            }

            console.log('Predicción enviada correctamente.');
        } catch (error) {
            console.error('Error al guardar predicción:', error);
        }
    }
}

const api = new API();
export default api;
