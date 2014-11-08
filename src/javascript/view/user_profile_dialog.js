(function(definition) {
  UserProfileDialog = definition()
})(function() {
  'use strict'

  var template = null

  var UserProfileDialog = function UserProfileDialog(app) {
    Modal.apply(this)

    template = template || this.el.querySelector('#user-profile-dialog')

    this.modalContent = document.importNode(template.content, true).firstElementChild
    this.userProfileForm = this.modalContent.querySelector('#user-profile-form')
    this.name = this.userProfileForm.querySelector('input[name="name"]')
    this.image_url = this.userProfileForm.querySelector('input[name="image_url"]')
    this.cancel = this.userProfileForm.querySelector('input[type="button"]')

    this.name.value = app.user.name
    this.image_url.value = app.user.image_url ? app.user.image_url : ''

    this.userProfileForm.addEventListener('submit', this._onSubmit.bind(this))
    this.cancel.addEventListener('click', this._onCancel.bind(this))

    this.el.appendChild(this.modalContent)
  }

  UserProfileDialog.SUBMIT = 'user_profile_dialog:submit'

  _.extend(UserProfileDialog.prototype, Modal.prototype, {
    _onSubmit: function(e) {
      e.preventDefault()
      var name = e.target.elements["name"].value
      var image_url = e.target.elements["image_url"].value
      this._notify(UserProfileDialog.SUBMIT, name, image_url)
    }
  })

  return UserProfileDialog
});
