const { client, xml, jid } = require("@xmpp/client");
const debug = require("@xmpp/debug");

// Configuración de tu servidor
const xmpp = client({
  service: "wss://alumchat.xyz:5280/xmpp-websocket", // Servicio WebSocket Seguro de tu servidor
  domain: "alumchat.xyz", // Dominio de tu servidor
  resource: "example", // Recurso
  username: "tuUsuario", // Tu nombre de usuario
  password: "tuContraseña", // Tu contraseña
});

debug(xmpp, true);

xmpp.on("error", (err) => {
  console.error(err);
});

xmpp.on("offline", () => {
  console.log("offline");
});

xmpp.on("stanza", async (stanza) => {
  if (stanza.is("message")) {
    await xmpp.send(xml("presence", { type: "unavailable" }));
    await xmpp.stop();
  }
});

xmpp.on("online", async (address) => {
  await xmpp.send(xml("presence"));
  const message = xml(
    "message",
    { type: "chat", to: address },
    xml("body", {}, "hello world"),
  );
  await xmpp.send(message);
});

xmpp.start().catch(console.error);
