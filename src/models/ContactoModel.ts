import { CATEGORIAS, Contacto, ETIQUETAS_CATEGORIA, esCategoria } from './Contacto.js';
import type { Categoria, DatosContacto, ErroresValidacion, IContacto } from './Contacto.js';
import type { StorageService } from '../services/StorageService.js';

export type FiltroCategoria = Categoria | 'todas';
export type OrdenNombre = 'asc' | 'desc';

/** Criterios combinables de consulta: búsqueda + filtro + orden. */
export interface Consulta {
  termino: string;
  categoria: FiltroCategoria;
  orden: OrdenNombre;
}

export type ContadorCategorias = Record<Categoria, number>;

/** Datos del formulario tal como llegan de la vista (la categoría aún sin validar). */
export type DatosFormulario = Omit<DatosContacto, 'categoria'> & { categoria: string };

export type ResultadoOperacion =
  | { ok: true; contacto: Contacto }
  | { ok: false; errores: ErroresValidacion };

/**
 * Modelo de la agenda: mantiene la colección de contactos, aplica las reglas
 * de negocio (validaciones, duplicados) y persiste a través de StorageService.
 * No toca el DOM.
 */
export class ContactoModel {
  public static readonly LONGITUD_MINIMA_NOMBRE: number = 2;
  public static readonly LONGITUD_MAXIMA_NOMBRE: number = 60;
  public static readonly LONGITUD_MAXIMA_EMAIL: number = 100;
  private static readonly PATRON_NOMBRE: RegExp = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]+$/;
  private static readonly PATRON_TELEFONO_SV: RegExp = /^[267]\d{7}$/;
  private static readonly PATRON_EMAIL: RegExp = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

  private readonly servicio: StorageService;
  private contactos: Contacto[] = [];

  public constructor(servicio: StorageService) {
    this.servicio = servicio;
  }

  public cargar(): void {
    this.contactos = this.servicio
      .obtenerTodos()
      .map((plano: IContacto): Contacto => Contacto.desdeObjetoPlano(plano));
  }

  public obtenerTodos(): readonly Contacto[] {
    return this.contactos;
  }

  public obtenerPorId(id: string): Contacto | undefined {
    return this.contactos.find((contacto: Contacto): boolean => contacto.id === id);
  }

  public contarTodos(): number {
    return this.contactos.length;
  }

  // ---------- CRUD ----------

  public addContacto(datos: DatosFormulario): ResultadoOperacion {
    const errores: ErroresValidacion = this.validar(datos, null);
    if (!this.sinErrores(errores)) {
      return { ok: false, errores };
    }
    const contacto: Contacto = new Contacto(this.normalizar(datos));
    this.contactos.push(contacto);
    this.persistir();
    return { ok: true, contacto };
  }

  /** RF-02: edita un contacto existente aplicando las mismas validaciones. */
  public updateContacto(id: string, datos: DatosFormulario): ResultadoOperacion {
    const contacto: Contacto | undefined = this.obtenerPorId(id);
    if (contacto === undefined) {
      return { ok: false, errores: { nombre: 'El contacto ya no existe.' } };
    }
    const errores: ErroresValidacion = this.validar(datos, id);
    if (!this.sinErrores(errores)) {
      return { ok: false, errores };
    }
    contacto.actualizar(this.normalizar(datos));
    this.persistir();
    return { ok: true, contacto };
  }

  /** RF-03: elimina por id. Devuelve el contacto eliminado o undefined si no existía. */
  public deleteContacto(id: string): Contacto | undefined {
    const contacto: Contacto | undefined = this.obtenerPorId(id);
    if (contacto === undefined) {
      return undefined;
    }
    this.contactos = this.contactos.filter((actual: Contacto): boolean => actual.id !== id);
    this.persistir();
    return contacto;
  }

  // ---------- Búsqueda, filtros y orden ----------

  public searchContactos(
    termino: string,
    lista: readonly Contacto[] = this.contactos,
  ): Contacto[] {
    return lista.filter((contacto: Contacto): boolean => contacto.coincideCon(termino));
  }

  /** RF-04: filtra por categoría ('todas' no filtra). */
  public filterByCategory(
    categoria: FiltroCategoria,
    lista: readonly Contacto[] = this.contactos,
  ): Contacto[] {
    if (categoria === 'todas') {
      return [...lista];
    }
    return lista.filter((contacto: Contacto): boolean => contacto.categoria === categoria);
  }

  /** RF-05: orden alfabético (A-Z o Z-A) respetando acentos del español. */
  public sortByName(orden: OrdenNombre, lista: readonly Contacto[] = this.contactos): Contacto[] {
    const factor: number = orden === 'asc' ? 1 : -1;
    return [...lista].sort(
      (a: Contacto, b: Contacto): number =>
        factor * a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }),
    );
  }

  /** Combina búsqueda + categoría + orden en una sola consulta. */
  public consultar(consulta: Consulta): Contacto[] {
    const buscados: Contacto[] = this.searchContactos(consulta.termino);
    const filtrados: Contacto[] = this.filterByCategory(consulta.categoria, buscados);
    return this.sortByName(consulta.orden, filtrados);
  }

  /** RF-09: cantidad de contactos en cada categoría. */
  public getContadorPorCategoria(): ContadorCategorias {
    const contador: ContadorCategorias = { familia: 0, trabajo: 0, amigos: 0 };
    for (const contacto of this.contactos) {
      contador[contacto.categoria] += 1;
    }
    return contador;
  }

  // ---------- Exportación (reto adicional) ----------

  /** Genera CSV (separador coma, comillas dobles escapadas, saltos CRLF). */
  public toCSV(lista: readonly Contacto[] = this.contactos): string {
    const encabezado: string[] = ['Nombre', 'Teléfono', 'Email', 'Categoría'];
    const filas: string[][] = lista.map((contacto: Contacto): string[] => [
      contacto.nombre,
      contacto.telefono,
      contacto.email,
      ETIQUETAS_CATEGORIA[contacto.categoria],
    ]);
    return [encabezado, ...filas]
      .map((fila: string[]): string => fila.map(ContactoModel.celdaCSV).join(','))
      .join('\r\n');
  }

  // ---------- Validaciones ----------

  public validar(datos: DatosFormulario, idExcluido: string | null): ErroresValidacion {
    const errores: ErroresValidacion = {};

    const nombre: string = datos.nombre.trim();
    if (nombre.length === 0) {
      errores.nombre = 'El nombre es obligatorio.';
    } else if (nombre.length < ContactoModel.LONGITUD_MINIMA_NOMBRE) {
      errores.nombre = `El nombre debe tener al menos ${ContactoModel.LONGITUD_MINIMA_NOMBRE} caracteres.`;
    } else if (nombre.length > ContactoModel.LONGITUD_MAXIMA_NOMBRE) {
      errores.nombre = `El nombre no puede superar ${ContactoModel.LONGITUD_MAXIMA_NOMBRE} caracteres.`;
    } else if (!ContactoModel.PATRON_NOMBRE.test(nombre)) {
      errores.nombre = 'El nombre solo puede contener letras, espacios, puntos, guiones y apóstrofos.';
    }

    const telefono: string | null = this.normalizarTelefono(datos.telefono);
    if (datos.telefono.trim().length === 0) {
      errores.telefono = 'El teléfono es obligatorio.';
    } else if (telefono === null) {
      errores.telefono = 'Formato inválido. Usa 8 dígitos que inicien con 2, 6 o 7 (ej. 7123-4567).';
    } else if (this.existeTelefono(telefono, idExcluido)) {
      errores.telefono = 'Ya existe un contacto con ese teléfono.';
    }

    const email: string = datos.email.trim().toLowerCase();
    if (email.length === 0) {
      errores.email = 'El email es obligatorio.';
    } else if (email.length > ContactoModel.LONGITUD_MAXIMA_EMAIL) {
      errores.email = `El email no puede superar ${ContactoModel.LONGITUD_MAXIMA_EMAIL} caracteres.`;
    } else if (!ContactoModel.PATRON_EMAIL.test(email)) {
      errores.email = 'Formato de email inválido (ej. nombre@correo.com).';
    } else if (this.existeEmail(email, idExcluido)) {
      errores.email = 'Ya existe un contacto con ese email.';
    }

    if (datos.categoria.length === 0) {
      errores.categoria = 'Selecciona una categoría.';
    } else if (!esCategoria(datos.categoria)) {
      errores.categoria = `Categoría no válida. Opciones: ${CATEGORIAS.join(', ')}.`;
    }

    return errores;
  }

  public normalizarTelefono(valor: string): string | null {
    const soloDigitos: string = valor.trim().replace(/[\s\-().]/g, '');
    const sinPrefijo: string = soloDigitos.replace(/^\+?503/, '');
    if (!ContactoModel.PATRON_TELEFONO_SV.test(sinPrefijo)) {
      return null;
    }
    return `${sinPrefijo.slice(0, 4)}-${sinPrefijo.slice(4)}`;
  }

  // ---------- Privados ----------

  private normalizar(datos: DatosFormulario): DatosContacto {
    return {
      nombre: datos.nombre.trim().replace(/\s+/g, ' '),
      telefono: this.normalizarTelefono(datos.telefono) ?? datos.telefono.trim(),
      email: datos.email.trim().toLowerCase(),
      categoria: esCategoria(datos.categoria) ? datos.categoria : 'amigos',
    };
  }

  private sinErrores(errores: ErroresValidacion): boolean {
    return Object.keys(errores).length === 0;
  }

  private existeTelefono(telefonoNormalizado: string, idExcluido: string | null): boolean {
    return this.contactos.some(
      (contacto: Contacto): boolean =>
        contacto.id !== idExcluido && contacto.telefono === telefonoNormalizado,
    );
  }

  /** RF-08: email único sin distinguir mayúsculas. */
  private existeEmail(emailNormalizado: string, idExcluido: string | null): boolean {
    return this.contactos.some(
      (contacto: Contacto): boolean =>
        contacto.id !== idExcluido && contacto.email.toLowerCase() === emailNormalizado,
    );
  }

  private persistir(): void {
    const planos: IContacto[] = this.contactos.map((contacto: Contacto): IContacto =>
      contacto.aObjetoPlano(),
    );
    this.servicio.guardarTodos(planos);
  }

  /** Escapa una celda y neutraliza fórmulas (=, +, -, @) para que Excel no las ejecute. */
  private static celdaCSV(valor: string): string {
    const seguro: string = /^[=+\-@]/.test(valor) ? `'${valor}` : valor;
    return /[",\r\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
  }
}
