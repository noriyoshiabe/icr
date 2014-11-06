(function(definition) {
  DB = definition()
})(function() {
  'use strict'

  var DB = function DB(dbName, version) {
    Observable.apply(this)

    this.dbName = dbName
    this.version = version
    this.schemeDefinitions = []
  }

  DB.OPENED = 'db:opened'

  _.extend(DB.prototype, Observable.prototype, {
    open: function() {
      var request = indexedDB.open(this.dbName, this.version)
      request.onupgradeneeded = this._onDBUpradeNeeded.bind(this)
      request.onsuccess = this._onDBOpenSuccess.bind(this)
      request.onerror = this._onError.bind(this)
    },

    save: function(store, objects) {
      objects = _.isArray(objects) ? objects : [objects]

      var store = this._db.transaction([store], "readwrite").objectStore(store)
      for (var i = 0; i < objects.length; ++i) {
        store.put(objects[i])
      }
    },

    find: function(query, callback) {
      var scope = this._db.transaction([query.store]).objectStore(query.store)
          scope = query.index ? scope.index(query.index) : scope
      scope.get(query.key).onsuccess = function(e) {
        callback(e.target.result)
      }
    },

    select: function(query, callback) {
      var results = []

      var range = null

             if (query.only) {
        range = IDBKeyRange.only(query.only)
      } else if (query.lower && query.upper) {
        range = IDBKeyRange.bound(query.lower, query.upper)
      } else if (query.lower) {
        range = IDBKeyRange.lowerBound(query.lower)
      } else if (query.upper) {
        range = IDBKeyRange.upperBound(query.upper)
      }

      var count = 0

      var scope = this._db.transaction([query.store]).objectStore(query.store)
          scope = query.index ? scope.index(query.index) : scope

      var desc = query.last ? true : false
      var limit = query.first || query.last

      scope.openCursor(range, desc ? "prev" : "next").onsuccess = function(e) {
        var cursor = e.target.result
        if (cursor) {
          if (query.last) {
            results.unshift(cursor.value)
          } else {
            results.push(cursor.value)
          }

          ++count
          if (!limit || count < limit) {
            cursor.continue()
          } else {
            callback(results)
          }
        }
        else {
          callback(results)
        }
      }.bind(this)
    },

    deleteAll: function() {
      this._db.close()
      var request = indexedDB.deleteDatabase(this.dbName)
      request.onsuccess = function () {
        console.log("Deleted database successfully")
      }
    },

    addSchemeDefinition: function(model) {
      if (model.schemeDefinition) {
        this.schemeDefinitions.push(model.schemeDefinition)
      }
    },

    _onDBUpradeNeeded: function(e) {
      var store = null
      var db = e.target.result
      e.target.transaction.onerror = this._onError

      for (var i = 0; i < this.schemeDefinitions.length; ++i) {
        this.schemeDefinitions[i](db)
      }
    },

    _onDBOpenSuccess: function(e) {
      this._db = e.target.result
      this._db.onerror = this._onError
      this._notify(DB.OPENED)
    },

    _onError: function(e) {
      console.log(e)
    }
  })

  return DB
});
