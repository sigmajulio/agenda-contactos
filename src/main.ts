import { ContactoView } from './views/ContactoView.js';
import { ContactoController } from './controllers/ContactoController.js';
import { ContactoModel } from './models/ContactoModel.js';
import { StorageService } from './services/StorageService.js';

/** Ensambla las capas (inyección de dependencias) y arranca la app. */
function iniciarAplicacion(): void {
  const servicio: StorageService = new StorageService();
  const modelo: ContactoModel = new ContactoModel(servicio);
  const vista: ContactoView = new ContactoView(document);
  const controlador: ContactoController = new ContactoController(vista, modelo);
  controlador.iniciar();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarAplicacion);
} else {
  iniciarAplicacion();
}
