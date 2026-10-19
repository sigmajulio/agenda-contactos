/** Categorías permitidas para un contacto (RF-01). */
export const CATEGORIAS = ['familia', 'trabajo', 'amigos'] as const;

export type Categoria = (typeof CATEGORIAS)[number];

/** Etiqueta legible para cada categoría. */
export const ETIQUETAS_CATEGORIA: Readonly<Record<Categoria, string>> = {
  familia: 'Familia',
  trabajo: 'Trabajo',
  amigos: 'Amigos',
};

export interface IContacto {
  readonly id: string;
  nombre: string;
  telefono: string;
  email: string;
  categoria: Categoria;
}

export type DatosContacto = Omit<IContacto, 'id'>;

export type CampoContacto = keyof DatosContacto;

export type ErroresValidacion = Partial<Record<CampoContacto, string>>;

export function esCategoria(valor: unknown): valor is Categoria {
  return typeof valor === 'string' && (CATEGORIAS as readonly string[]).includes(valor);
}

export class Contacto implements IContacto {
  public readonly id: string;
  private _nombre: string;
  private _telefono: string;
  private _email: string;
  private _categoria: Categoria;

  public constructor(datos: DatosContacto, id: string = crypto.randomUUID()) {
    this.id = id;
    this._nombre = datos.nombre;
    this._telefono = datos.telefono;
    this._email = datos.email;
    this._categoria = datos.categoria;
  }

  public get nombre(): string {
    return this._nombre;
  }

  public set nombre(valor: string) {
    this._nombre = valor;
  }

  public get telefono(): string {
    return this._telefono;
  }

  public set telefono(valor: string) {
    this._telefono = valor;
  }

  public get email(): string {
    return this._email;
  }

  public set email(valor: string) {
    this._email = valor;
  }

  public get categoria(): Categoria {
    return this._categoria;
  }

  public set categoria(valor: Categoria) {
    this._categoria = valor;
  }

  /** Iniciales para el avatar (RF-07): primera letra de las dos primeras palabras. */
  public get iniciales(): string {
    const partes: string[] = this._nombre.trim().split(/\s+/).slice(0, 2);
    return partes.map((parte: string): string => parte.charAt(0).toUpperCase()).join('');
  }

  public actualizar(datos: DatosContacto): void {
    this._nombre = datos.nombre;
    this._telefono = datos.telefono;
    this._email = datos.email;
    this._categoria = datos.categoria;
  }

  /** Coincidencia por nombre (texto) o teléfono (solo dígitos). */
  public coincideCon(termino: string): boolean {
    const consulta: string = termino.trim().toLowerCase();
    if (consulta.length === 0) {
      return true;
    }
    const nombre: string = this._nombre.toLowerCase();
    const digitosContacto: string = this._telefono.replace(/\D/g, '');
    const digitosConsulta: string = consulta.replace(/\D/g, '');
    const coincideTelefono: boolean =
      digitosConsulta.length > 0 && digitosContacto.includes(digitosConsulta);
    return nombre.includes(consulta) || coincideTelefono;
  }

  public aObjetoPlano(): IContacto {
    return {
      id: this.id,
      nombre: this._nombre,
      telefono: this._telefono,
      email: this._email,
      categoria: this._categoria,
    };
  }

  public static desdeObjetoPlano(plano: IContacto): Contacto {
    return new Contacto(
      {
        nombre: plano.nombre,
        telefono: plano.telefono,
        email: plano.email,
        categoria: plano.categoria,
      },
      plano.id,
    );
  }

  public static esObjetoContacto(valor: unknown): valor is IContacto {
    if (typeof valor !== 'object' || valor === null) {
      return false;
    }
    const posible = valor as Record<string, unknown>;
    return (
      typeof posible['id'] === 'string' &&
      typeof posible['nombre'] === 'string' &&
      typeof posible['telefono'] === 'string' &&
      typeof posible['email'] === 'string' &&
      esCategoria(posible['categoria'])
    );
  }
}
