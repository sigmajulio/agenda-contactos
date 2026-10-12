# Agenda de Contactos

Descripción:

Aplicación web para gestionar una agenda de contactos con nombre, teléfono y email. Está construida con TypeScript, HTML y CSS puros, sin frameworks de interfaz y sin empaquetador. El código se organiza con el patrón MVC (Modelo, Vista, Controlador) más una capa de servicio dedicada a la persistencia. Los datos se guardan en el localStorage del navegador, por lo que siguen ahí al recargar la página. La única dependencia del proyecto es el compilador de TypeScript, instalado localmente.

Funciona en cualquier navegador moderno. No necesita conexión a internet una vez compilado.


Requisitos previos:

Node.js version 18 o superior.
pnpm, que es el gestor de paquetes usado en este proyecto.
Python 3, únicamente para levantar el servidor local de pruebas. Cualquier otro servidor estático sirve igual.


Instalación:

Abre una terminal dentro de la carpeta del proyecto y ejecuta:

pnpm install

Ese comando descarga la única dependencia de desarrollo, que es TypeScript.


Compilación:

pnpm build

Ese comando ejecuta tsc y traduce todos los archivos de src a JavaScript dentro de la carpeta dist. Si quieres que recompile solo al guardar cambios, usa:

pnpm watch

Si solo quieres revisar los tipos sin generar archivos, usa:

pnpm typecheck


Ejecución:

pnpm start

Ese comando levanta un servidor estático en el puerto 8080. Luego abre el navegador en la dirección localhost:8080 y la aplicación estará funcionando.

El orden correcto siempre es: primero pnpm install, luego pnpm build y por último pnpm start.


Por qué no funciona abriendo el index.html con doble clic:

El proyecto usa módulos ES, es decir, la etiqueta script con type igual a module y las sentencias import y export entre archivos. Los navegadores aplican la política de seguridad CORS a los módulos, y el esquema file, que es el que usa el navegador cuando abres un archivo con doble clic, no tiene un origen válido. Por eso el navegador bloquea la carga y en la consola aparece un error que dice que las peticiones de origen cruzado solo se admiten para los esquemas http y https.

La solución es servir los archivos por HTTP, que es exactamente lo que hace pnpm start. También sirve la extensión Live Server de Visual Studio Code, el comando npx serve, Apache o cualquier otro servidor estático. Lo que nunca va a funcionar es el doble clic sobre el archivo.

Hay un segundo motivo relacionado: los identificadores de cada contacto se generan con crypto.randomUUID, que el navegador solo expone en contextos seguros, o sea https o localhost. Al servir desde localhost el requisito se cumple sin problema.


Estructura de carpetas:

La raíz del proyecto se llama agenda-contactos y contiene lo siguiente.

index.html es la única página. Tiene el marcado del formulario, el buscador, el contador, el contenedor del listado y el modal de confirmación.
package.json tiene los scripts y la única dependencia de desarrollo.
tsconfig.json tiene la configuración del compilador, con modo estricto activado.
README.md es este archivo.
.gitignore indica qué carpetas no se versionan.

Dentro de la carpeta src están los archivos fuente en TypeScript:

src/main.ts es el punto de entrada. Crea las capas y arranca la aplicación.
src/models/Contacto.ts contiene la interfaz IContacto y la clase Contacto.
src/views/ContactoView.ts contiene la clase ContactoView, que es la única que toca el DOM.
src/controllers/ContactoController.ts contiene la clase ContactoController, con el CRUD, la búsqueda y la validación.
src/services/StorageService.ts contiene la clase StorageService, que es la única que usa localStorage.
src/styles/styles.css contiene los estilos propios, con diseño adaptable a móvil.

La carpeta dist se genera al compilar y contiene el JavaScript que realmente carga el navegador. No se versiona porque se puede regenerar con pnpm build.

Un detalle importante: como no hay empaquetador, el navegador resuelve las rutas de los import tal como están escritas y solo entiende archivos reales. Por eso en el código fuente los import terminan en punto js aunque los archivos sean punto ts. TypeScript entiende que debe leer el archivo punto ts correspondiente, y en el JavaScript generado la ruta queda igual, apuntando al archivo que sí existe dentro de dist.


Arquitectura MVC:

El Modelo es la clase Contacto, en la carpeta models. Representa un contacto con sus cuatro datos: id, nombre, telefono y email. Sabe actualizarse, sabe decir si coincide con un término de búsqueda y sabe convertirse a objeto plano y reconstruirse desde un objeto plano. Incluye la interfaz IContacto, que define la forma mínima de un contacto, y un verificador de tipo que comprueba si un valor desconocido realmente tiene esa forma. El modelo no toca el DOM ni el almacenamiento.

La Vista es la clase ContactoView, en la carpeta views. Es la única clase del proyecto que toca el DOM. Renderiza las tarjetas o la tabla, lee los valores del formulario, muestra los mensajes de error debajo de cada campo, muestra los mensajes de éxito, actualiza el contador, muestra el estado vacío y controla el modal de confirmación antes de eliminar. Avisa hacia afuera mediante callbacks que se registran con los métodos alGuardar, alBuscar, alEditar, alEliminar y alCancelarEdicion. La vista no valida, no decide nada de negocio y no conoce al servicio de almacenamiento.

El Controlador es la clase ContactoController, en la carpeta controllers. Contiene toda la lógica: valida, normaliza, crea, actualiza, elimina, filtra y ordena. Es la única capa que conoce a la vista y al servicio al mismo tiempo. El controlador no manipula el DOM ni llama a localStorage directamente.

El Servicio es la clase StorageService, en la carpeta services. Es la única clase que usa localStorage, siempre con una clave constante. Envuelve la lectura y la escritura en bloques try catch, así que si el JSON está corrupto, si la clave no existe o si el navegador tiene el almacenamiento bloqueado, devuelve una lista vacía en lugar de lanzar un error. Siempre devuelve objetos tipados. El servicio no sabe qué datos son válidos ni cómo se muestran.

El ensamblaje ocurre en main.ts. Ahí se crean la vista y el servicio y se inyectan en el controlador, que es quien se suscribe a los callbacks de la vista. Gracias a eso la vista nunca necesita importar el servicio y las dependencias apuntan en una sola dirección, que es lo que mantiene las capas separadas.


Flujo completo de agregar un contacto:

Paso 1, en la Vista. El usuario escribe nombre, teléfono y email y presiona el botón Guardar contacto. La clase ContactoView captura el evento submit del formulario, cancela el envío por defecto del navegador, lee los tres valores con el método leerFormulario y ejecuta el callback que tenía registrado, pasándole esos datos.

Paso 2, en el Controlador. La clase ContactoController recibe los datos tal como se escribieron y llama a su método validar, que revisa que el nombre tenga al menos dos caracteres, que el teléfono sea un número salvadoreño válido y que no esté repetido, y que el email tenga formato correcto. Si hay errores, el controlador se los devuelve a la vista llamando a mostrarErrores y el flujo termina ahí, sin guardar nada. Si todo está bien, normaliza los datos: recorta espacios sobrantes del nombre, convierte el teléfono al formato de cuatro dígitos, guion y cuatro dígitos, y pasa el email a minúsculas. Después crea la entidad llamando al constructor de Contacto, que genera el identificador único con crypto.randomUUID.

Paso 3, en el Servicio. El controlador convierte la lista completa de contactos a objetos planos y llama a guardarTodos de la clase StorageService. El servicio serializa esa lista con JSON y la escribe en localStorage bajo la clave constante.

Paso 4, de vuelta en la Vista. El controlador cierra el ciclo pidiéndole a la vista que se actualice: limpia el formulario, muestra el mensaje de éxito y llama a renderizar pasándole la lista filtrada y el total, de modo que se repintan las tarjetas y el contador.

Los demás casos de uso siguen el mismo camino. Al buscar, cada tecla dispara el evento input, el controlador guarda el término y repinta solo con los contactos que coinciden, sin tocar localStorage. Al editar, el controlador recuerda el identificador que se está editando y pide a la vista que cargue los datos en el mismo formulario, de manera que el siguiente envío actualiza en lugar de crear y conserva el identificador original. Al eliminar, la vista abre primero el modal de confirmación y solo si el usuario confirma se llama al controlador, que quita el contacto, persiste la lista y repinta.


Reglas de validación:

El nombre es obligatorio y debe tener al menos dos caracteres, sin contar los espacios de los extremos. Si está vacío se muestra el mensaje de que el nombre es obligatorio, y si es demasiado corto se muestra el mensaje de que debe tener al menos dos caracteres.

El teléfono es obligatorio y debe cumplir el formato de El Salvador: ocho dígitos que empiecen con 2, con 6 o con 7. Se aceptan varias formas de escribirlo y todas se guardan igual. Si el usuario escribe 71234567 se guarda como 7123-4567. Si escribe 7123-4567 se guarda tal cual. Si escribe más 503 seguido de 7123 4567 se guarda como 7123-4567. Si escribe el prefijo entre paréntesis, como 503 entre paréntesis seguido de 7123-4567, también se guarda como 7123-4567. Si escribe 22345678 se guarda como 2234-5678. En cambio, 1234-5678 se rechaza porque no empieza con 2, 6 ni 7, y 712345678 se rechaza porque tiene nueve dígitos.

Antes de validar, el controlador elimina espacios, guiones, puntos y paréntesis, y quita el prefijo internacional más 503 o simplemente 503. Después comprueba el patrón de ocho dígitos y finalmente guarda el número con el guion en medio.

El teléfono tampoco puede repetirse en la agenda. Si ya existe otro contacto con ese mismo número se muestra el mensaje de que ya existe un contacto con ese teléfono. Cuando se está editando, el propio contacto no cuenta como duplicado de sí mismo, porque el controlador excluye su identificador de la comparación.

El email es obligatorio y debe tener formato válido, es decir texto, arroba, dominio, punto y extensión de al menos dos letras. Si no cumple, se muestra el mensaje de formato de email inválido.

Además hay dos normalizaciones automáticas: el nombre colapsa los espacios múltiples a uno solo y el email se guarda en minúsculas. La búsqueda por teléfono compara únicamente dígitos, así que escribir 71234 encuentra al contacto igual que escribir 7123-4.


Requerimientos cumplidos:

Registrar contactos con nombre, teléfono y email. Cumplido.
Buscar por nombre o por teléfono con filtro en vivo mientras se escribe. Cumplido.
Editar contactos reutilizando el mismo formulario, con botón de Cancelar edición. Cumplido.
Eliminar contactos pidiendo confirmación previa en un modal. Cumplido.
Validar el teléfono con formato de El Salvador, ocho dígitos que inician con 2, 6 o 7, aceptando las variantes con guion, sin guion y con prefijo más 503, y guardándolo normalizado con el guion en medio. Cumplido.
Validar que el nombre no esté vacío y tenga al menos dos caracteres. Cumplido.
Validar que el email tenga formato correcto. Cumplido.
Impedir teléfonos duplicados. Cumplido.
Mostrar los contactos en tarjetas, con opción de alternar a vista de tabla. Cumplido.
Persistir los datos en localStorage de modo que sobrevivan a recargar la página. Cumplido.
Mostrar estado vacío diferenciado, con el mensaje de que no hay contactos cuando la agenda está vacía y el mensaje de sin resultados cuando la búsqueda no encuentra nada. Cumplido.
Mostrar un contador de contactos, que indica cuántos se ven de cuántos hay cuando el filtro está activo. Cumplido.
Diseño propio y adaptable a móvil en el archivo styles.css, sin frameworks de CSS. Cumplido.
Implementar las cuatro clases requeridas: Contacto, ContactoView, ContactoController y StorageService, cada una en su carpeta. Cumplido.
Definir la interfaz IContacto, usar tipos explícitos, modificadores de acceso private y readonly, tipos de retorno explícitos y generar los identificadores con crypto.randomUUID. Cumplido.
Configurar el compilador con modo estricto activado y no usar el tipo any en ninguna parte del código. Cumplido.
Compilar únicamente con tsc, sin empaquetador y sin dependencias en tiempo de ejecución. Cumplido.


Cómo probar que todo funciona:

Paso 1. Agrega un contacto válido, por ejemplo María López, el teléfono más 503 7123 4567 y el correo maria arroba correo punto com. Debe aparecer una tarjeta y el teléfono debe verse guardado como 7123-4567.

Paso 2. Intenta guardar otro contacto con ese mismo teléfono. Debe aparecer el error de duplicado debajo del campo de teléfono y no debe crearse la tarjeta.

Paso 3. Prueba un teléfono inválido como 1234-5678 y un email sin arroba. Deben aparecer los dos errores, cada uno debajo de su campo.

Paso 4. Escribe 7123 en la barra de búsqueda. El listado debe filtrarse mientras escribes y el contador debe cambiar para indicar cuántos se muestran del total.

Paso 5. Presiona Editar en una tarjeta, cambia el nombre y guarda. El contacto debe actualizarse sin duplicarse y el formulario debe volver al modo de creación.

Paso 6. Presiona Eliminar. Debe abrirse el modal y no debe borrarse nada hasta que confirmes.

Paso 7. Cambia a la vista de Tabla y recarga la página con F5. Los contactos deben seguir ahí, cargados desde localStorage.
