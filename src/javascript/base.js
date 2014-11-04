(function(definition) {
  Observable = definition()
})(function() {
  'use strict'

  var Observable = function Observable() {
    this._observers = []
  }

  Observable.prototype = {
    addObserver: function(observer, func) {
      this._observers.push({observer: observer, func: func})
    },

    removeObserver: function(observer) {
      var willRemoved = _.where(this._observers, {observer: observer})
      for (var i = 0; i < willRemoved.length; ++i) {
        var index = this._observers.indexOf(willRemoved[i])
        if (-1 < index) {
          this._observers.splice(index, 1)
        }
      }
    },

    _notify: function(event, data) {
      for (var i = 0; i < this._observers.length; ++i) {
        var elem = this._observers[i]
        elem.func.bind(elem.observer)(this, event, data)
      }
    }
  }

  return Observable
});


(function(definition) {
  Model = definition()
})(function() {
  'use strict'

  var Model = function Model(attributes) {
    Observable.apply(this)
    this.set(attributes)
  }

  Model.CHANGED = 'model:changed'

  _.extend(Model.prototype, Observable.prototype, {
    properties: ['id'],

    attributes: function() {
      return _.pick(this, this.properties)
    },

    set: function(attrs) {
      attrs = attrs instanceof Model ? attrs.attributes() : attrs
      _.extend(this, _.pick(attrs, this.properties))
      this._notify(Model.CHANGED)
    },

    toJSON: function() {
      return JSON.stringify(this.attributes())
    },
  })


  return Model
});

(function(definition) {
  Collection = definition()
})(function() {
  'use strict'

  var Collection = function Collection(objects) {
    Observable.apply(this)

    objects = !objects ? [] : _.isArray(objects) ? objects : [objects]

    this.models = []
    this._byId = {}
    this.add(objects)
  }

  Collection.ADDED = 'collection:added'
  Collection.UPDATED = 'collection:updated'
  Collection.REMOVED = 'collection:removed'

  _.extend(Collection.prototype, Observable.prototype, {
    model: Model,

    add: function(objects) {
      objects = _.isArray(objects) ? objects : [objects]

      var added = []

      for (var i = 0; i < objects.length; ++i) {
        var attrs = objects[i]
        if (this._byId[attrs.id]) {
          this._byId[attrs.id].set(attrs)
        } else {
          var model = attrs instanceof this.model ? attrs : new this.model(attrs)
          model.addObserver(this, this._onModelChanged)
          this.models.push(model)
          this._byId[model.id] = model
          this._notify(Collection.ADDED, model)
          added.push(model)
        }
      }

      return added
    },

    remove: function(where) {
      var removed = _.where(this.models, where)

      for (var i = 0; i < removed.length; ++i) {
        var target = removed[i]
        this.models.splice(this.models.indexOf(target))
        delete this._byId[target.id]
        this._notify(Collection.REMOVED, target)
      }

      return removed
    },

    byId: function(id) {
      return this._byId[id]
    },

    ids: function() {
      return _.pluck(this.models, 'id')
    },

    size: function() {
      return this.models.length
    },

    get: function(index) {
      return this.models[index]
    },

    clear: function() {
      for (var i = 0; i < this.models.length; ++i) {
        this._notify(Collection.REMOVED, this.models[i])
      }

      this.models = []
      this._byId = {}
    },

    toJSON: function() {
      return JSON.stringify(_.map(this.models, function (m) { m.attributes() }))
    },

    _onModelChanged: function(model) {
      this._notify(Collection.UPDATED, model)
    }
  })

  return Collection
});
