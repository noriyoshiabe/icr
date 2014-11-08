(function(definition) {
  RoomNameDialog = definition()
})(function() {
  'use strict'

  var template = null

  var RoomNameDialog = function RoomNameDialog() {
    Modal.apply(this)

    template = template || this.el.querySelector('#room-name-dialog')

    this.modalContent = document.importNode(template.content, true).firstElementChild
    this.roomNameForm = this.modalContent.querySelector('#room-name-form')
    this.name = this.roomNameForm.querySelector('input[name="name"]')
    this.cancel = this.roomNameForm.querySelector('input[type="button"]')

    this.roomNameForm.addEventListener('submit', this._onSubmit.bind(this))
    this.cancel.addEventListener('click', this._onCancel.bind(this))

    this.el.appendChild(this.modalContent)
  }

  RoomNameDialog.SUBMIT = 'room_name_dialog:submit'

  _.extend(RoomNameDialog.prototype, Modal.prototype, {
    _onSubmit: function(e) {
      e.preventDefault()
      var name = e.target.elements["name"].value
      this._notify(RoomNameDialog.SUBMIT, name)
    }
  })

  return RoomNameDialog
});
