module.exports = {
  getKeyCloak: function(memoryStore) {
    const Keycloak = require('keycloak-connect');
    return new Keycloak({
      store: memoryStore
    });
  }
}