import { Contacto } from '../models/Contacto.js';
import type { Categoria, IContacto } from '../models/Contacto.js';

/**
 * Único punto de acceso a localStorage (RF-06).
 * Guarda en la clave v2 y, la primera vez, migra los datos del Laboratorio #2
 * (clave v1, sin categoría) asignándoles una categoría por defecto.
 */
export class StorageService {
  private static readonly CLAVE_POR_DEFECTO: string = 'agenda-contactos.v2';
  private static readonly CLAVE_ANTERIOR: string = 'agenda-contactos.v1';
  private static readonly CATEGORIA_MIGRACION: Categoria = 'amigos';

  private readonly clave: string;

  public constructor(clave: string = StorageService.CLAVE_POR_DEFECTO) {
    this.clave = clave;
  }

  public obtenerTodos(): IContacto[] {
    const actuales: unknown[] | null = this.leerArreglo(this.clave);
    if (actuales !== null) {
      return actuales.filter((elemento: unknown): elemento is IContacto =>
        Contacto.esObjetoContacto(elemento),
      );
    }
    return this.migrarVersionAnterior();
  }

  public guardarTodos(contactos: readonly IContacto[]): boolean {
    try {
      localStorage.setItem(this.clave, JSON.stringify(contactos));
      return true;
    } catch {
      return false;
    }
  }

  public limpiar(): void {
    try {
      localStorage.removeItem(this.clave);
    } catch {
      return;
    }
  }

  public obtenerClave(): string {
    return this.clave;
  }

  /** Lee y parsea un arreglo JSON; null si la clave no existe o no es un arreglo válido. */
  private leerArreglo(clave: string): unknown[] | null {
    try {
      const crudo: string | null = localStorage.getItem(clave);
      if (crudo === null || crudo.trim().length === 0) {
        return null;
      }
      const analizado: unknown = JSON.parse(crudo);
      return Array.isArray(analizado) ? (analizado as unknown[]) : null;
    } catch {
      return null;
    }
  }

  private migrarVersionAnterior(): IContacto[] {
    const anteriores: unknown[] | null = this.leerArreglo(StorageService.CLAVE_ANTERIOR);
    if (anteriores === null) {
      return [];
    }
    const migrados: IContacto[] = anteriores
      .map((elemento: unknown): unknown =>
        typeof elemento === 'object' && elemento !== null && !('categoria' in elemento)
          ? { ...elemento, categoria: StorageService.CATEGORIA_MIGRACION }
          : elemento,
      )
      .filter((elemento: unknown): elemento is IContacto => Contacto.esObjetoContacto(elemento));
    this.guardarTodos(migrados);
    return migrados;
  }
}
