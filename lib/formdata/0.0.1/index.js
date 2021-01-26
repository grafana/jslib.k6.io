/*
 * FormData polyfill for k6
 * Copyright (C) 2021 Load Impact
 * License: MIT
 *
 * This simplifies the creation of multipart/form-data requests from k6 scripts.
 * It was adapted from the original version by Rob Wu[1] to remove references of
 * XMLHttpRequest and File related code which isn't supported in k6.
 *
 * [1]: https://gist.github.com/Rob--W/8b5adedd84c0d36aba64
 **/
(function(exports) {
  if (exports.FormData) {
    // Don't replace FormData if it already exists
    return;
  }
  // Export variable to the global scope
  exports.FormData = FormData;

  function FormData() {
    // Force a Constructor
    if (!(this instanceof FormData)) return new FormData();
    // Generate a random boundary - This must be unique with respect to the
    // form's contents.
    this.boundary = '------RWWorkerFormDataBoundary' + Math.random().toString(36);
    this.parts = [];
    /**
    * Internal method.
    * @param inp String | ArrayBuffer | Uint8Array  Input
    */
    this.__toByteArray = function(inp) {
      var arr = [];
      var i = 0, len;
      if (typeof inp == 'string') {
        for (len = inp.length; i < len; ++i)
          arr.push(inp.charCodeAt(i) & 0xff);
      } else if (inp && inp.byteLength) {/*If ArrayBuffer or typed array */
        if (!('byteOffset' in inp))   /* If ArrayBuffer, wrap in view */
          inp = new Uint8Array(inp);
        for (len = inp.byteLength; i < len; ++i)
          arr.push(inp[i] & 0xff);
      }
      return arr;
    };
  }

  /**
  * @param name     String                         Key name
  * @param value    String|typed array|ArrayBuffer Value
  * @param filename String                         Optional file name
  **/
  FormData.prototype.append = function(name, value, filename) {
    if (arguments.length < 2) {
      throw new SyntaxError('Not enough arguments');
    }
    this.parts.push({
      name: name,
      value: value,
      filename: filename,
    });
  };

  /**
  * Return the assembled request body as an ArrayBuffer.
  **/
  FormData.prototype.body = function() {
    var body = [];
    var barr = this.__toByteArray('--' + this.boundary + '\r\n');
    for (var i=0; i < this.parts.length; i++) {
      Array.prototype.push.apply(body, barr);
      var p = this.parts[i];
      var cd = 'Content-Disposition: form-data; name="' + p.name + '"';
      if (p.filename) {
        cd += '; filename="' + p.filename.replace(/"/g,'%22') + '"';
      }
      if (typeof p.value.byteLength == 'number' || Array.isArray(p.value)) {
        // TODO: Support specifying mimetype per part?
        cd += '\r\nContent-Type: application/octet-stream';
      }
      cd += '\r\n\r\n';
      Array.prototype.push.apply(body, this.__toByteArray(cd));
      var data = Array.isArray(p.value) ? p.value : this.__toByteArray(p.value);
      Array.prototype.push.apply(body, data);
      Array.prototype.push.apply(body, this.__toByteArray('\r\n'));
    }
    Array.prototype.push.apply(body, this.__toByteArray('--' + this.boundary + '--\r\n'));
    return new Uint8Array(body).buffer;
  };
})(this || self);
