const { client, xml, jid } = require("@xmpp/client")
const fs = require('fs')
const path = require('path')
const net = require('net')
const debug = require("@xmpp/debug")
const readline = require('readline')
const contacts = {}
const groupRoster = {}
const registerState = {successfulRegistration: false } 
let base64Data = ''

// Iconos para los shows de los Usuarios
const showIcon = {
  'away': '🟠Away',
  'xa': '🟡Extended away',
  'dnd': '⛔Do not disturb',
  'chat': '🟢Available',
  'unavailable': '⚪Offline',
  
}

// Interfaz para leer la entrada del usuario
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

// Menu principal para el usuario
function menu() {
  console.log('1) Registrar una nueva cuenta en el servidor')
  console.log('2) Iniciar sesión con una cuenta')
  console.log('3) Eliminar la cuenta del servidor')
  console.log('4) Salir del programa')
  rl.question('\nElige una opción: ', (answer) => {
    handleMenuOption(answer)
  })
}

// Funcion para cambiar el estado y show del usuario
const cambiarEstadoUsuario = (xmpp, show, status) => {
  try {
    const presenceStanza = xml(
      'presence',
      {},
      xml('show', {}, show), // estado como 'chat', 'away', 'dnd', etc.
      xml('status', {}, status) // mensaje opcional, por ejemplo, "En una reunión"
    )

    xmpp.send(presenceStanza)
    console.log(`💭 Estado cambiado a ${show} con status ${status}`)
  } catch (error) {
    console.error(`❌ Error al cambiar el estado y show del usuario: ${error.message}`)
  }
}

// Funcion para obtener el roster del usuario
const getRoster = (xmpp,jid) => {
  const rosterQuery = xml('iq', { type: 'get', to:`${jid}@alumchat.xyz`}, xml('query', { xmlns: 'jabber:iq:roster' }))
  xmpp.send(rosterQuery)
}

// Funcion para limpiar el roster al cerrar sesion
const cleanContacts = () => {
  for (const contact in contacts) {
    delete contacts[contact]
  }
  for (const group in groupRoster) {
    delete groupRoster[group]
  }
  return Promise.resolve()
}

// Funcion para dar formato a los contactos al mostrarlos en el CLI
const formatContacts = async () => {
  if (contacts.length === 0) {
    console.log('No tienes contactos')
  }else{
    
    console.log('Contactos:') 
    console.log('\tJID    \t Show    \t Estado')
    for (const contact in contacts) {
      const isGroup = contact.includes('@conference.alumchat.xyz')
      const contactJid = contact.split('@')[0]

      if (isGroup) {
        // Obtener el rouster del group y mostrarlo
        
        const grupRost = groupRoster[contact]
        console.log(`=> ${contactJid}: ${Object.keys(grupRost).length} miembros`)
        if (grupRost) {
          for (const contact in grupRost) {
            const contactJid = contact.split('@')[0]
            console.log(`\t--> ${contactJid}: ${grupRost[contact].show } \t(${grupRost[contact].status? grupRost[contact].status : 'sin estado'})`)
          }
        }
        continue
      }

      //print sin tanbulacion
      if (contactJid.length > 10) {
        console.log(`=> ${contactJid}: ${contacts[contact].show } \t(${contacts[contact].status? contacts[contact].status : 'sin estado'})`)
      }else if(contactJid.length < 7){
        console.log(`=> ${contactJid}:\t\t ${contacts[contact].show } \t(${contacts[contact].status? contacts[contact].status : 'sin estado'})`)
  
      }
      
      else{
        console.log(`=> ${contactJid}:\t ${contacts[contact].show } \t(${contacts[contact].status? contacts[contact].status : 'sin estado'})`)
  
      }
    }
  }
}



// Funcion para leer el archivo y enviarlo
const leerArchivo = async (xmpp,path,toJid) => {
  try{
  
    const extension = path.split('.').pop()
    
    const fileData = await fs.readFileSync(path)
    const encodedFileData = Buffer.from(fileData).toString('base64')
    const message = `file://${extension}://${encodedFileData}` // se crea el mensaje
    
    sendMessages(xmpp, toJid, message)
    return
  }
  catch(err){
    console.log('❌ El archivo adjuntado no existe')
    return
  }
}

// Funcion para manejar las opciones del menu principal de acciones
function handleMenuOption(option) {
  switch (option) {
    case '1':
      rl.question('Introduce el nuevo ID para la cuenta: ', (jid) => {
        rl.question('Introduce la contraseña para la cuenta: ', (password) => {
          register(jid, password)
        })
      })
      break
    case '2':
      
      rl.question('Introduce el ID para la cuenta: ', (jid) => {
        rl.question('Introduce la contraseña para la cuenta: ', (password) => {

          login(jid, password)

        })
      })
      break
      
    case '3':
      rl.question('Introduce el ID para la cuenta: ', (jid) => {
        rl.question('Introduce la contraseña para la cuenta: ', (password) => {
          deleteAccount(jid, password)
        })
      })
      break
    case '4':
      console.log('Saliendo del programa...')
      rl.close()
      process.exit(0)

    default:
      console.log('Opción no válida. Por favor, elige una opción válida.')
      menu()
  }
}

// Funcion para registrar una nueva cuenta
async function register(username, password) {
  
  // Se usa un socket de net para registrar la cuenta
  const client = new net.Socket()
  client.connect(5222, 'alumchat.xyz', function() {
    console.log('Connected')
    client.write('<stream:stream to="' + 'alumchat.xyz' + '" xmlns="jabber:client" xmlns:stream="http://etherx.jabber.org/streams" version="1.0">')
  })

  // Se verifica el usuario y se envia el registro
  client.on('data', function(data) {
    // console.log('Received: ' + data)
    if (data.toString().includes('<stream:features>')) {
      client.write('<iq type="set" id="reg1"><query xmlns="jabber:iq:register"><username>' + username + '</username><password>' + password + '</password></query></iq>')
    } else if (data.toString().includes('iq type="result" id="reg1"')) {
      // El registro fue exitoso, procede con el inicio de sesión
      registerState.successfulRegistration = true
      client.destroy()
    } else if (data.toString().includes('<error code"409" type="cancel"><conflict xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"/>')) {
      // El usuario ya existe
      console.log('❌ El usuario ya existe, por favor elige un nombre de usuario diferente.')
      client.destroy()

    }
  })

  // Se cierra la conexion e inicia sesion si el registro fue exitoso
  client.on('close', function() {
    console.log('Connection closed')
    if (registerState.successfulRegistration) {
      console.log('Registro exitoso, iniciando sesión...\n\n')
      login(username, password)
    }
    else {
      // Si el registro no fue existoso, mostramos el menu de usuario
      menu()
    }
  })
}

// Funcion para crear una sala de chat
const crearRoom = async (xmpp, roomName) => {
  try {
    // Crear sala de chat
    const groupJid = `${roomName}@conference.alumchat.xyz/${xmpp.jid.local}`
    const groupStanza = xml('presence', { to: groupJid }, xml('x', { xmlns: 'http://jabber.org/protocol/muc' }))
    xmpp.send(groupStanza)

    // Configurar sala de chat como abierta
    const configRequest = xml('iq', { to: groupJid, type: 'set' }, 
      xml('query', { xmlns: 'http://jabber.org/protocol/muc#owner' }, 
        xml('x', { xmlns: 'jabber:x:data', type: 'submit' }, 
          xml('field', { var: 'muc#roomconfig_publicroom', type: 'boolean' }, 
            xml('value', {}, '1')
          )
        )
      )
    )

    xmpp.send(configRequest)
    console.log("👯 Sala de chat creada exitosamente y configurada como abierta")
  } catch (error) {
    console.log(`❌ Error al crear la sala de chat: ${error.message}`)
  }
}

// Funcion para unirse a una sala de chat
const unirseRoom = async (xmpp, roomName) => {
  try {
    const groupJid = `${roomName}@conference.alumchat.xyz/${xmpp.jid.local}`
    const groupStanza = xml('presence', { to: groupJid }, xml('x', { xmlns: 'http://jabber.org/protocol/muc' }))
    xmpp.send(groupStanza)
    console.log(`👯 Intentando unirse al grupo público ${roomName}`)
  } catch (error) {
    console.log(`❌ Error al unirse a la sala de chat: ${error.message}`)
  }
}

// Funcion para agregar un contacto con una stanza de presence
const addContact = async (xmpp, contactJid) => {
  try {
    const presenceStanza =  xml('presence', { to: `${contactJid}@alumchat.xyz`, type: 'subscribe' })
    await xmpp.send(presenceStanza)
    console.log('📨 Solicitud de contacto enviada a', contactJid)
  } catch (error) {
    console.log('❌ Error al agregar contacto', error)
  }
}

// Funcion para enviar mensajes
const sendMessages = async (xmpp, contactJid, message) => {
  try {
    const messageStanza = xml(
      'message',
      { type: 'chat', to: contactJid + '@alumchat.xyz' },
      xml('body', {}, message),
    )
    xmpp.send(messageStanza)
  } catch (error) {
    console.log('❌ Error al enviar mensaje', error)
  }
}

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

  //debug(xmpp, true)

  // Funcion para mostrar el segundo menu de funciones
  const secondMenu = ()=> {

    console.log('\n')
    console.log('1) Mostrar todos los contactos y su estado')
    console.log('2) Agregar un usuario a los contactos')
    console.log('3) Mostrar detalles de contacto de un usuario')
    console.log('4) Comunicación 1 a 1 con cualquier usuario/contacto')
    console.log('5) Participar en conversaciones grupales')
    console.log('6) Cambiar estado y show')
    console.log('7) Enviar/recibir archivos')
    console.log('8) Cerrar sesion')
    rl.question('\nElige una opción: ',async (answer) => {
      await handleSecondMenuOption(answer)
    })
  }
  // Funcion para mostrar el menu de funciones de grupo
  const handleGroup = (option) => { 
    switch (option) {
      case '1':
        // Crear grupo
        rl.question('Introduce el nombre del grupo: ', (groupName) => {
          crearRoom(xmpp,groupName)
          secondMenu()
        })
        break
      case '2':
        // Enviar mensaje a grupo
        rl.question('Introduce el nombre del grupo: ', (groupName) => {
          rl.question('Introduce el mensaje que deseas enviar: ', (message) => {
            const groupJid = `${groupName}@conference.alumchat.xyz`
            const messageStanza = xml('message', { to: groupJid, type: 'groupchat' }, xml('body', {}, message))
            xmpp.send(messageStanza)
            secondMenu()
          })
        })
        break
      case '3':
        // Agregar usuario a grupo
        rl.question('Introduce el nombre del grupo: ', (groupName) => {
          rl.question('Introduce el JID del usuario que deseas agregar: ', (contactJid) => {
            const groupJid = `${groupName}@conference.alumchat.xyz`
            const inviteStanza = xml('message', { to: groupJid },
              xml('x', { xmlns: 'http://jabber.org/protocol/muc#user' },
                xml('invite', { to: `${contactJid}@alumchat.xyz` })
              )
            )
            xmpp.send(inviteStanza)
            console.log(`Invitación enviada a ${contactJid} para unirse al grupo ${groupName}`)
            secondMenu()
          })
        })
        break
      case '4':
        // Unirse a un grupo público
        rl.question('Introduce el nombre del grupo público al que deseas unirte: ', (groupName) => {
          unirseRoom(xmpp,groupName)
          secondMenu()
        })
        break
        
      
      default:
        console.log('❌ Opción no válida. Por favor, elige una opción válida.')
        secondMenu()
    }
  }
  
  // Funcion para manejar las opciones del menu de funciones
  const handleSecondMenuOption = async(option) => {
    switch (option) {
      case '1':
        //Mostar todos los contactos y su estado
        formatContacts()
        secondMenu()
        break
      case '2':
        // Agregar un usuario a los contactos
        rl.question('Introduce el ID del usuario que deseas agregar: ',async (contactJid) => {
          addContact(xmpp, contactJid)
          secondMenu()
        })
        break
      case '3':
        // Mostrar detalles de contacto de un usuario
        rl.question('Introduce el JID del usuario del que deseas ver detalles: ', (contactJid) => {
          const contact = contacts[contactJid + '@alumchat.xyz']
          if (contact) {
            console.log(`Detalles de ${contactJid}: ${contact.show || 'disponible'} (${contact.status || 'sin estado'})`)
          } else {
            console.log('No se encontró el usuario o no está en tu lista de contactos.')
          }
          secondMenu()
        })
        break
      case '4':
        // Comunicación 1 a 1 con cualquier usuario/contacto
        rl.question('Introduce el JID del usuario con el que deseas chatear: ', (contactJid) => {
          rl.question('Introduce el mensaje que deseas enviar: ', (message) => {
            sendMessages(xmpp, contactJid, message)
            secondMenu()
          })
        })
        break
      case '5':
        // Participar en conversaciones grupales
        console.log('1) Crear grupo')
        console.log('2) Enviar mensaje a grupo')
        console.log('3) Agregar usuario a grupo')
        console.log('4) Unirse a un grupo público') // Nueva opción aquí
        rl.question('\nElige una opción: ', (answer) => {
          handleGroup(answer)
        })
        break
        
      case '6':
        // Cambiar estado y show
        for (const show in showIcon) {
          console.log(`${show}: ${showIcon[show]}`)
        }
        rl.question('Introduce el show que deseas usar: ', (show) => {
          rl.question('Introduce el mensaje de estado que deseas usar (opcional): ', (status) => {
            cambiarEstadoUsuario(xmpp, show, status)
            secondMenu()
          })
        })
        break
      case '7':
        // Enviar/recibir archivos
        rl.question('Introduce el JID del usuario al que deseas enviar un archivo: ', (contactJid) => {
          rl.question('Introduce la ruta del archivo que deseas enviar: ', async (filePath) => {
            await leerArchivo(xmpp,filePath,contactJid)
            secondMenu()
          })
        })
        break
      case '8':
        // Cerrar sesion
        const end = await xmpp.send(xml('presence', {type: 'unavailable'}))
        // const dobleend = cambiarEstadoUsuario(xmpp, 'unavailable', '')
        const clean = await cleanContacts()
        Promise.all([end,clean])
        await xmpp.stop()
        
        break
      default:
        console.log('❌ Opción no válida. Por favor, elige una opción válida.')
        secondMenu()
    }
  }

  xmpp.on('stanza', async (stanza) => {
    if (stanza.is('message')) {
      
      // Manejar invitaciones a salas de grupo
      if (stanza.is('message') && stanza.getChild('x', 'http://jabber.org/protocol/muc#user') 
          && stanza.getChild('x', 'http://jabber.org/protocol/muc#user').getChild('invite')) 
      {
        const roomJid = stanza.attrs.from
        console.log(`💌 Has sido invitado a la sala ${roomJid}`)
      
        const presenceStanza = xml(
          'presence',
          { to: roomJid + '/' + xmpp.jid.local },
          xml('x', { xmlns: 'http://jabber.org/protocol/muc' })
        )
        xmpp.send(presenceStanza)
        console.log(`👯 Te has unido a la sala ${roomJid}`)
      }
      // Manejar mensajes 1 a 1
      else if (stanza.is('message') && stanza.attrs.type === 'chat' && stanza.getChild('body')) {
        const from = stanza.attrs.from
        const message = stanza.getChildText('body')

        // Verificar si es un archivo
        const isFile = message.includes('file://') 
        if (isFile) {
          const fileData = message.split('//')[2]
          const extension = message.split('//')[1].split(':')[0]
          const decodedFileData = Buffer.from(fileData, 'base64')
          const fileName = `${from.split('@')[0]}-${Date.now()}.${extension}`
          const directoryPath = path.join(__dirname, './recibidos');

          // Crear el directorio si no existe
          if (!fs.existsSync(directoryPath)) {
            fs.mkdirSync(directoryPath, { recursive: true });
          }

          //guardarlo en ./recibidos
          fs.writeFileSync(path.join(__dirname,`./recibidos/${fileName}`), decodedFileData)
          console.log(`📃 Nuevo archivo de ${from}: ${fileName}`)
        }else{

          console.log(`📥 Nuevo mensaje de ${from}: ${message}`)
        }
      } 
      // Manejar mensajes de grupo
      else if (stanza.is('message') && stanza.attrs.type === 'groupchat') {
        const from = stanza.attrs.from
        const roomJid = from.split('/')[0]  // Obtiene el JID de la sala sin el recurso (nombre del usuario)
        const senderNickname = from.split('/')[1]  // Obtiene el nickname del usuario que envió el mensaje
        const body = stanza.getChildText('body')
        
        if (body) {  // Verifica si realmente hay un cuerpo en el mensaje
            console.log(`👯 Mensaje de ${senderNickname} en sala ${roomJid}:📥 ${body}`)
        }
    }
    }
    // Manejo del loggin
    else if (stanza.is('presence') && stanza.attrs.from === xmpp.jid.toString() && stanza.attrs.type !== 'unavailable') {
      // Obtener el roster del usuario
      getRoster(xmpp,jid)
      console.log('🗸', 'Successfully logged in')
      secondMenu()
    }
    // Manejo de la suscripcion
    else if (stanza.is('presence')){
      // Si es una presencia de un usuario agregar al roster
      if (stanza.attrs.type === 'subscribe'){
        console.log(`🤗 Solicitud de suscripcion de ${stanza.attrs.from}`)
        xmpp.send(xml('presence', { to: stanza.attrs.from, type: 'subscribed' }))
        console.log(`🤗 Has aceptado la solicitud de ${stanza.attrs.from}`)
        contacts[stanza.attrs.from] = {status: '', show: '🟢Available'}
      }
      // Si es una presencia de un usuario aceptando la suscripcion
      else if (stanza.attrs.type === 'subscribed'){
        console.log(`🤗 El usuario ${stanza.attrs.from} ha aceptado tu solicitud de suscripcion`)
      }
      else if(!stanza.attrs.type){
        const contactJid = stanza.attrs.from.split('/')[0]
        if (contactJid !== xmpp.jid.bare().toString()) {  // Comprueba si el JID del contacto es diferente al tuyo
          console.log(`El usuario ${contactJid} ha cambiado su estado`)
          const status = stanza.getChild('status')?.getText()
          const show = stanza.getChild('show')?.getText()
          if (status) {
            contacts[contactJid] = {...contacts[contactJid],status}
          }else{
            contacts[contactJid] = {...contacts[contactJid],status: ''}
          }
          if (show) {
            contacts[contactJid] = {...contacts[contactJid],show: showIcon[show]}
          }else{
            contacts[contactJid] = {...contacts[contactJid],show: '🟢Available'}
          }
          //contacts[contactJid] = {status, show}
        }
      }
      else if (stanza.attrs.type === 'unavailable'){
        const contactJid = stanza.attrs.from.split('/')[0]
        if (contactJid !== xmpp.jid.bare().toString()) {  // Comprueba si el JID del contacto es diferente al tuyo
          console.log(`El usuario ${contactJid} se ha desconectado`)
          const status = 'unavailable'
          const show = '⚪Offline'
          contacts[contactJid] = {status, show}
        }
      }

      // Si es una presencia de un grupo agregar al roster del grupo
      if (stanza.getChild('x', 'http://jabber.org/protocol/muc#user')) {
        const local = {}
        const groupJid = stanza.attrs.from.split('/')[0]
        const groupRosterItems = stanza.getChild('x').getChildren('item')
        
        groupRosterItems.forEach((item) => {
          const contactJid = item.attrs.jid.split('/')[0]
          const status = ""
          const show = "🟢Available"
          console.log(`${contactJid} se ha unido al grupo ${groupJid}`)
          if (contactJid !== xmpp.jid.bare().toString() && !(contactJid in contacts)) { 
            contacts[contactJid] = {status, show}
          }
          if (!(contactJid in local)){

            local[contactJid] = {status, show}
          }
        })

        if (!(groupJid in groupRoster)){
          groupRoster[groupJid] = local
        }else{
          groupRoster[groupJid] = {...groupRoster[groupJid],...local}
        }
        
      }
    }

    // Para guardar el rouster
    else if (stanza.is('iq') && stanza.attrs.type === 'result' && stanza.getChild('query', 'jabber:iq:roster')) {
      const rosterItems = stanza.getChild('query').getChildren('item')
      rosterItems.forEach((item) => {
        const contactJid = item.attrs.jid
        const status = ""
        const show = "⚪Offline"
        if (contactJid !== xmpp.jid.bare().toString() && !(contactJid in contacts)) { 
          contacts[contactJid] = {status, show}
        }
      })
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

  // Nos conectamos al servidor
  xmpp.start().catch(() =>{})

}

// Funcion para eliminar una cuenta del servidor
async function deleteAccount(jid, password) {

  // Nos conectamos al servidor 
  const xmpp = client({
    service: 'xmpp://alumchat.xyz:5222',
    domain: 'alumchat.xyz',
    username: jid, 
    password: password,
    terminal: true,
  })

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

  
  xmpp.on('stanza', async (stanza) => {
    // si nos llega la estanza del result es que se ha eliminado la cuenta
    if (stanza.is('iq') && stanza.attrs.type === 'result') {
      console.log('🗸', 'Successfully deleted account')
      
    }
  })

  xmpp.on('error', (err) => {
    // console.error('❌', err.toString())
    if (err.condition === 'not-authorized') {
      console.error('❌ Autenticación fallida. Verifica tu ID de cuenta y contraseña.')
    }
    menu()
  })

  xmpp.on('online', async () => {
    console.log('▶', 'online as', xmpp.jid.toString(), '\n')
    // creamos la estanza para eliminar la cuenta
    const deleteStanza = xml(
      'iq',
      { type: 'set', id: 'delete1' },
      xml('query', { xmlns: 'jabber:iq:register' }, xml('remove'))
    )
    try{

      await xmpp.send(deleteStanza)
    }
    catch(err){
      console.log(err)
    }finally{
      
      await xmpp.stop()
    }
  })
  // Nos desconectamos y volvemos al menu 
  xmpp.on('offline', () => {
    xmpp.stop()
    console.log('⏹', 'Desconectandote del Servidor...')

    menu()


  })

  xmpp.start().catch(() => {})
}



menu()
