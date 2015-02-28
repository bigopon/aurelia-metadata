define(["exports"], function (exports) {
  "use strict";

  var _prototypeProperties = function (child, staticProps, instanceProps) { if (staticProps) Object.defineProperties(child, staticProps); if (instanceProps) Object.defineProperties(child.prototype, instanceProps); };

  var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

  var functionMetadataStorage = new Map(),
      emptyArray = Object.freeze([]),
      locateFunctionMetadataElsewhere;

  /**
  * Stores metadata and provides helpers for searching and adding to it.
  *
  * @class MetadataStorage
  */

  var MetadataStorage = (function () {
    function MetadataStorage(metadata, owner) {
      _classCallCheck(this, MetadataStorage);

      this.metadata = metadata;
      this.owner = owner;
    }

    _prototypeProperties(MetadataStorage, null, {
      first: {

        /**
        * Searches metadata and returns the first instance of a particular type.
        *
        * @method first
        * @param {Function} type The metadata type to look for.
        * @param {Boolean} searchPrototype Indicates whether or not to search the inheritance hierarchy for metadata.
        * @return {Object} Returns an instance of the specified metadata type if found; otherwise null.
        */

        value: function first(type, searchPrototype) {
          var metadata = this.metadata,
              i,
              ii,
              potential;

          if (metadata === undefined || metadata.length === 0) {
            if (searchPrototype && this.owner !== undefined) {
              return Metadata.on(Object.getPrototypeOf(this.owner)).first(type, searchPrototype);
            }

            return null;
          }

          for (i = 0, ii = metadata.length; i < ii; ++i) {
            potential = metadata[i];

            if (potential instanceof type) {
              return potential;
            }
          }

          if (searchPrototype && this.owner !== undefined) {
            return Metadata.on(Object.getPrototypeOf(this.owner)).first(type, searchPrototype);
          }

          return null;
        },
        writable: true,
        configurable: true
      },
      has: {
        value: function has(type, searchPrototype) {
          return this.first(type, searchPrototype) !== null;
        },
        writable: true,
        configurable: true
      },
      all: {

        /**
        * Searches metadata for all instances of a particular type.
        *
        * @method all
        * @param {Function} type The metadata type to look for.
        * @param {Boolean} searchPrototype Indicates whether or not to search the inheritance hierarchy for metadata.
        * @return {Array} Returns an array of the specified metadata type.
        */

        value: function all(type, searchPrototype) {
          var metadata = this.metadata,
              i,
              ii,
              found,
              potential;

          if (metadata === undefined || metadata.length === 0) {
            if (searchPrototype && this.owner !== undefined) {
              return Metadata.on(Object.getPrototypeOf(this.owner)).all(type, searchPrototype);
            }

            return emptyArray;
          }

          found = [];

          for (i = 0, ii = metadata.length; i < ii; ++i) {
            potential = metadata[i];

            if (potential instanceof type) {
              found.push(potential);
            }
          }

          if (searchPrototype && this.owner !== undefined) {
            found = found.concat(Metadata.on(Object.getPrototypeOf(this.owner)).all(type, searchPrototype));
          }

          return found;
        },
        writable: true,
        configurable: true
      },
      add: {

        /**
        * Adds metadata.
        *
        * @method add
        * @param {Object} instance The metadata instance to add.
        */

        value: function add(instance) {
          if (this.metadata === undefined) {
            this.metadata = [];
          }

          this.last = instance;
          this.metadata.push(instance);
          return this;
        },
        writable: true,
        configurable: true
      },
      and: {
        value: function and(func) {
          func(this.last);
          return this;
        },
        writable: true,
        configurable: true
      }
    });

    return MetadataStorage;
  })();

  MetadataStorage.empty = Object.freeze(new MetadataStorage());

  function normalize(metadata, fn, replace) {
    if (metadata instanceof MetadataStorage) {
      if (replace) {
        fn.metadata = function () {
          return metadata;
        };
      }

      metadata.owner = fn;
      return metadata;
    }

    if (Array.isArray(metadata)) {
      return new MetadataStorage(metadata, fn);
    }

    throw new Error("Incorrect metadata format for " + metadata + ".");
  }

  /**
  * Provides access to metadata.
  *
  * @class Metadata
  * @static
  */
  var Metadata = exports.Metadata = {
    /**
    * Locates the metadata on the owner.
    *
    * @method on
    * @param {Function} owner The owner of the metadata.
    * @return {MetadataStorage} Returns the stored metadata.
    */
    on: function on(owner) {
      var metadata;

      if (!owner) {
        return MetadataStorage.empty;
      }

      metadata = functionMetadataStorage.get(owner);

      if (metadata === undefined) {
        if ("metadata" in owner) {
          if (typeof owner.metadata === "function") {
            functionMetadataStorage.set(owner, metadata = normalize(owner.metadata(), owner, true));
          } else {
            functionMetadataStorage.set(owner, metadata = normalize(owner.metadata, owner));
          }
        } else if (locateFunctionMetadataElsewhere !== undefined) {
          metadata = locateFunctionMetadataElsewhere(owner);

          if (metadata === undefined) {
            functionMetadataStorage.set(owner, metadata = new MetadataStorage(undefined, owner));
          } else {
            functionMetadataStorage.set(owner, metadata = normalize(metadata, owner));
          }
        } else {
          functionMetadataStorage.set(owner, metadata = new MetadataStorage(undefined, owner));
        }
      }

      return metadata;
    },
    configure: {
      /**
      * Adds an additional location to search for metadata in.
      *
      * @method location
      * @param {String} staticPropertyName The name of the property on the function instance to search for metadata.
      */
      location: function location(staticPropertyName) {
        this.locator(function (fn) {
          return fn[staticPropertyName];
        });
      },
      /**
      * Adds a function capable of locating metadata.
      *
      * @method locator
      * @param {Function} locator Configures a function which searches for metadata. It should return undefined if none is found.
      */
      locator: function locator(loc) {
        if (locateFunctionMetadataElsewhere === undefined) {
          locateFunctionMetadataElsewhere = loc;
          return;
        }

        var original = locateFunctionMetadataElsewhere;
        locateFunctionMetadataElsewhere = function (fn) {
          return original(fn) || loc(fn);
        };
      },
      classHelper: function classHelper(name, fn) {
        MetadataStorage.prototype[name] = function () {
          var context = Object.create(fn.prototype);
          var metadata = fn.apply(context, arguments) || context;
          this.add(metadata);
          return this;
        };

        Metadata[name] = function () {
          var storage = new MetadataStorage([]);
          return storage[name].apply(storage, arguments);
        };
      },
      functionHelper: function functionHelper(name, fn) {
        MetadataStorage.prototype[name] = function () {
          fn.apply(this, arguments);
          return this;
        };

        Metadata[name] = function () {
          var storage = new MetadataStorage([]);
          return storage[name].apply(storage, arguments);
        };
      }
    }
  };
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
});