(function(definition) {
  Certificate = definition()
})(function() {
  'use strict'

  var Certificate = function Certificate(attributes) {
    Model.apply(this, arguments)
  }

  _.extend(Certificate.prototype, Model.prototype, {
    properties: ['id', 'user_id', 'secret'],

    storeName: "certificates"
  })

  Certificate.schemeDefinition = function(db) {
    db.createObjectStore("certificates", {keyPath: "id"})
  }

  return Certificate
});
