(function(definition) {
  Base = definition()
})(function() {
  'use strict'

  var Base = function Base() {}

  Base.prototype = {
    getDB: function() {
      return Base.db
    }
  }

  return Base
});

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

  _.extend(Model.prototype, Observable.prototype, Base.prototype, {
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

    key: function() {
      return 'id'
    },

    find: function(callback) {
      var query = {key: this[this.key()], store: this.storeName}
      this.getDB().find(query, function(result) {
        this.set(result)
        callback(this)
      }.bind(this))
    },

    save: function() {
      this.getDB().save(this.storeName, this.attributes())
    }
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

  _.extend(Collection.prototype, Observable.prototype, Base.prototype, {
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

    findWhere: function(where) {
      return _.findWhere(this.models, where)
    },

    clear: function() {
      for (var i = 0; i < this.models.length; ++i) {
        this._notify(Collection.REMOVED, this.models[i])
      }

      this.models = []
      this._byId = {}
    },

    attributes: function() {
      return _.map(this.models, function (m) { return m.attributes() })
    },

    toJSON: function() {
      return JSON.stringify(this.attributes())
    },

    save: function() {
      this.getDB().save(this.model.prototype.storeName, this.attributes())
    },

    select: function(query, callback) {
      query.store = this.model.prototype.storeName
      this.getDB().select(query, function(results) {
        this.add(results)
        callback(this)
      }.bind(this))
    },

    selectAll: function(callback) {
      this.select({}, callback)
    },

    _onModelChanged: function(model) {
      this._notify(Collection.UPDATED, model)
    }
  })

  return Collection
});
