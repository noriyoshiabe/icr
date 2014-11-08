(function(definition) {
  Modal = definition()
})(function() {
  'use strict'

  var template = null

  var Modal = function Modal() {
    Observable.apply(this)

    template = template || document.querySelector('#modal')
    this.el = document.importNode(template.content, true).firstElementChild
  }

  Modal.CANCEL = 'modal:cancel'

  _.extend(Modal.prototype, Observable.prototype, {
    _onCancel: function(e) {
      this._notify(Modal.CANCEL)
    }
  })

  return Modal
});
