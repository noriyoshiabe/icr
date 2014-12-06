(function(definition) {
  RoomUrlDialog = definition()
})(function() {
  'use strict'

  var template = null

  var RoomUrlDialog = function RoomUrlDialog(room) {
    Modal.apply(this)

    template = template || this.el.querySelector('#room-url-dialog')

    this.modalContent = document.importNode(template.content, true).firstElementChild
    this.roomUrl = this.modalContent.querySelector('input[name="url"]')
    this.cancel = this.modalContent.querySelector('input[type="button"]')

    this.cancel.addEventListener('click', this._onCancel.bind(this))

    this.url = location.origin + '/#' + room.id
    this.roomUrl.value = this.url

    this.el.appendChild(this.modalContent)
  }

  _.extend(RoomUrlDialog.prototype, Modal.prototype)
  return RoomUrlDialog
});
