const dbus = require('dbus-native')
const debug = require('debug')('vedirect:dbus')

module.exports = function (messageCallback) {
  const bus = dbus.sessionBus()

  if (!bus) {
    throw new Error('Could not connect to the DBus session bus.')
  }

  var services = {}

  function signal_receive (m) {
    if (
      m.interface == 'com.victronenergy.BusItem' &&
      m.member == 'PropertiesChanged'
    ) {
      properties_changed(m)
    } else if (
      m.interface == 'org.freedesktop.DBus' &&
      m.member == 'NameOwnerChanged'
    ) {
      name_owner_changed(m)
    }
  }

  function name_owner_changed (m) {
    name = m.body[0]
    old_owner = m.body[1]
    new_owner = m.body[2]

    if (new_owner != '') {
      services[new_owner] = name
    } else {
      delete services[old_owner]
    }
  }

  function properties_changed (m) {
    // Message contents:
    // { serial: 5192,
    //   path: '/Dc/0/Power',
    //   interface: 'com.victronenergy.BusItem',
    //   member: 'PropertiesChanged',
    //   signature: 'a{sv}',
    //   sender: ':1.104',
    //   type: 4,
    //   flags: 1,
    //   body: [ [ [Object], [Object] ] ]}

    m.text = m.body[0][0][1][1][0]
    m.value = m.body[0][1][1][1][0]

    debug(`Receiving signal ${JSON.stringify(m, null, 2)}`)

    return true
  }

  bus.connection.on('message', signal_receive)
  bus.connection.on('message', messageCallback)
  bus.addMatch(
    "type='signal',interface='com.victronenergy.BusItem',member='PropertiesChanged'",
    d => {}
  )
  bus.addMatch("type='signal',member='NameOwnerChanged'", d => {})

  // TODO return a function to stop the dbus listener
  return () => {}
}