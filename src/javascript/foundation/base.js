(function(definition) {
  Base = definition()
})(function() {
  'use strict'

  var Base = function Base() {}

  Base.prototype = {
    getDB: function() {
      return DB.instance
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

    _notify: function(event, va_args) {
      Array.prototype.unshift.call(arguments, this)

      for (var i = 0; i < this._observers.length; ++i) {
        var elem = this._observers[i]
        elem.func.apply(elem.observer, arguments)
      }

      if (__DEBUG__) {
        this._logDebug(arguments)
      }
    },

    _logDebug: function(va_args) {
      var sender = va_args[0]
      var event = va_args[1]
      var data1 = va_args[2]
      var data2 = va_args[3]

      console.log("%o %o %o %o", sender, event, data1, data2)
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

    save: function(callback) {
      this.getDB().save(this.storeName, this.attributes(), callback)
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
      objects = objects instanceof this.constructor ? objects.models : _.isArray(objects) ? objects : [objects]

      var added = []

      for (var i = 0; i < objects.length; ++i) {
        var attrs = objects[i]
        if (this._byId[attrs.id]) {
          this._byId[attrs.id].set(attrs)
        } else {
          var model = attrs instanceof this.model ? attrs : new this.model(attrs)
          model.addObserver(this, this._onModelChanged)

          if (this.order) {
            var index = _.sortedIndex(this.models, model, function (m) {
              return this.desc ? -m[this.order] : m[this.order]
            }.bind(this))
            this.models.splice(index, 0, model)
          } else{
            this.models.push(model)
          }

          this._byId[model.id] = model
          this._notify(Collection.ADDED, model)
          added.push(model)
        }
      }

      return added
    },

    remove: function(model) {
      this.removeWhere({id: model.id})
    },

    removeWhere: function(where) {
      var removed = _.where(this.models, where)

      for (var i = 0; i < removed.length; ++i) {
        var target = removed[i]
        this.models.splice(this.models.indexOf(target), 1)
        delete this._byId[target.id]
        this._notify(Collection.REMOVED, target)
      }

      return removed
    },

    contain: function(model) {
      return !!this._byId[model.id]
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

    isEmpty: function() {
      return 0 == this.size()
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

    each: function(iteratee, context) {
      _.each(this.models, iteratee, context)
    },

    indexOf: function(model) {
      return _.indexOf(this.models, model)
    },

    attributes: function() {
      return _.map(this.models, function (m) { return m.attributes() })
    },

    toJSON: function() {
      return JSON.stringify(this.attributes())
    },

    save: function(callback) {
      this.getDB().save(this.model.prototype.storeName, this.attributes(), callback)
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

    _onModelChanged: function(model, event) {
      if (Model.CHANGED == event) {
        this._notify(Collection.UPDATED, model)
      }
    }
  })

  return Collection
});
