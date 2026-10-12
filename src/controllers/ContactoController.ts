import { Contacto } from '../models/Contacto.js';
import type { DatosContacto, ErroresValidacion, IContacto } from '../models/Contacto.js';
import type { ContactoView } from '../views/ContactoView.js';
import type { StorageService } from '../services/StorageService.js';

export class ContactoController {
  private static readonly LONGITUD_MINIMA_NOMBRE: number = 2;
  private static readonly PATRON_TELEFONO_SV: RegExp = /^[267]\d{7}$/;
  private static readonly PATRON_EMAIL: RegExp = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

  private readonly vista: ContactoView;
  private readonly servicio: StorageService;
  private contactos: Contacto[] = [];
  private terminoBusqueda: string = '';
  private idEnEdicion: string | null = null;

  public constructor(vista: ContactoView, servicio: StorageService) {
    this.vista = vista;
    this.servicio = servicio;
  }

  public iniciar(): void {
    this.contactos = this.servicio
      .obtenerTodos()
      .map((plano: IContacto): Contacto => Contacto.desdeObjetoPlano(plano));

    this.vista.alGuardar((datos: DatosContacto): void => this.enviarFormulario(datos));
    this.vista.alBuscar((termino: string): void => this.buscar(termino));
    this.vista.alEditar((id: string): void => this.iniciarEdicion(id));
    this.vista.alEliminar((id: string): void => this.eliminar(id));
    this.vista.alCancelarEdicion((): void => this.cancelarEdicion());

    this.refrescarVista();
  }

  public crear(datos: DatosContacto): boolean {
    const errores: ErroresValidacion = this.validar(datos, null);
    if (Object.keys(errores).length > 0) {
      this.vista.mostrarErrores(errores);
      return false;
    }
    this.contactos.push(new Contacto(this.normalizar(datos)));
    this.persistir();
    this.vista.limpiarErrores();
    this.vista.limpiarFormulario();
    this.vista.mostrarExito('Contacto agregado correctamente.');
    this.refrescarVista();
    return true;
  }

  public actualizar(id: string, datos: DatosContacto): boolean {
    const contacto: Contacto | undefined = this.buscarPorId(id);
    if (contacto === undefined) {
      return false;
    }
    const errores: ErroresValidacion = this.validar(datos, id);
    if (Object.keys(errores).length > 0) {
      this.vista.mostrarErrores(errores);
      return false;
    }
    contacto.actualizar(this.normalizar(datos));
    this.persistir();
    this.cancelarEdicion();
    this.vista.mostrarExito('Contacto actualizado correctamente.');
    this.refrescarVista();
    return true;
  }

  public eliminar(id: string): void {
    const cantidadPrevia: number = this.contactos.length;
    this.contactos = this.contactos.filter((contacto: Contacto): boolean => contacto.id !== id);
    if (this.contactos.length === cantidadPrevia) {
      return;
    }
    if (this.idEnEdicion === id) {
      this.cancelarEdicion();
    }
    this.persistir();
    this.vista.mostrarExito('Contacto eliminado.');
    this.refrescarVista();
  }

  public buscar(termino: string): void {
    this.terminoBusqueda = termino;
    this.refrescarVista();
  }

  public iniciarEdicion(id: string): void {
    const contacto: Contacto | undefined = this.buscarPorId(id);
    if (contacto === undefined) {
      return;
    }
    this.idEnEdicion = id;
    this.vista.activarModoEdicion(contacto);
  }

  public cancelarEdicion(): void {
    this.idEnEdicion = null;
    this.vista.desactivarModoEdicion();
  }

  public validar(datos: DatosContacto, idExcluido: string | null): ErroresValidacion {
    const errores: ErroresValidacion = {};

    const nombre: string = datos.nombre.trim();
    if (nombre.length === 0) {
      errores.nombre = 'El nombre es obligatorio.';
    } else if (nombre.length < ContactoController.LONGITUD_MINIMA_NOMBRE) {
      errores.nombre = 'El nombre debe tener al menos 2 caracteres.';
    }

    const telefono: string | null = this.normalizarTelefono(datos.telefono);
    if (datos.telefono.trim().length === 0) {
      errores.telefono = 'El teléfono es obligatorio.';
    } else if (telefono === null) {
      errores.telefono = 'Formato inválido. Usa 8 dígitos que inicien con 2, 6 o 7 (ej. 7123-4567).';
    } else if (this.existeTelefono(telefono, idExcluido)) {
      errores.telefono = 'Ya existe un contacto con ese teléfono.';
    }

    const email: string = datos.email.trim();
    if (email.length === 0) {
      errores.email = 'El email es obligatorio.';
    } else if (!ContactoController.PATRON_EMAIL.test(email)) {
      errores.email = 'Formato de email inválido (ej. nombre@correo.com).';
    }

    return errores;
  }

  public normalizarTelefono(valor: string): string | null {
    const soloDigitos: string = valor.trim().replace(/[\s\-().]/g, '');
    const sinPrefijo: string = soloDigitos.replace(/^\+?503/, '');
    if (!ContactoController.PATRON_TELEFONO_SV.test(sinPrefijo)) {
      return null;
    }
    return `${sinPrefijo.slice(0, 4)}-${sinPrefijo.slice(4)}`;
  }

  public obtenerFiltrados(): Contacto[] {
    return this.contactos
      .filter((contacto: Contacto): boolean => contacto.coincideCon(this.terminoBusqueda))
      .sort((a: Contacto, b: Contacto): number => a.nombre.localeCompare(b.nombre, 'es'));
  }

  public contarTodos(): number {
    return this.contactos.length;
  }

  private enviarFormulario(datos: DatosContacto): void {
    if (this.idEnEdicion !== null) {
      this.actualizar(this.idEnEdicion, datos);
      return;
    }
    this.crear(datos);
  }

  private normalizar(datos: DatosContacto): DatosContacto {
    return {
      nombre: datos.nombre.trim().replace(/\s+/g, ' '),
      telefono: this.normalizarTelefono(datos.telefono) ?? datos.telefono.trim(),
      email: datos.email.trim().toLowerCase(),
    };
  }

  private existeTelefono(telefonoNormalizado: string, idExcluido: string | null): boolean {
    return this.contactos.some(
      (contacto: Contacto): boolean =>
        contacto.id !== idExcluido && contacto.telefono === telefonoNormalizado,
    );
  }

  private buscarPorId(id: string): Contacto | undefined {
    return this.contactos.find((contacto: Contacto): boolean => contacto.id === id);
  }

  private persistir(): void {
    const planos: IContacto[] = this.contactos.map((contacto: Contacto): IContacto =>
      contacto.aObjetoPlano(),
    );
    this.servicio.guardarTodos(planos);
  }

  private refrescarVista(): void {
    this.vista.renderizar(this.obtenerFiltrados(), this.contarTodos());
  }
}
