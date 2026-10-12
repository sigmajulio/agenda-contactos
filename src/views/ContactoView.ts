import type {
  Contacto,
  DatosContacto,
  CampoContacto,
  ErroresValidacion,
} from '../models/Contacto.js';

export type ModoVista = 'tarjetas' | 'tabla';

type ManejadorDatos = (datos: DatosContacto) => void;
type ManejadorTexto = (texto: string) => void;
type ManejadorId = (id: string) => void;
type ManejadorSimple = () => void;

const CAMPOS: readonly CampoContacto[] = ['nombre', 'telefono', 'email'];

export class ContactoView {
  private readonly raiz: Document;
  private readonly formulario: HTMLFormElement;
  private readonly entradaNombre: HTMLInputElement;
  private readonly entradaTelefono: HTMLInputElement;
  private readonly entradaEmail: HTMLInputElement;
  private readonly entradaBusqueda: HTMLInputElement;
  private readonly tituloFormulario: HTMLElement;
  private readonly botonEnviar: HTMLButtonElement;
  private readonly botonCancelar: HTMLButtonElement;
  private readonly mensajeExito: HTMLElement;
  private readonly contador: HTMLElement;
  private readonly listado: HTMLElement;
  private readonly estadoVacio: HTMLElement;
  private readonly selectorVista: HTMLElement;
  private readonly modal: HTMLElement;
  private readonly modalTexto: HTMLElement;
  private readonly modalConfirmar: HTMLButtonElement;
  private readonly modalCancelar: HTMLButtonElement;

  private modo: ModoVista = 'tarjetas';
  private contactosVisibles: readonly Contacto[] = [];
  private totalContactos: number = 0;
  private idPendiente: string | null = null;
  private temporizadorExito: number | null = null;

  private manejadorGuardar: ManejadorDatos | null = null;
  private manejadorBuscar: ManejadorTexto | null = null;
  private manejadorEditar: ManejadorId | null = null;
  private manejadorEliminar: ManejadorId | null = null;
  private manejadorCancelar: ManejadorSimple | null = null;

  public constructor(raiz: Document = document) {
    this.raiz = raiz;
    this.formulario = this.obtener<HTMLFormElement>('[data-ref="formulario"]');
    this.entradaNombre = this.obtener<HTMLInputElement>('#nombre');
    this.entradaTelefono = this.obtener<HTMLInputElement>('#telefono');
    this.entradaEmail = this.obtener<HTMLInputElement>('#email');
    this.entradaBusqueda = this.obtener<HTMLInputElement>('[data-ref="busqueda"]');
    this.tituloFormulario = this.obtener<HTMLElement>('[data-ref="titulo-formulario"]');
    this.botonEnviar = this.obtener<HTMLButtonElement>('[data-ref="boton-enviar"]');
    this.botonCancelar = this.obtener<HTMLButtonElement>('[data-ref="boton-cancelar"]');
    this.mensajeExito = this.obtener<HTMLElement>('[data-ref="mensaje-exito"]');
    this.contador = this.obtener<HTMLElement>('[data-ref="contador"]');
    this.listado = this.obtener<HTMLElement>('[data-ref="listado"]');
    this.estadoVacio = this.obtener<HTMLElement>('[data-ref="estado-vacio"]');
    this.selectorVista = this.obtener<HTMLElement>('[data-ref="selector-vista"]');
    this.modal = this.obtener<HTMLElement>('[data-ref="modal"]');
    this.modalTexto = this.obtener<HTMLElement>('[data-ref="modal-texto"]');
    this.modalConfirmar = this.obtener<HTMLButtonElement>('[data-ref="modal-confirmar"]');
    this.modalCancelar = this.obtener<HTMLButtonElement>('[data-ref="modal-cancelar"]');

    this.registrarEventos();
  }

  public alGuardar(manejador: ManejadorDatos): void {
    this.manejadorGuardar = manejador;
  }

  public alBuscar(manejador: ManejadorTexto): void {
    this.manejadorBuscar = manejador;
  }

  public alEditar(manejador: ManejadorId): void {
    this.manejadorEditar = manejador;
  }

  public alEliminar(manejador: ManejadorId): void {
    this.manejadorEliminar = manejador;
  }

  public alCancelarEdicion(manejador: ManejadorSimple): void {
    this.manejadorCancelar = manejador;
  }

  public leerFormulario(): DatosContacto {
    return {
      nombre: this.entradaNombre.value,
      telefono: this.entradaTelefono.value,
      email: this.entradaEmail.value,
    };
  }

  public renderizar(contactos: readonly Contacto[], total: number): void {
    this.contactosVisibles = contactos;
    this.totalContactos = total;
    this.actualizarContador();
    this.pintarListado();
  }

  public cambiarVista(modo: ModoVista): void {
    this.modo = modo;
    this.actualizarSelectorVista();
    this.pintarListado();
  }

  public mostrarErrores(errores: ErroresValidacion): void {
    this.limpiarErrores();
    for (const campo of CAMPOS) {
      const mensaje: string | undefined = errores[campo];
      if (mensaje === undefined) {
        continue;
      }
      const contenedor = this.raiz.querySelector<HTMLElement>(`[data-error="${campo}"]`);
      if (contenedor !== null) {
        contenedor.textContent = mensaje;
        contenedor.classList.add('campo__error--visible');
      }
      this.entradaDe(campo).classList.add('campo__control--invalido');
    }
  }

  public limpiarErrores(): void {
    for (const campo of CAMPOS) {
      const contenedor = this.raiz.querySelector<HTMLElement>(`[data-error="${campo}"]`);
      if (contenedor !== null) {
        contenedor.textContent = '';
        contenedor.classList.remove('campo__error--visible');
      }
      this.entradaDe(campo).classList.remove('campo__control--invalido');
    }
  }

  public mostrarExito(mensaje: string): void {
    this.mensajeExito.textContent = mensaje;
    this.mensajeExito.hidden = false;
    if (this.temporizadorExito !== null) {
      window.clearTimeout(this.temporizadorExito);
    }
    this.temporizadorExito = window.setTimeout((): void => {
      this.mensajeExito.hidden = true;
      this.temporizadorExito = null;
    }, 2600);
  }

  public limpiarFormulario(): void {
    this.formulario.reset();
    this.limpiarErrores();
  }

  public activarModoEdicion(contacto: Contacto): void {
    this.entradaNombre.value = contacto.nombre;
    this.entradaTelefono.value = contacto.telefono;
    this.entradaEmail.value = contacto.email;
    this.tituloFormulario.textContent = `Editando: ${contacto.nombre}`;
    this.botonEnviar.textContent = 'Actualizar contacto';
    this.botonCancelar.hidden = false;
    this.formulario.classList.add('formulario--editando');
    this.limpiarErrores();
    this.entradaNombre.focus();
  }

  public desactivarModoEdicion(): void {
    this.tituloFormulario.textContent = 'Nuevo contacto';
    this.botonEnviar.textContent = 'Guardar contacto';
    this.botonCancelar.hidden = true;
    this.formulario.classList.remove('formulario--editando');
    this.limpiarFormulario();
  }

  public limpiarBusqueda(): void {
    this.entradaBusqueda.value = '';
  }

  private registrarEventos(): void {
    this.formulario.addEventListener('submit', (evento: SubmitEvent): void => {
      evento.preventDefault();
      this.manejadorGuardar?.(this.leerFormulario());
    });

    this.entradaBusqueda.addEventListener('input', (): void => {
      this.manejadorBuscar?.(this.entradaBusqueda.value);
    });

    this.botonCancelar.addEventListener('click', (): void => {
      this.manejadorCancelar?.();
    });

    this.selectorVista.addEventListener('click', (evento: MouseEvent): void => {
      const boton: HTMLButtonElement | null = this.botonDesdeEvento(evento, '[data-vista]');
      const vista: string | undefined = boton?.dataset['vista'];
      if (vista === 'tarjetas' || vista === 'tabla') {
        this.cambiarVista(vista);
      }
    });

    this.listado.addEventListener('click', (evento: MouseEvent): void => {
      const boton: HTMLButtonElement | null = this.botonDesdeEvento(evento, '[data-accion]');
      if (boton === null) {
        return;
      }
      const accion: string | undefined = boton.dataset['accion'];
      const id: string | undefined = boton.dataset['id'];
      if (id === undefined) {
        return;
      }
      if (accion === 'editar') {
        this.manejadorEditar?.(id);
        return;
      }
      if (accion === 'eliminar') {
        this.abrirModal(id, boton.dataset['nombre'] ?? 'este contacto');
      }
    });

    this.modalCancelar.addEventListener('click', (): void => {
      this.cerrarModal();
    });

    this.modalConfirmar.addEventListener('click', (): void => {
      const id: string | null = this.idPendiente;
      this.cerrarModal();
      if (id !== null) {
        this.manejadorEliminar?.(id);
      }
    });

    this.modal.addEventListener('click', (evento: MouseEvent): void => {
      if (evento.target === this.modal) {
        this.cerrarModal();
      }
    });

    this.raiz.addEventListener('keydown', (evento: KeyboardEvent): void => {
      if (evento.key === 'Escape' && !this.modal.hidden) {
        this.cerrarModal();
      }
    });
  }

  private abrirModal(id: string, nombre: string): void {
    this.idPendiente = id;
    this.modalTexto.textContent = `¿Seguro que deseas eliminar a ${nombre}? Esta acción no se puede deshacer.`;
    this.modal.hidden = false;
    this.modalConfirmar.focus();
  }

  private cerrarModal(): void {
    this.idPendiente = null;
    this.modal.hidden = true;
  }

  private pintarListado(): void {
    if (this.contactosVisibles.length === 0) {
      this.listado.innerHTML = '';
      this.estadoVacio.hidden = false;
      this.estadoVacio.textContent =
        this.totalContactos === 0
          ? 'No hay contactos. Agrega el primero con el formulario de arriba.'
          : 'Sin resultados para tu búsqueda.';
      return;
    }

    this.estadoVacio.hidden = true;
    this.listado.innerHTML =
      this.modo === 'tarjetas' ? this.plantillaTarjetas() : this.plantillaTabla();
  }

  private plantillaTarjetas(): string {
    const tarjetas: string = this.contactosVisibles
      .map(
        (contacto: Contacto): string => `
        <article class="tarjeta">
          <div class="tarjeta__avatar" aria-hidden="true">${this.escapar(contacto.iniciales)}</div>
          <div class="tarjeta__datos">
            <h3 class="tarjeta__nombre">${this.escapar(contacto.nombre)}</h3>
            <p class="tarjeta__dato">
              <span class="tarjeta__etiqueta">Tel</span>
              <a href="tel:${this.escapar(contacto.telefono)}">${this.escapar(contacto.telefono)}</a>
            </p>
            <p class="tarjeta__dato">
              <span class="tarjeta__etiqueta">Email</span>
              <a href="mailto:${this.escapar(contacto.email)}">${this.escapar(contacto.email)}</a>
            </p>
          </div>
          <div class="tarjeta__acciones">${this.plantillaBotones(contacto)}</div>
        </article>`,
      )
      .join('');
    return `<div class="rejilla">${tarjetas}</div>`;
  }

  private plantillaTabla(): string {
    const filas: string = this.contactosVisibles
      .map(
        (contacto: Contacto): string => `
        <tr>
          <td data-columna="Nombre">${this.escapar(contacto.nombre)}</td>
          <td data-columna="Teléfono">${this.escapar(contacto.telefono)}</td>
          <td data-columna="Email">${this.escapar(contacto.email)}</td>
          <td data-columna="Acciones" class="tabla__acciones">${this.plantillaBotones(contacto)}</td>
        </tr>`,
      )
      .join('');
    return `
      <div class="tabla-contenedor">
        <table class="tabla">
          <thead>
            <tr>
              <th scope="col">Nombre</th>
              <th scope="col">Teléfono</th>
              <th scope="col">Email</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </div>`;
  }

  private plantillaBotones(contacto: Contacto): string {
    const id: string = this.escapar(contacto.id);
    const nombre: string = this.escapar(contacto.nombre);
    return `
      <button class="boton boton--mini" type="button" data-accion="editar" data-id="${id}">Editar</button>
      <button class="boton boton--mini boton--peligro" type="button" data-accion="eliminar" data-id="${id}" data-nombre="${nombre}">Eliminar</button>`;
  }

  private actualizarContador(): void {
    const visibles: number = this.contactosVisibles.length;
    const palabra: string = this.totalContactos === 1 ? 'contacto' : 'contactos';
    this.contador.textContent =
      visibles === this.totalContactos
        ? `${this.totalContactos} ${palabra}`
        : `${visibles} de ${this.totalContactos} ${palabra}`;
  }

  private actualizarSelectorVista(): void {
    const botones = this.selectorVista.querySelectorAll<HTMLButtonElement>('[data-vista]');
    botones.forEach((boton: HTMLButtonElement): void => {
      boton.classList.toggle('boton--vista-activa', boton.dataset['vista'] === this.modo);
    });
  }

  private entradaDe(campo: CampoContacto): HTMLInputElement {
    if (campo === 'nombre') {
      return this.entradaNombre;
    }
    if (campo === 'telefono') {
      return this.entradaTelefono;
    }
    return this.entradaEmail;
  }

  private botonDesdeEvento(evento: MouseEvent, selector: string): HTMLButtonElement | null {
    const objetivo: EventTarget | null = evento.target;
    if (!(objetivo instanceof Element)) {
      return null;
    }
    return objetivo.closest<HTMLButtonElement>(selector);
  }

  private obtener<T extends HTMLElement>(selector: string): T {
    const elemento: T | null = this.raiz.querySelector<T>(selector);
    if (elemento === null) {
      throw new Error(`ContactoView: no se encontró el elemento "${selector}"`);
    }
    return elemento;
  }

  private escapar(texto: string): string {
    const nodo: HTMLElement = this.raiz.createElement('div');
    nodo.textContent = texto;
    return nodo.innerHTML.replace(/"/g, '&quot;');
  }
}
