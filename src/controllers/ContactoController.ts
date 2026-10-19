import type { Contacto } from '../models/Contacto.js';
import type {
  Consulta,
  ContactoModel,
  DatosFormulario,
  FiltroCategoria,
  OrdenNombre,
  ResultadoOperacion,
} from '../models/ContactoModel.js';
import type { ContactoView } from '../views/ContactoView.js';

/**
 * Controlador: recibe los eventos de la vista, delega la lógica al modelo
 * y le indica a la vista qué mostrar. No toca el DOM ni localStorage.
 */
export class ContactoController {
  private readonly vista: ContactoView;
  private readonly modelo: ContactoModel;
  private consulta: Consulta = { termino: '', categoria: 'todas', orden: 'asc' };
  private idEnEdicion: string | null = null;

  public constructor(vista: ContactoView, modelo: ContactoModel) {
    this.vista = vista;
    this.modelo = modelo;
  }

  public iniciar(): void {
    this.modelo.cargar();

    this.vista.alGuardar((datos: DatosFormulario): void => this.handleSubmit(datos));
    this.vista.alBuscar((termino: string): void => this.handleSearch(termino));
    this.vista.alFiltrar((categoria: FiltroCategoria): void => this.handleFilter(categoria));
    this.vista.alOrdenar((orden: OrdenNombre): void => this.handleSort(orden));
    this.vista.alEditar((id: string): void => this.handleEdit(id));
    this.vista.alEliminar((id: string): void => this.handleDelete(id));
    this.vista.alCancelarEdicion((): void => this.handleCancelEdit());
    this.vista.alExportar((): void => this.handleExport());

    this.refrescarVista();
  }

  // ---------- Manejadores de eventos ----------

  private handleSubmit(datos: DatosFormulario): void {
    if (this.idEnEdicion !== null) {
      this.handleUpdate(this.idEnEdicion, datos);
      return;
    }
    this.handleCreate(datos);
  }

  private handleCreate(datos: DatosFormulario): void {
    const resultado: ResultadoOperacion = this.modelo.addContacto(datos);
    if (!resultado.ok) {
      this.vista.mostrarErrores(resultado.errores);
      this.vista.notificar('Revisa los campos marcados.', 'error');
      return;
    }
    this.vista.limpiarFormulario();
    this.vista.notificar(`${resultado.contacto.nombre} se agregó a la agenda.`, 'exito');
    this.refrescarVista();
  }

  /** RF-02 */
  private handleUpdate(id: string, datos: DatosFormulario): void {
    const resultado: ResultadoOperacion = this.modelo.updateContacto(id, datos);
    if (!resultado.ok) {
      this.vista.mostrarErrores(resultado.errores);
      this.vista.notificar('No se pudo actualizar: revisa los campos marcados.', 'error');
      return;
    }
    this.handleCancelEdit();
    this.vista.notificar(`${resultado.contacto.nombre} se actualizó correctamente.`, 'exito');
    this.refrescarVista();
  }

  /** RF-03: la vista ya pidió confirmación en el modal antes de llamar aquí. */
  private handleDelete(id: string): void {
    const eliminado: Contacto | undefined = this.modelo.deleteContacto(id);
    if (eliminado === undefined) {
      this.vista.notificar('Ese contacto ya no existe.', 'error');
      return;
    }
    if (this.idEnEdicion === id) {
      this.handleCancelEdit();
    }
    this.vista.notificar(`${eliminado.nombre} se eliminó.`, 'info');
    this.refrescarVista();
  }

  private handleEdit(id: string): void {
    const contacto: Contacto | undefined = this.modelo.obtenerPorId(id);
    if (contacto === undefined) {
      return;
    }
    this.idEnEdicion = id;
    this.vista.activarModoEdicion(contacto);
  }

  private handleCancelEdit(): void {
    this.idEnEdicion = null;
    this.vista.desactivarModoEdicion();
  }

  private handleSearch(termino: string): void {
    this.consulta = { ...this.consulta, termino };
    this.refrescarVista();
  }

  /** RF-04 */
  private handleFilter(categoria: FiltroCategoria): void {
    this.consulta = { ...this.consulta, categoria };
    this.refrescarVista();
  }

  /** RF-05 */
  private handleSort(orden: OrdenNombre): void {
    this.consulta = { ...this.consulta, orden };
    this.refrescarVista();
  }

  /** Reto adicional: exporta a CSV lo que se está viendo (búsqueda + filtro + orden). */
  private handleExport(): void {
    const visibles: Contacto[] = this.modelo.consultar(this.consulta);
    if (visibles.length === 0) {
      this.vista.notificar('No hay contactos para exportar.', 'error');
      return;
    }
    const fecha: string = new Date().toISOString().slice(0, 10);
    this.vista.descargarArchivo(`contactos-${fecha}.csv`, this.modelo.toCSV(visibles), 'text/csv');
    const palabra: string = visibles.length === 1 ? 'contacto' : 'contactos';
    this.vista.notificar(`Se exportaron ${visibles.length} ${palabra} a CSV.`, 'exito');
  }

  private refrescarVista(): void {
    this.vista.renderizar(
      this.modelo.consultar(this.consulta),
      this.modelo.contarTodos(),
      this.modelo.getContadorPorCategoria(),
    );
  }
}
