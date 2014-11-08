(function(definition) {
  HeaderView = definition()
})(function() {
  'use strict'

  var HeaderView = function HeaderView(app) {
    Observable.apply(this)

    this.el = document.querySelector('.js-header')
    this.logo = this.el.querySelector('.js-logo')
    this.userProfile = this.el.querySelector('.js-user-profile')
    this.avatar = this.userProfile.querySelector('.js-avatar')
    this.name = this.userProfile.querySelector('.js-name')
    this.settings = this.el.querySelector('.js-settings')

    this.logo.addEventListener('click', this._onClickLogo.bind(this), false)
    this.settings.addEventListener('click', this._onClickSettings.bind(this), false)

    this._resetUser(app.user)
    this._render()
  }

  HeaderView.CLICK_LOGO = 'header_view:click_logo'
  HeaderView.CLICK_SETTINGS = 'header_view:click_settings'

  _.extend(HeaderView.prototype, Observable.prototype, {
    _render: function() {
      this.userProfile.style.display = this.user.name ? 'block' : 'none'
      this.avatar.src = this.user.image_url ? this.user.image_url : '/images/default.png'
      this.name.textContent = this.user.name
    },

    _resetUser: function(user) {
      if (this.user) {
        this.user.removeObserver(this)
      }
      this.user = user
      this.user.addObserver(this, this._onNotifyUserEvent)
    },

    _onNotifyUserEvent: function(user, event) {
      if (Model.CHANGED == event) {
        this._render()
      }
    },

    _onClickLogo: function(e) {
      e.preventDefault()
      this._notify(HeaderView.CLICK_LOGO)
    },

    _onClickSettings: function(e) {
      this._notify(HeaderView.CLICK_SETTINGS)
    },

    setFromEnable: function(enable) {
      var elems = this.el.querySelectorAll('input, button')
      _.each(elems, function(el) {
        el.disabled = !enable
      })
    }
  })

  return HeaderView
});
