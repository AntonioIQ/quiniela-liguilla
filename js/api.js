class API {
    constructor() {
        this.GITHUB_API = "https://api.github.com";
        this.REPO_OWNER = "AntonioIQ";
        this.REPO_NAME = "quiniela-liguilla";
        this.accessToken = null;
    }

    setToken(token) {
        this.accessToken = token;
    }

    async obtenerPredicciones() {
        if (!this.accessToken) {
            throw new Error('No hay token de acceso');
        }

        const response = await fetch(
            `${this.GITHUB_API}/repos/${this.REPO_OWNER}/${this.REPO_NAME}/issues?labels=prediccion`, {
                headers: {
                    Authorization: `token ${this.accessToken}`
                }
            }
        );

        if (!response.ok) {
            throw new Error('Error al obtener predicciones');
        }

        return await response.json();
    }

    async guardarPrediccion(prediccion) {
        if (!this.accessToken) {
            throw new Error('No hay token de acceso');
        }

        const response = await fetch(
            `${this.GITHUB_API}/repos/${this.REPO_OWNER}/${this.REPO_NAME}/issues`, {
                method: 'POST',
                headers: {
                    Authorization: `token ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: `Predicción de ${prediccion.participante}`,
                    body: JSON.stringify(prediccion),
                    labels: ['prediccion']
                })
            }
        );

        if (!response.ok) {
            throw new Error('Error al guardar la predicción');
        }

        return await response.json();
    }
}

export default new API();
