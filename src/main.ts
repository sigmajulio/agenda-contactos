import { ContactoView } from './views/ContactoView.js';
import { ContactoController } from './controllers/ContactoController.js';
import { StorageService } from './services/StorageService.js';

function iniciarAplicacion(): void {
  const vista: ContactoView = new ContactoView(document);
  const servicio: StorageService = new StorageService();
  const controlador: ContactoController = new ContactoController(vista, servicio);
  controlador.iniciar();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarAplicacion);
} else {
  iniciarAplicacion();
}
