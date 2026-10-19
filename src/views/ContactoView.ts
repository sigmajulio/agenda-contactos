import { CATEGORIAS, ETIQUETAS_CATEGORIA, esCategoria } from '../models/Contacto.js';
import type { CampoContacto, Contacto, ErroresValidacion } from '../models/Contacto.js';
import type {
  ContadorCategorias,
  DatosFormulario,
  FiltroCategoria,
  OrdenNombre,
} from '../models/ContactoModel.js';

export type ModoVista = 'tarjetas' | 'tabla';
export type TipoNotificacion = 'exito' | 'error' | 'info';

type ManejadorDatos = (datos: DatosFormulario) => void;
type ManejadorTexto = (texto: string) => void;
type ManejadorId = (id: string) => void;
type ManejadorFiltro = (categoria: FiltroCategoria) => void;
type ManejadorOrden = (orden: OrdenNombre) => void;
type ManejadorSimple = () => void;

const CAMPOS: readonly CampoContacto[] = ['nombre', 'telefono', 'email', 'categoria'];
const DURACION_NOTIFICACION_MS: number = 3200;
const MAXIMO_NOTIFICACIONES: number = 3;

/**
 * Vista: única clase que toca el DOM. Renderiza, lee el formulario y avisa al
 * controlador mediante callbacks. No valida ni decide reglas de negocio.
 */
export class ContactoView {
  private readonly raiz: Document;
  private readonly formulario: HTMLFormElement;
  private readonly entradaNombre: HTMLInputElement;
  private readonly entradaTelefono: HTMLInputElement;
  private readonly entradaEmail: HTMLInputElement;
  private readonly selectorCategoria: HTMLSelectElement;
  private readonly entradaBusqueda: HTMLInputElement;
  private readonly filtroCategoria: HTMLSelectElement;
  private readonly selectorOrden: HTMLSelectElement;
  private readonly tituloFormulario: HTMLElement;
  private readonly botonEnviar: HTMLButtonElement;
  private readonly botonCancelar: HTMLButtonElement;
  private readonly botonExportar: HTMLButtonElement;
  private readonly resumen: HTMLElement;
  private readonly contador: HTMLElement;
  private readonly listado: HTMLElement;
  private readonly estadoVacio: HTMLElement;
  private readonly selectorVista: HTMLElement;
  private readonly notificaciones: HTMLElement;
  private readonly modal: HTMLElement;
  private readonly modalTexto: HTMLElement;
  private readonly modalConfirmar: HTMLButtonElement;
  private readonly modalCancelar: HTMLButtonElement;

  private modo: ModoVista = 'tarjetas';
  private contactosVisibles: readonly Contacto[] = [];
  private totalContactos: number = 0;
  private idPendiente: string | null = null;

  private manejadorGuardar: ManejadorDatos | null = null;
  private manejadorBuscar: ManejadorTexto | null = null;
  private manejadorFiltrar: ManejadorFiltro | null = null;
  private manejadorOrdenar: ManejadorOrden | null = null;
  private manejadorEditar: ManejadorId | null = null;
  private manejadorEliminar: ManejadorId | null = null;
  private manejadorCancelar: ManejadorSimple | null = null;
  private manejadorExportar: ManejadorSimple | null = null;

  public constructor(raiz: Document = document) {
    this.raiz = raiz;
    this.formulario = this.obtener<HTMLFormElement>('[data-ref="formulario"]');
    this.entradaNombre = this.obtener<HTMLInputElement>('#nombre');
    this.entradaTelefono = this.obtener<HTMLInputElement>('#telefono');
    this.entradaEmail = this.obtener<HTMLInputElement>('#email');
    this.selectorCategoria = this.obtener<HTMLSelectElement>('#categoria');
    this.entradaBusqueda = this.obtener<HTMLInputElement>('[data-ref="busqueda"]');
    this.filtroCategoria = this.obtener<HTMLSelectElement>('[data-ref="filtro-categoria"]');
    this.selectorOrden = this.obtener<HTMLSelectElement>('[data-ref="orden"]');
    this.tituloFormulario = this.obtener<HTMLElement>('[data-ref="titulo-formulario"]');
    this.botonEnviar = this.obtener<HTMLButtonElement>('[data-ref="boton-enviar"]');
    this.botonCancelar = this.obtener<HTMLButtonElement>('[data-ref="boton-cancelar"]');
    this.botonExportar = this.obtener<HTMLButtonElement>('[data-ref="boton-exportar"]');
    this.resumen = this.obtener<HTMLElement>('[data-ref="resumen"]');
    this.contador = this.obtener<HTMLElement>('[data-ref="contador"]');
    this.listado = this.obtener<HTMLElement>('[data-ref="listado"]');
    this.estadoVacio = this.obtener<HTMLElement>('[data-ref="estado-vacio"]');
    this.selectorVista = this.obtener<HTMLElement>('[data-ref="selector-vista"]');
    this.notificaciones = this.obtener<HTMLElement>('[data-ref="notificaciones"]');
    this.modal = this.obtener<HTMLElement>('[data-ref="modal"]');
    this.modalTexto = this.obtener<HTMLElement>('[data-ref="modal-texto"]');
    this.modalConfirmar = this.obtener<HTMLButtonElement>('[data-ref="modal-confirmar"]');
    this.modalCancelar = this.obtener<HTMLButtonElement>('[data-ref="modal-cancelar"]');

    this.registrarEventos();
  }

  // ---------- Suscripción del controlador ----------

  public alGuardar(manejador: ManejadorDatos): void {
    this.manejadorGuardar = manejador;
  }

  public alBuscar(manejador: ManejadorTexto): void {
    this.manejadorBuscar = manejador;
  }

  public alFiltrar(manejador: ManejadorFiltro): void {
    this.manejadorFiltrar = manejador;
  }

  public alOrdenar(manejador: ManejadorOrden): void {
    this.manejadorOrdenar = manejador;
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

  public alExportar(manejador: ManejadorSimple): void {
    this.manejadorExportar = manejador;
  }

  // ---------- API pública de renderizado ----------

  public leerFormulario(): DatosFormulario {
    return {
      nombre: this.entradaNombre.value,
      telefono: this.entradaTelefono.value,
      email: this.entradaEmail.value,
      categoria: this.selectorCategoria.value,
    };
  }

  public renderizar(
    contactos: readonly Contacto[],
    total: number,
    contadorCategorias: ContadorCategorias,
  ): void {
    this.contactosVisibles = contactos;
    this.totalContactos = total;
    this.actualizarContador();
    this.renderCategoryFilter(contadorCategorias, total);
    this.renderContadorCategorias(contadorCategorias, total);
    this.pintarListado();
  }

  public cambiarVista(modo: ModoVista): void {
    this.modo = modo;
    this.actualizarSelectorVista();
    this.pintarListado();
  }

  /** RF-04: rellena el <select> de filtro con el conteo de cada categoría. */
  public renderCategoryFilter(contador: ContadorCategorias, total: number): void {
    const seleccionado: string = this.filtroCategoria.value || 'todas';
    const opciones: string[] = [`<option value="todas">Todas (${total})</option>`];
    for (const categoria of CATEGORIAS) {
      opciones.push(
        `<option value="${categoria}">${ETIQUETAS_CATEGORIA[categoria]} (${contador[categoria]})</option>`,
      );
    }
    this.filtroCategoria.innerHTML = opciones.join('');
    this.filtroCategoria.value = seleccionado;
  }

  /** RF-09: tarjetas de resumen con el total por categoría (clic = filtrar). */
  public renderContadorCategorias(contador: ContadorCategorias, total: number): void {
    const activo: string = this.filtroCategoria.value || 'todas';
    const chip = (valor: string, etiqueta: string, cantidad: number): string => `
      <button type="button" class="resumen__chip resumen__chip--${valor}${
        activo === valor ? ' resumen__chip--activo' : ''
      }" data-filtro="${valor}" aria-pressed="${activo === valor}">
        <span class="resumen__numero">${cantidad}</span>
        <span class="resumen__etiqueta">${etiqueta}</span>
      </button>`;
    this.resumen.innerHTML =
      chip('todas', 'Total', total) +
      CATEGORIAS.map((categoria): string =>
        chip(categoria, ETIQUETAS_CATEGORIA[categoria], contador[categoria]),
      ).join('');
  }

  /** RF-07: avatar circular con las iniciales y el color de la categoría. */
  public renderAvatar(contacto: Contacto, extra: string = ''): string {
    return `<span class="avatar avatar--${contacto.categoria} ${extra}" aria-hidden="true">${this.escapar(
      contacto.iniciales,
    )}</span>`;
  }

  public mostrarErrores(errores: ErroresValidacion): void {
    this.limpiarErrores();
    let primerInvalido: HTMLElement | null = null;
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
      const control: HTMLElement = this.controlDe(campo);
      control.classList.add('campo__control--invalido');
      primerInvalido ??= control;
    }
    primerInvalido?.focus();
  }

  public limpiarErrores(): void {
    for (const campo of CAMPOS) {
      this.limpiarErrorDe(campo);
    }
  }

  private limpiarErrorDe(campo: CampoContacto): void {
    const contenedor = this.raiz.querySelector<HTMLElement>(`[data-error="${campo}"]`);
    if (contenedor !== null) {
      contenedor.textContent = '';
      contenedor.classList.remove('campo__error--visible');
    }
    this.controlDe(campo).classList.remove('campo__control--invalido');
  }

  /** Notificación flotante que se cierra sola (o con la ×). */
  public notificar(mensaje: string, tipo: TipoNotificacion = 'exito'): void {
    const aviso: HTMLDivElement = this.raiz.createElement('div');
    aviso.className = `notificacion notificacion--${tipo}`;
    aviso.setAttribute('role', tipo === 'error' ? 'alert' : 'status');

    const texto: HTMLSpanElement = this.raiz.createElement('span');
    texto.textContent = mensaje;
    const cerrar: HTMLButtonElement = this.raiz.createElement('button');
    cerrar.type = 'button';
    cerrar.className = 'notificacion__cerrar';
    cerrar.setAttribute('aria-label', 'Cerrar notificación');
    cerrar.textContent = '×';

    aviso.append(texto, cerrar);
    this.notificaciones.append(aviso);
    // Evita que se apilen demasiadas: se descartan las más antiguas.
    while (this.notificaciones.childElementCount > MAXIMO_NOTIFICACIONES) {
      this.notificaciones.firstElementChild?.remove();
    }

    const quitar = (): void => {
      aviso.classList.add('notificacion--saliendo');
      window.setTimeout((): void => aviso.remove(), 250);
    };
    const temporizador: number = window.setTimeout(quitar, DURACION_NOTIFICACION_MS);
    cerrar.addEventListener('click', (): void => {
      window.clearTimeout(temporizador);
      quitar();
    });
  }

  public limpiarFormulario(): void {
    this.formulario.reset();
    this.limpiarErrores();
  }

  public activarModoEdicion(contacto: Contacto): void {
    this.entradaNombre.value = contacto.nombre;
    this.entradaTelefono.value = contacto.telefono;
    this.entradaEmail.value = contacto.email;
    this.selectorCategoria.value = contacto.categoria;
    this.tituloFormulario.textContent = `Editando: ${contacto.nombre}`;
    this.botonEnviar.textContent = 'Actualizar';
    this.botonCancelar.hidden = false;
    this.formulario.classList.add('formulario--editando');
    this.limpiarErrores();
    this.formulario.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.entradaNombre.focus({ preventScroll: true });
  }

  public desactivarModoEdicion(): void {
    this.tituloFormulario.textContent = 'Nuevo contacto';
    this.botonEnviar.textContent = 'Guardar contacto';
    this.botonCancelar.hidden = true;
    this.formulario.classList.remove('formulario--editando');
    this.limpiarFormulario();
  }

  /** Descarga un archivo de texto generado en memoria (para el CSV). */
  public descargarArchivo(nombre: string, contenido: string, tipo: string): void {
    // BOM para que Excel abra bien las tildes y la ñ.
    const blob: Blob = new Blob(['﻿', contenido], { type: `${tipo};charset=utf-8` });
    const url: string = URL.createObjectURL(blob);
    const enlace: HTMLAnchorElement = this.raiz.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    enlace.hidden = true;
    this.raiz.body.append(enlace);
    enlace.click();
    enlace.remove();
    window.setTimeout((): void => URL.revokeObjectURL(url), 1000);
  }

  // ---------- Eventos del DOM ----------

  private registrarEventos(): void {
    this.formulario.addEventListener('submit', (evento: SubmitEvent): void => {
      evento.preventDefault();
      this.manejadorGuardar?.(this.leerFormulario());
    });

    // Al corregir un campo se quita su mensaje de error.
    for (const campo of CAMPOS) {
      const control: HTMLInputElement | HTMLSelectElement = this.controlDe(campo);
      const tipoEvento: string = control instanceof HTMLSelectElement ? 'change' : 'input';
      control.addEventListener(tipoEvento, (): void => this.limpiarErrorDe(campo));
    }

    this.entradaBusqueda.addEventListener('input', (): void => {
      this.manejadorBuscar?.(this.entradaBusqueda.value);
    });

    this.filtroCategoria.addEventListener('change', (): void => {
      this.emitirFiltro(this.filtroCategoria.value);
    });

    this.selectorOrden.addEventListener('change', (): void => {
      const valor: string = this.selectorOrden.value;
      if (valor === 'asc' || valor === 'desc') {
        this.manejadorOrdenar?.(valor);
      }
    });

    this.resumen.addEventListener('click', (evento: MouseEvent): void => {
      const boton: HTMLButtonElement | null = this.botonDesdeEvento(evento, '[data-filtro]');
      const valor: string | undefined = boton?.dataset['filtro'];
      if (valor !== undefined) {
        this.filtroCategoria.value = valor;
        this.emitirFiltro(valor);
      }
    });

    this.botonCancelar.addEventListener('click', (): void => {
      this.manejadorCancelar?.();
    });

    this.botonExportar.addEventListener('click', (): void => {
      this.manejadorExportar?.();
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

  private emitirFiltro(valor: string): void {
    if (valor === 'todas' || esCategoria(valor)) {
      this.manejadorFiltrar?.(valor);
    }
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

  // ---------- Plantillas ----------

  private pintarListado(): void {
    if (this.contactosVisibles.length === 0) {
      this.listado.innerHTML = '';
      this.estadoVacio.hidden = false;
      this.estadoVacio.textContent =
        this.totalContactos === 0
          ? 'No hay contactos. Agrega el primero con el formulario de arriba.'
          : 'Ningún contacto coincide con la búsqueda y el filtro seleccionados.';
      return;
    }

    this.estadoVacio.hidden = true;
    this.listado.innerHTML =
      this.modo === 'tarjetas' ? this.plantillaTarjetas() : this.plantillaTabla();
  }

  private plantillaInsignia(contacto: Contacto): string {
    return `<span class="insignia insignia--${contacto.categoria}">${
      ETIQUETAS_CATEGORIA[contacto.categoria]
    }</span>`;
  }

  private plantillaTarjetas(): string {
    const tarjetas: string = this.contactosVisibles
      .map(
        (contacto: Contacto): string => `
        <article class="tarjeta">
          ${this.renderAvatar(contacto, 'tarjeta__avatar')}
          <div class="tarjeta__datos">
            <h3 class="tarjeta__nombre">${this.escapar(contacto.nombre)}</h3>
            ${this.plantillaInsignia(contacto)}
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
          <td data-columna="Nombre">
            <span class="tabla__persona">${this.renderAvatar(contacto, 'avatar--mini')}${this.escapar(
              contacto.nombre,
            )}</span>
          </td>
          <td data-columna="Teléfono">${this.escapar(contacto.telefono)}</td>
          <td data-columna="Email">${this.escapar(contacto.email)}</td>
          <td data-columna="Categoría">${this.plantillaInsignia(contacto)}</td>
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
              <th scope="col">Categoría</th>
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

  private controlDe(campo: CampoContacto): HTMLInputElement | HTMLSelectElement {
    switch (campo) {
      case 'nombre':
        return this.entradaNombre;
      case 'telefono':
        return this.entradaTelefono;
      case 'email':
        return this.entradaEmail;
      case 'categoria':
        return this.selectorCategoria;
    }
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
