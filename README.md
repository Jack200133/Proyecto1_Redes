# XMPP Chat Client - Proyecto 1 Redes 🗯️

Este proyecto implementa un cliente de chat basado en XMPP. A continuación se describen los fragmentos clave del código y su funcionalidad.

## 🤖 Requerimientos

- NodeJS version 18.16.1
- NPM version 9.5.1
- Bibliotecas de NodeJS:
  - @xmpp/client
  - @xmpp/debug
  - fs
  - path
  - net
  - readline


```javascript
const { client, xml, jid } = require("@xmpp/client");
const fs = require('fs');
const path = require('path');
const net = require('net');
const debug = require("@xmpp/debug");
const readline = require('readline');
```
## 🚀 Configuración

Lo primero es clonar el proyecto
```bash
git clone https://github.com/Jack200133/Proyecto1_Redes
cd Proyecto1_Redes
```

Luego, instalar las dependencias
```bash
npm install
```

Ahora ya se puede correr el Cliente
```bash
npm run dev
```
## 📨 Funciones Principales

### Menú Principal

```javascript
function menu() {
  console.log('1) Registrar una nueva cuenta en el servidor')
  console.log('2) Iniciar sesión con una cuenta')
  console.log('3) Eliminar la cuenta del servidor')
  console.log('4) Salir del programa')
  rl.question('\nElige una opción: ', (answer) => {
    handleMenuOption(answer)
  })
}
```

Esta función muestra el menú principal y espera la selección del usuario.

### Cambio de Estado

```javascript
const cambiarEstadoUsuario = (xmpp, show, status) => {
  // Código para cambiar el estado del usuario
}
```

Permite cambiar el estado del usuario en el chat, como 'Away', 'Do not disturb', 'Available', etc.
Parametros:
- xmpp: Cliente XMPP conectado al servidor
- show: Estado del usuario
- status: Mensaje de estado

### Manejo de Contactos

```javascript
const getRoster = (xmpp,jid) => { ... }
const cleanContacts = () => { ... }
const formatContacts = async () => { ... }
```

Estas funciones se utilizan para gestionar la lista de contactos del usuario.
Parametros:
- xmpp: Cliente XMPP conectado al servidor
- jid: JID del usuario (este no lleva el @servidor solo el nombre de usuario)

### Leer y Enviar Archivos

```javascript
const leerArchivo = async (xmpp,path,toJid) => { ... }
```

Esta función lee un archivo, lo codifica en base64 y lo envía a un destinatario.
Parametros:
- xmpp: Cliente XMPP conectado al servidor
- path: Ruta del archivo a enviar
- toJid: JID del destinatario (este no lleva el @servidor solo el nombre de usuario)

### Opciones de Menú

```javascript
function handleMenuOption(option) { ... }
```

Esta función maneja las diferentes opciones seleccionadas en el menú principal, como registrar, iniciar sesión, eliminar cuenta, etc.
Parametros:
- option: Opción seleccionada por el usuario

### Registro de Usuarios

```javascript
async function register(username, password) { ... }
```

Esta función se encarga de registrar un nuevo usuario en el servidor XMPP.
Parametros:
- username: Nombre de usuario
- password: Contraseña


### Creación y Unión a Salas

```javascript
const crearRoom = async (xmpp, roomName) => { ... }
const unirseRoom = async (xmpp, roomName) => { ... }
```

Estas funciones permiten al usuario crear nuevas salas de chat y unirse a ellas.
Parametros:
- xmpp: Cliente XMPP conectado al servidor
- roomName: Nombre de la sala de chat (este no lleva el @conference solo el nombre de la sala)

### Enviar Mensajes

```javascript
const sendMessages = async (xmpp, contactJid, message) => { ... }
```

Esta función permite enviar mensajes a otros usuarios.
Parametros:
- xmpp: Cliente XMPP conectado al servidor
- contactJid: JID del destinatario (este no lleva el @servidor solo el nombre de usuario)
- message: Mensaje a enviar

### Eliminar Cuenta

```javascript
async function deleteAccount(jid, password) { ... }
```

Esta función se utiliza para eliminar una cuenta de usuario en el servidor XMPP.
Parametros:
- jid: JID del usuario (este no lleva el @servidor solo el nombre de usuario)
- password: Contraseña


### Iniciar Sesión

```javascript
async function login(jid, password) {
  // Nos conectamos al servidor
  const xmpp = client({
    service: 'xmpp://alumchat.xyz:5222',
    domain: 'alumchat.xyz',
    username: jid,
    password: password,
    // terminal: true,
  })

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}
```
En esta seccion se configura la conexion con el servidor


```javascript  
  // Funcion para mostrar el segundo menu de funciones
  const secondMenu = ()=> {...}

  // Funcion para mostrar el menu de funciones de grupo
  const handleGroup = (option) => {...}

  // Funcion para manejar las opciones del menu de funciones
  const handleSecondMenuOption = async(option) => {...}
```
En estas funciones se hace el manejo de las opciones del usuario cuando ya esta logeado


```javascript

  xmpp.on('stanza', async (stanza) => {
    if (stanza.is('message')) {   
      // Manejo de mensajes
    }
    
    else if (stanza.is('presence') && stanza.attrs.from === xmpp.jid.toString() && stanza.attrs.type !== 'unavailable') {
      /// Manejo del loggin
    }
    
    else if (stanza.is('presence')){
      // Manejo de la suscripcion
    }
      
    if (stanza.getChild('x', 'http://jabber.org/protocol/muc#user')) {
        // Si es una presencia de un grupo agregar al roster del grupo
    }

    
    else if (stanza.is('iq') && stanza.attrs.type === 'result' && stanza.getChild('query', 'jabber:iq:roster')) {
      // Para guardar el rouster
    }

  })

  // Manejo de eventos
  xmpp.on('online', async (address) => {
    console.log('▶', 'online as', address.toString())
    await xmpp.send(xml('presence'))
  })

  // Si el servidor nos envia un error
  xmpp.on('error',async (err) => {

    if (err.condition === 'not-authorized') {
      console.error('❌ Autenticación fallida. Verifica tu ID de cuenta y contraseña.')
    } else {
      console.error('❌', err.toString())
    }
    menu()
  })

  // Si nos desconectamos
  xmpp.on('offline', () => {
    console.log('⏹', 'offline')
    menu()
  })

```
En esta seccion se manejan los eventos que se pueden dar durante la conexion con el servidor XMPP son todos los listeners que se pueden dar durante la conexion con el servidor XMPP y basciamente los que le van a estar dando la informacion al usuario de lo que esta pasando en el chat.


---
