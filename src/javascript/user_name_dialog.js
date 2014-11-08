(function(definition) {
  UserNameDialog = definition()
})(function() {
  'use strict'

  var template = null

  var UserNameDialog = function UserNameDialog(options) {
    Modal.apply(this)

    template = template || this.el.querySelector('#user-name-dialog')

    this.options = options

    this.modalContent = document.importNode(template.content, true).firstElementChild
    this.userNameForm = this.modalContent.querySelector('#user-name-form')
    this.name = this.userNameForm.querySelector('input[name="name"]')

    this.userNameForm.addEventListener('submit', this._onSubmit.bind(this))

    this.el.appendChild(this.modalContent)
  }

  UserNameDialog.SUBMIT = 'user_name_dialog:submit'

  _.extend(UserNameDialog.prototype, Modal.prototype, {
    _onSubmit: function(e) {
      e.preventDefault()
      var name = e.target.elements["name"].value
      this._notify(UserNameDialog.SUBMIT, name, this.options)
    }
  })

  return UserNameDialog
});
