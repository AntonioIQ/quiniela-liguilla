import api from './api.js';

class UI {
    constructor() {
        // Elementos del formulario
        this.tokenPrompt();
    }

    tokenPrompt() {
        const token = prompt(
            'Por favor introduce tu GitHub Personal Access Token (con permisos de repo):'
        );
        if (token) {
            api.setToken(token); // Configuramos el token manualmente
        } else {
            alert('No se ha configurado un token. La aplicación no funcionará correctamente.');
        }
    }

    // El resto del código permanece igual...
}

const ui = new UI();
export default ui;
