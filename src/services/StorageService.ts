import { Contacto } from '../models/Contacto.js';
import type { IContacto } from '../models/Contacto.js';

export class StorageService {
  private static readonly CLAVE_POR_DEFECTO: string = 'agenda-contactos.v1';

  private readonly clave: string;

  public constructor(clave: string = StorageService.CLAVE_POR_DEFECTO) {
    this.clave = clave;
  }

  public obtenerTodos(): IContacto[] {
    try {
      const crudo: string | null = localStorage.getItem(this.clave);
      if (crudo === null || crudo.trim().length === 0) {
        return [];
      }
      const analizado: unknown = JSON.parse(crudo);
      if (!Array.isArray(analizado)) {
        return [];
      }
      return analizado.filter((elemento: unknown): elemento is IContacto =>
        Contacto.esObjetoContacto(elemento),
      );
    } catch {
      return [];
    }
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
}
